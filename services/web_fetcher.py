"""
Web paper fetcher — searches DuckDuckGo for publicly available GTU question papers,
downloads and extracts questions from them to augment local DB data.
Results are cached in-memory per subject for the session.
"""
import logging
import time
from typing import Optional

import requests

logger = logging.getLogger(__name__)

# In-memory cache: subject_id -> {questions, fetched_at}
_web_cache: dict = {}
_CACHE_TTL = 3600 * 6  # 6 hours


def fetch_web_questions(subject_name: str, subject_code: Optional[str], max_pdfs: int = 3) -> list[dict]:
    """
    Search DuckDuckGo for GTU papers for the given subject,
    download up to max_pdfs PDFs, extract questions, return list of question dicts.
    Returns [] gracefully on any failure.
    """
    cache_key = f"{subject_name}:{subject_code}"
    now = time.time()
    if cache_key in _web_cache and (now - _web_cache[cache_key]["fetched_at"]) < _CACHE_TTL:
        logger.info(f"Web cache hit for {subject_name}")
        return _web_cache[cache_key]["questions"]

    logger.info(f"Searching web for GTU papers: {subject_name} ({subject_code})")
    pdf_urls = _search_for_pdfs(subject_name, subject_code)
    if not pdf_urls:
        logger.info(f"No web PDFs found for {subject_name}")
        _web_cache[cache_key] = {"questions": [], "fetched_at": now}
        return []

    all_questions = []
    for url in pdf_urls[:max_pdfs]:
        qs = _download_and_extract(url, subject_name)
        all_questions.extend(qs)

    # Deduplicate by approximate text match
    seen = set()
    unique = []
    for q in all_questions:
        key = q.get("text", "")[:60].lower().strip()
        if key and key not in seen:
            seen.add(key)
            unique.append(q)

    logger.info(f"Web fetch complete for {subject_name}: {len(unique)} unique questions from {len(pdf_urls[:max_pdfs])} PDFs")
    _web_cache[cache_key] = {"questions": unique, "fetched_at": now}
    return unique


def _search_for_pdfs(subject_name: str, subject_code: Optional[str]) -> list[str]:
    try:
        from duckduckgo_search import DDGS

        queries = [
            f'GTU "{subject_code}" question paper filetype:pdf' if subject_code else None,
            f'GTU "{subject_name}" question paper filetype:pdf',
            f'"{subject_name}" GTU exam paper site:gtu.ac.in',
            f'"{subject_name}" GTU question paper -site:youtube.com',
            f'"{subject_name}" GTU question paper -site:gtuapymaterials.com',
            f'"{subject_name}" GTU question paper -site:gtupapersolution.com'
        ]
        queries = [q for q in queries if q]

        found_urls = []
        seen_domains = set()

        with DDGS() as ddg:
            for query in queries:
                if len(found_urls) >= 5:
                    break
                try:
                    results = list(ddg.text(query, max_results=5))
                    for r in results:
                        url = r.get("href", "")
                        if not url:
                            continue
                        # Accept PDFs directly or pages that likely link to PDFs
                        if url.endswith(".pdf") or ".pdf" in url.lower():
                            if url not in found_urls:
                                found_urls.append(url)
                        # Also accept known paper hosting sites
                        elif any(site in url for site in ["gtu.ac.in", "gtupapersolution", "gtupaper", "studocu", "scribd"]):
                            domain = url.split("/")[2] if "/" in url else url
                            if domain not in seen_domains:
                                seen_domains.add(domain)
                                # Try to find PDF link on this page
                                pdf = _extract_pdf_from_page(url)
                                if pdf:
                                    found_urls.append(pdf)
                    time.sleep(0.5)
                except Exception as e:
                    logger.debug(f"DDG search query failed: {e}")
                    continue

        return found_urls[:5]
    except Exception as e:
        logger.warning(f"Web search failed: {e}")
        return []


def _extract_pdf_from_page(page_url: str) -> Optional[str]:
    """Try to find a PDF link on a web page."""
    try:
        resp = requests.get(page_url, timeout=8, headers={"User-Agent": "Mozilla/5.0"}, allow_redirects=True)
        if resp.status_code != 200:
            return None
        import re
        pdf_links = re.findall(r'href=["\']([^"\']+\.pdf[^"\']*)["\']', resp.text, re.IGNORECASE)
        if pdf_links:
            link = pdf_links[0]
            if link.startswith("http"):
                return link
            # Relative URL
            from urllib.parse import urljoin
            return urljoin(page_url, link)
    except Exception:
        pass
    return None


def _download_and_extract(url: str, subject_name: str) -> list[dict]:
    """Download PDF and extract questions using existing pipeline."""
    try:
        resp = requests.get(
            url, timeout=20,
            headers={"User-Agent": "Mozilla/5.0"},
            allow_redirects=True,
            stream=True,
        )
        if resp.status_code != 200:
            logger.debug(f"PDF download failed ({resp.status_code}): {url}")
            return []

        content_type = resp.headers.get("content-type", "")
        if "pdf" not in content_type.lower() and not url.lower().endswith(".pdf"):
            logger.debug(f"Not a PDF: {url}")
            return []

        file_bytes = resp.content
        if len(file_bytes) < 5000:  # Too small to be a real paper
            return []

        from services.pdf_processor import extract_text, extract_questions_gemini
        raw_text = extract_text(file_bytes)
        questions = extract_questions_gemini(raw_text, subject_name, file_bytes=file_bytes if not raw_text.strip() else None)

        # Tag as web-sourced
        for q in questions:
            q["source"] = "web"
            q["source_url"] = url

        logger.info(f"Extracted {len(questions)} questions from web PDF: {url[:80]}")
        return questions

    except Exception as e:
        logger.warning(f"Failed to download/extract {url}: {e}")
        return []

