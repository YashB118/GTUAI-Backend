import json
import logging
from datetime import datetime, timezone
from typing import List, Optional

logger = logging.getLogger(__name__)


def calculate_score(
    years: List[int],
    avg_marks: Optional[float] = None,
    weights: Optional[dict] = None,
) -> float:
    if not years:
        return 0.0

    if weights is None:
        from services.settings_service import get_prediction_weights
        weights = get_prediction_weights()

    w_freq = float(weights.get("frequency", 40.0))
    w_rec = float(weights.get("recency", 30.0))
    w_cons = float(weights.get("consecutive", 20.0))
    w_marks = float(weights.get("marks", 10.0))

    # Factor 1: Frequency (saturates at 8 occurrences)
    frequency_score = min(len(years) / 8.0, 1.0) * w_freq

    # Factor 2: Recency/Gap (3+ year gap = peak likelihood of return)
    years_since_last = datetime.now().year - max(years)
    if years_since_last == 0:
        rec_factor = 0.66
    elif years_since_last == 1:
        rec_factor = 0.83
    elif years_since_last == 2:
        rec_factor = 0.93
    elif years_since_last >= 3:
        rec_factor = 1.0
    else:
        rec_factor = 0.5
    recency_score = rec_factor * w_rec

    # Factor 3: Consecutive streak (saturates at 4 in a row)
    consecutive = _max_consecutive(sorted(years))
    consecutive_score = min(consecutive / 4.0, 1.0) * w_cons

    # Factor 4: Marks weight (heavier marks = more weight)
    if avg_marks and avg_marks >= 7:
        marks_factor = 1.0
    elif avg_marks and avg_marks >= 3:
        marks_factor = 0.6
    else:
        marks_factor = 0.3
    marks_score = marks_factor * w_marks

    return round(frequency_score + recency_score + consecutive_score + marks_score, 2)


def _max_consecutive(years: list) -> int:
    if len(years) < 2:
        return 1
    max_run = current_run = 1
    for i in range(1, len(years)):
        if years[i] - years[i - 1] == 1:
            current_run += 1
            max_run = max(max_run, current_run)
        else:
            current_run = 1
    return max_run


def run_pattern_analysis(supabase, paper_id: str, subject_id: str):
    """
    For each question in the given paper, find semantically similar questions
    from other papers and group them into question_patterns.
    """
    from services.pdf_processor import embed_text, find_similar_questions

    questions_res = (
        supabase.table("questions")
        .select("*")
        .eq("paper_id", paper_id)
        .execute()
    )
    questions = questions_res.data or []

    if not questions:
        logger.info(f"No questions for paper {paper_id} to analyze.")
        return

    for question in questions:
        text = question.get("text", "").strip()
        if not text:
            continue

        embedding = embed_text(text)
        similar = find_similar_questions(embedding, subject_id, threshold=0.60)

        # Need at least 2 results (self + at least one other paper's question)
        if len(similar) < 2:
            continue

        years = sorted(set(
            r.payload.get("year") for r in similar
            if r.payload.get("year") is not None
        ))
        if len(years) < 2:
            continue

        avg_marks = question.get("marks")
        score = calculate_score(years, avg_marks)
        now_iso = datetime.now(timezone.utc).isoformat()

        existing_res = (
            supabase.table("question_patterns")
            .select("id, occurrence_years")
            .eq("embedding_id", similar[0].id)
            .execute()
        )
        existing = existing_res.data[0] if existing_res.data else None

        if existing:
            merged_years = sorted(set((existing.get("occurrence_years") or []) + years))
            new_score = calculate_score(merged_years, avg_marks)
            supabase.table("question_patterns").update({
                "occurrence_years": merged_years,
                "occurrence_count": len(merged_years),
                "last_asked_year": max(merged_years),
                "prediction_score": new_score,
                "updated_at": now_iso,
            }).eq("id", existing["id"]).execute()
        else:
            supabase.table("question_patterns").insert({
                "subject_id": subject_id,
                "canonical_text": text,
                "occurrence_years": years,
                "occurrence_count": len(years),
                "avg_marks": float(avg_marks) if avg_marks is not None else None,
                "prediction_score": score,
                "last_asked_year": max(years),
                "embedding_id": similar[0].id,
                "question_type": question.get("question_type"),
                "unit_number": question.get("unit_number"),
                "updated_at": now_iso,
            }).execute()

    logger.info(f"Pattern analysis complete for paper {paper_id}")


def generate_answers_for_subject(supabase, subject_id: str):
    """Batch-generate answers for all unanswered question patterns in a subject.
    Uses Groq (preferred) or Gemini (fallback) via services.llm.
    """
    from services.llm import generate_json

    res = (
        supabase.table("question_patterns")
        .select("id, canonical_text")
        .eq("subject_id", subject_id)
        .is_("answer", "null")
        .order("prediction_score", desc=True)
        .limit(20)
        .execute()
    )
    patterns = res.data or []
    if not patterns:
        logger.info(f"No unanswered patterns for subject {subject_id}")
        return

    numbered = "\n".join(f"{i+1}. {p['canonical_text']}" for i, p in enumerate(patterns))
    prompt = f"""You are a GTU exam preparation expert. Write a concise model answer (3-6 sentences or key bullet points) for each GTU exam question below.
Return ONLY a valid JSON array. Each item must have: {{"index": <number>, "answer": "<answer text>"}}
No markdown code fences. No extra explanation.

Questions:
{numbered}

JSON array:"""

    try:
        answers = generate_json(prompt)
        if not isinstance(answers, list):
            logger.warning("Answer generation returned non-list")
            return

        answer_map = {
            item["index"]: item["answer"]
            for item in answers
            if isinstance(item, dict) and "index" in item and "answer" in item
        }

        for i, pattern in enumerate(patterns):
            answer = answer_map.get(i + 1)
            if answer:
                supabase.table("question_patterns").update(
                    {"answer": answer}
                ).eq("id", pattern["id"]).execute()

        # Invalidate predictions cache so next fetch includes fresh answers
        if answer_map:
            supabase.table("predictions").delete().eq("subject_id", subject_id).execute()

        logger.info(f"Generated {len(answer_map)} answers for subject {subject_id}")
    except Exception as e:
        logger.warning(f"Answer generation failed for subject {subject_id}: {e}")
