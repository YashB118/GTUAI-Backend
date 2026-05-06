"""
Brahmastra Engine — curated pre-exam intelligence brief.

Reads from the existing predictions pipeline and produces:
  - Three tiers: certain (≥78), likely (55-77), watch (35-54)
  - DUE badges for topics with 3+ year gap
  - LLM professor-voice narrative summary (specific, ≤70 words)
  - Cached in oracle_briefs with a public share_id (24h TTL)

Internal module name is oracle_engine; user-facing name is Brahmastra.
"""
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional

from services.llm import generate_text

logger = logging.getLogger(__name__)

CURRENT_YEAR = datetime.now().year
_CACHE_HOURS = 24
_TIER_LIMITS = {"certain": 5, "likely": 8, "watch": 6}
_TIER_THRESHOLDS = {"certain": 78, "likely": 55, "watch": 35}


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _years_gap(last_asked: Optional[int]) -> int:
    if last_asked is None:
        return 0
    return CURRENT_YEAR - last_asked


def _to_oracle_question(p: dict, tier: str) -> dict:
    last = p.get("last_asked")
    gap = _years_gap(last)
    score = float(p.get("prediction_score") or p.get("confidence_score") or 0)
    return {
        "text":          (p.get("question") or "").strip(),
        "confidence":    int(round(score)),
        "tier":          tier,
        "marks":         p.get("expected_marks") or p.get("marks") or 7,
        "unit":          p.get("unit"),
        "question_type": p.get("question_type") or "theory",
        "last_asked":    last,
        "years_gap":     gap,
        "is_due":        gap >= 3,
        "reasoning":     (p.get("reasoning") or "").strip(),
        "pattern_id":    p.get("pattern_id"),
    }


def _assign_tiers(predictions: list[dict]) -> dict:
    certain, likely, watch = [], [], []
    for p in sorted(predictions, key=lambda x: float(x.get("prediction_score") or x.get("confidence_score") or 0), reverse=True):
        score = float(p.get("prediction_score") or p.get("confidence_score") or 0)
        text = (p.get("question") or "").strip()
        if not text:
            continue
        if score >= _TIER_THRESHOLDS["certain"] and len(certain) < _TIER_LIMITS["certain"]:
            certain.append(_to_oracle_question(p, "certain"))
        elif score >= _TIER_THRESHOLDS["likely"] and len(likely) < _TIER_LIMITS["likely"]:
            likely.append(_to_oracle_question(p, "likely"))
        elif score >= _TIER_THRESHOLDS["watch"] and len(watch) < _TIER_LIMITS["watch"]:
            watch.append(_to_oracle_question(p, "watch"))
    return {"certain": certain, "likely": likely, "watch": watch}


def _fallback_summary(certain: list, likely: list, subject_name: str) -> str:
    due = [q for q in certain + likely if q.get("is_due")]
    parts = []
    if due:
        units = [f"Unit {q['unit']}" for q in due[:2] if q.get("unit")]
        parts.append(f"{', '.join(units) or 'Some units'} {'is' if len(units) == 1 else 'are'} overdue — gap of 3+ years.")
    if certain:
        parts.append(f"{len(certain)} questions identified with very high confidence.")
    if not parts:
        parts.append(f"Pattern analysis complete for {subject_name}.")
    return " ".join(parts)


def _generate_summary(certain: list, likely: list, subject_name: str, paper_count: int) -> str:
    if not certain and not likely:
        return f"Insufficient data for {subject_name}. Upload more past papers for sharper predictions."

    top = (certain + likely)[:5]
    due_units = [f"Unit {q['unit']}" for q in top if q.get("is_due") and q.get("unit")]

    q_lines = "\n".join(
        f"- {'[DUE] ' if q['is_due'] else ''}Unit {q.get('unit', '?')}: "
        f"{q['text'][:100]} ({q['marks']}M, last {q['last_asked'] or 'never'})"
        for q in top
    )

    prompt = (
        f"You are a GTU professor briefing a student the night before their {subject_name} exam.\n"
        f"{paper_count} papers analyzed.\n\n"
        f"Top predicted questions:\n{q_lines}\n\n"
        f"DUE topics (3+ year gap): {', '.join(due_units) if due_units else 'none'}\n\n"
        "Write a 2-3 sentence briefing. Rules:\n"
        "- Name specific units/topics\n"
        "- Call out DUE topics urgently\n"
        "- Professor tone — direct, no fluff\n"
        "- Max 70 words\n"
        "- No 'good luck' or 'make sure'\n\n"
        "Write ONLY the briefing text:"
    )

    try:
        return generate_text(prompt, temperature=0.55, max_tokens=150).strip()
    except Exception as e:
        logger.warning(f"Brahmastra LLM summary failed: {e}")
        return _fallback_summary(certain, likely, subject_name)


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------

