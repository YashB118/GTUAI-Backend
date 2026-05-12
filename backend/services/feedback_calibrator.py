"""Feedback loop calibration — updates Bayesian priors from oracle_feedback."""
from __future__ import annotations
import logging

logger = logging.getLogger(__name__)


async def calibrate_from_feedback(supabase, subject_id: str) -> dict:
    """
    Pull oracle_feedback for subject, find matching patterns, apply
    Bayesian delta (+5 for appeared, -3 for not appeared).
    Run after admin marks exam as completed.
    """
    feedback_res = (
        supabase.table("oracle_feedback")
        .select("question_text, appeared")
        .eq("subject_id", subject_id)
        .execute()
    )
    rows = feedback_res.data or []
    if not rows:
        return {"calibrated": 0, "skipped": 0}

    calibrated = 0
    skipped    = 0

    for row in rows:
        q_text = (row.get("question_text") or "").strip()
        if not q_text:
            skipped += 1
            continue

        pattern_id = await _find_matching_pattern(supabase, q_text, subject_id)
        if not pattern_id:
            skipped += 1
            continue

        delta = 5 if row.get("appeared") else -3
        try:
            current_res = (
                supabase.table("question_patterns")
                .select("prediction_score")
                .eq("id", pattern_id)
                .single()
                .execute()
            )
            current_score = float(current_res.data.get("prediction_score") or 50)
            new_score = max(0.0, min(100.0, current_score + delta))
            supabase.table("question_patterns").update({
                "prediction_score": new_score,
            }).eq("id", pattern_id).execute()
            calibrated += 1
        except Exception as e:
            logger.warning(f"Calibration update failed for pattern {pattern_id}: {e}")
            skipped += 1

    await _recompute_confidence_bands(supabase, subject_id)

    logger.info(f"Calibrated {calibrated} patterns for subject {subject_id}, skipped {skipped}")
    return {"calibrated": calibrated, "skipped": skipped}


async def _find_matching_pattern(supabase, question_text: str, subject_id: str) -> str | None:
    """Find the most similar pattern using simple text prefix match."""
    prefix = question_text[:80].lower()
    try:
        res = (
            supabase.table("question_patterns")
            .select("id, canonical_text")
            .eq("subject_id", subject_id)
            .execute()
        )
        patterns = res.data or []
        for p in patterns:
            canon = (p.get("canonical_text") or "").lower()
            if prefix[:40] in canon or canon[:40] in prefix:
                return p["id"]
    except Exception as e:
        logger.warning(f"Pattern lookup failed: {e}")
    return None


async def _recompute_confidence_bands(supabase, subject_id: str) -> None:
    try:
        res = (
            supabase.table("question_patterns")
            .select("id, prediction_score")
            .eq("subject_id", subject_id)
            .execute()
        )
        for p in (res.data or []):
            score = float(p.get("prediction_score") or 0)
            band = "HIGH" if score >= 75 else "MEDIUM" if score >= 50 else "LOW"
            supabase.table("question_patterns").update(
                {"confidence_band": band}
            ).eq("id", p["id"]).execute()
    except Exception as e:
        logger.warning(f"Band recompute failed: {e}")
