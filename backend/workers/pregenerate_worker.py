"""
Phase 7.1 — Pre-generate answers for HIGH-confidence predictions.
Run after each prediction refresh.
"""
from __future__ import annotations
import asyncio
import logging

logger = logging.getLogger(__name__)


async def pregenerate_answer_worker(supabase, subject_id: str) -> int:
    """
    Fetch HIGH-confidence patterns with no cached answer and pre-generate.
    Returns count of answers generated.
    """
    from services.answer_engine import generate_answer

    res = (
        supabase.table("question_patterns")
        .select("id, canonical_text, avg_marks, confidence_band")
        .eq("subject_id", subject_id)
        .eq("confidence_band", "HIGH")
        .execute()
    )
    patterns = res.data or []

    # Filter to those without cached answers
    generated = 0
    for p in patterns[:15]:  # cap at 15 to avoid rate-limiting Groq
        pattern_id = p["id"]
        existing = (
            supabase.table("answers")
            .select("id")
            .eq("pattern_id", pattern_id)
            .limit(1)
            .execute()
        )
        if existing.data:
            continue

        marks = int(p.get("avg_marks") or 7)
        try:
            generate_answer(
                supabase,
                question_text=p["canonical_text"],
                subject_id=subject_id,
                marks=marks,
                pattern_id=pattern_id,
            )
            generated += 1
            await asyncio.sleep(1.0)  # respect Groq rate limit
        except Exception as e:
            logger.warning(f"Pre-gen failed for pattern {pattern_id}: {e}")

    logger.info(f"Pre-generated {generated} answers for subject {subject_id}")
    return generated