def build_brahmastra_brief(subject_id: str, supabase) -> dict:
    """
    Build and cache a Brahmastra brief for a subject.
    Returns the brief dict (same shape stored in oracle_briefs.brief + share_id).
    Raises ValueError if no prediction data found.
    """
    now = datetime.now(timezone.utc)
    now_iso = now.isoformat()

    # --- 1. Serve from cache if fresh ---
    cached = (
        supabase.table("oracle_briefs")
        .select("*")
        .eq("subject_id", subject_id)
        .gt("valid_until", now_iso)
        .order("generated_at", desc=True)
        .limit(1)
        .execute()
    )
    if cached.data:
        row = cached.data[0]
        brief = dict(row["brief"])
        brief.update({
            "share_id":     row["share_id"],
            "generated_at": row["generated_at"],
            "valid_until":  row["valid_until"],
            "from_cache":   True,
        })
        return brief

    # --- 2. Subject info ---
    subj = (
        supabase.table("subjects")
        .select("name, code, branch, semester")
        .eq("id", subject_id)
        .maybe_single()
        .execute()
    ).data or {}
    subject_name = subj.get("name") or "Unknown Subject"

    # --- 3. Predictions — try predictions cache first, else question_patterns ---
    predictions: list[dict] = []
    paper_count = 0

    pred_cache = (
        supabase.table("predictions")
        .select("predicted_questions, paper_count_used")
        .eq("subject_id", subject_id)
        .gt("valid_until", now_iso)
        .order("generated_at", desc=True)
        .limit(1)
        .execute()
    )
    if pred_cache.data:
        pqs = pred_cache.data[0].get("predicted_questions") or []
        predictions = pqs if isinstance(pqs, list) else []
        paper_count = pred_cache.data[0].get("paper_count_used") or 0

    if not predictions:
        patterns = (
            supabase.table("question_patterns")
            .select("id, canonical_text, prediction_score, last_asked_year, avg_marks, unit_number, question_type")
            .eq("subject_id", subject_id)
            .order("prediction_score", desc=True)
            .limit(50)
            .execute()
        ).data or []

        predictions = [
            {
                "pattern_id":      p.get("id"),
                "question":        p.get("canonical_text", ""),
                "prediction_score": p.get("prediction_score", 0),
                "last_asked":      p.get("last_asked_year"),
                "marks":           p.get("avg_marks"),
                "unit":            p.get("unit_number"),
                "question_type":   p.get("question_type"),
                "reasoning":       "",
                "source":          "pattern",
            }
            for p in patterns
        ]

        pc_res = (
            supabase.table("question_papers")
            .select("id", count="exact")
            .eq("subject_id", subject_id)
            .eq("processing_status", "done")
            .execute()
        )
        paper_count = pc_res.count or 0

    if not predictions:
        raise ValueError(
            "No prediction data available for this subject. "
            "Upload past question papers first."
        )

    # --- 4. Tier assignment ---
    tiers = _assign_tiers(predictions)
    certain = tiers["certain"]
    likely  = tiers["likely"]
    watch   = tiers["watch"]

    all_qs  = certain + likely + watch
    due_count = sum(1 for q in all_qs if q.get("is_due"))

    # --- 5. LLM narrative summary ---
    summary = _generate_summary(certain, likely, subject_name, paper_count)

    # --- 6. Build & store brief ---
    valid_until = (now + timedelta(hours=_CACHE_HOURS)).isoformat()

    brief_payload = {
        "subject_id":   subject_id,
        "subject_name": subject_name,
        "subject_code": subj.get("code"),
        "branch":       subj.get("branch"),
        "semester":     subj.get("semester"),
        "paper_count":  paper_count,
        "summary":      summary,
        "certain":      certain,
        "likely":       likely,
        "watch":        watch,
        "due_count":    due_count,
        "from_cache":   False,
    }

    insert_res = (
        supabase.table("oracle_briefs")
        .insert({
            "subject_id":  subject_id,
            "brief":       brief_payload,
            "paper_count": paper_count,
            "valid_until": valid_until,
        })
        .execute()
    )
    row = insert_res.data[0] if insert_res.data else {}

    brief_payload.update({
        "share_id":     row.get("share_id", ""),
        "generated_at": now_iso,
        "valid_until":  valid_until,
    })
    return brief_payload
