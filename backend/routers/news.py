"""
GTU News router — aggregates circulars from gtu.ac.in and Telegram @gtu_announcement.
Cached in-memory for 30 minutes to avoid hammering external sources.
"""

import logging
import time
import re
from datetime import datetime, timezone
from typing import Optional

import httpx
from bs4 import BeautifulSoup
from fastapi import APIRouter

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/news", tags=["news"])

# ---------------------------------------------------------------------------
# In-memory cache
# ---------------------------------------------------------------------------
_cache: dict = {"data": None, "fetched_at": 0.0}
CACHE_TTL = 30 * 60  # 30 minutes

SCRAPE_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
    "Referer": "https://www.gtu.ac.in/",
}


# ---------------------------------------------------------------------------
# Source 1 — GTU Circular.aspx
# ---------------------------------------------------------------------------
async def _fetch_gtu_circulars(limit: int = 15) -> list[dict]:
    try:
        async with httpx.AsyncClient(timeout=12, follow_redirects=True) as client:
            resp = await client.get(
                "https://www.gtu.ac.in/Circular.aspx",
                headers=SCRAPE_HEADERS,
            )
        if resp.status_code != 200:
            logger.warning("GTU Circular.aspx returned %s", resp.status_code)
            return []

        soup = BeautifulSoup(resp.text, "lxml")
        items = []

        for idx, h3 in enumerate(soup.select("h3.d-block")):
            if idx >= limit:
                break

            # Title + PDF link — second <a> has the real href
            links = h3.find_all("a", href=True)
            pdf_link: Optional[str] = None
            title = h3.get_text(strip=True)
            for a in links:
                href = a.get("href", "")
                if href and href != "#":
                    pdf_link = href
                    title = a.get_text(strip=True) or title
                    break

            # Date lives in next <p> sibling with id containing "UploadDate"
            parent = h3.parent
            date_el = parent.find("p", id=re.compile(r"UploadDate", re.I))
            date_str = date_el.get_text(strip=True) if date_el else ""

            # Parse "14-May-2026" → ISO
            iso_date = _parse_gtu_date(date_str)

            if not title:
                continue

            items.append({
                "id":      f"circ-{idx}",
                "title":   title,
                "date":    iso_date or date_str,
                "source":  "GTU Official",
                "url":     pdf_link,
                "preview": None,
                "tag":     _classify_title(title),
            })

        return items

    except Exception as exc:
        logger.warning("GTU circular scrape failed: %s", exc)
        return []


# ---------------------------------------------------------------------------
# Source 2 — Telegram @gtu_announcement public web view
# ---------------------------------------------------------------------------
async def _fetch_telegram(limit: int = 15) -> list[dict]:
    try:
        async with httpx.AsyncClient(timeout=12, follow_redirects=True) as client:
            resp = await client.get(
                "https://t.me/s/gtu_announcement",
                headers=SCRAPE_HEADERS,
            )
        if resp.status_code != 200:
            logger.warning("Telegram returned %s", resp.status_code)
            return []

        soup = BeautifulSoup(resp.text, "lxml")
        messages = soup.select(".tgme_widget_message")
        # Most recent last — reverse to get newest first
        messages = list(reversed(messages))

        items = []
        for idx, msg in enumerate(messages):
            if idx >= limit:
                break

            text_el = msg.select_one(".tgme_widget_message_text")
            if not text_el:
                continue

            raw_text = text_el.get_text(separator=" ", strip=True)
            if not raw_text or len(raw_text) < 10:
                continue

            # Datetime
            time_el = msg.select_one("time")
            iso_date = time_el.get("datetime", "") if time_el else ""

            # Canonical message link
            link_el = msg.select_one("a.tgme_widget_message_date")
            url = link_el.get("href") if link_el else None

            # First line as title, rest as preview
            lines = [l.strip() for l in raw_text.splitlines() if l.strip()]
            title   = lines[0][:120] if lines else raw_text[:120]
            preview = " ".join(lines[1:])[:200] if len(lines) > 1 else None

            items.append({
                "id":      f"tg-{idx}",
                "title":   title,
                "date":    iso_date,
                "source":  "Telegram",
                "url":     url,
                "preview": preview,
                "tag":     _classify_title(raw_text),
            })

        return items

    except Exception as exc:
        logger.warning("Telegram scrape failed: %s", exc)
        return []


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _parse_gtu_date(s: str) -> Optional[str]:
    """Convert '14-May-2026' → '2026-05-14T00:00:00+00:00'."""
    try:
        dt = datetime.strptime(s.strip(), "%d-%b-%Y")
        return dt.replace(tzinfo=timezone.utc).isoformat()
    except Exception:
        return None


def _classify_title(text: str) -> str:
    t = text.lower()
    if any(w in t for w in ["timetable", "time table", "exam date", "schedule"]):
        return "timetable"
    if any(w in t for w in ["result", "declare", "declared"]):
        return "result"
    if any(w in t for w in ["circular", "notification", "instruction", "guideline"]):
        return "circular"
    if any(w in t for w in ["form", "fee", "enrollment", "enrolment"]):
        return "form"
    if any(w in t for w in ["holiday", "vacation", "closed"]):
        return "holiday"
    return "notice"


TAG_ORDER = ["timetable", "result", "form", "circular", "notice", "holiday"]


def _sort_key(item: dict) -> tuple:
    date = item.get("date") or ""
    tag_rank = TAG_ORDER.index(item["tag"]) if item["tag"] in TAG_ORDER else 99
    return (tag_rank, date)


# ---------------------------------------------------------------------------
# Route
# ---------------------------------------------------------------------------
@router.get("/gtu")
async def get_gtu_news(limit: int = 20, force: bool = False):
    """
    Returns merged GTU news from gtu.ac.in circulars + Telegram @gtu_announcement.
    Cached for 30 minutes. Pass ?force=true to bypass cache.
    """
    now = time.time()

    if not force and _cache["data"] and (now - _cache["fetched_at"]) < CACHE_TTL:
        return {
            **_cache["data"],
            "from_cache": True,
            "cache_age_seconds": int(now - _cache["fetched_at"]),
        }

    # Fetch both sources concurrently
    import asyncio
    circulars, telegram = await asyncio.gather(
        _fetch_gtu_circulars(limit=limit),
        _fetch_telegram(limit=limit),
    )

    # Merge and sort — timetables + results first, then by date desc
    merged = circulars + telegram
    merged.sort(key=lambda x: (
        TAG_ORDER.index(x["tag"]) if x["tag"] in TAG_ORDER else 99,
        x.get("date") or "",
    ), reverse=False)

    # Sort by tag priority then date (newest first within same tag)
    merged.sort(key=lambda x: x.get("date") or "", reverse=True)
    merged.sort(key=lambda x: TAG_ORDER.index(x["tag"]) if x["tag"] in TAG_ORDER else 99)

    # Deduplicate by title similarity (same title from both sources)
    seen: set[str] = set()
    deduped = []
    for item in merged:
        key = item["title"][:60].lower().strip()
        if key not in seen:
            seen.add(key)
            deduped.append(item)

    result = {
        "items": deduped[:limit],
        "total": len(deduped),
        "sources": {
            "gtu_circular": len(circulars),
            "telegram": len(telegram),
        },
        "fetched_at": datetime.now(timezone.utc).isoformat(),
        "from_cache": False,
        "cache_age_seconds": 0,
    }

    _cache["data"] = result
    _cache["fetched_at"] = now

    return result
