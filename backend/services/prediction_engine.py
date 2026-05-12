"""
Prediction Engine — Multi-signal Bayesian scoring for GTU exam question patterns.

V2 — Four signals, properly calibrated:
  1. Bayesian Frequency  [40%]  Beta-Binomial posterior — handles small samples correctly
  2. Cycle-Aware Gap     [30%]  Overdue ratio from historical inter-appearance gaps
  3. Consecutive Streak  [20%]  Longest run of back-to-back years
  4. Marks Weight        [10%]  Heavier questions appear more reliably

Why Bayesian over simple normalization:
  Simple: appeared 3/8 times → 3/8 = 37.5%
  Bayesian: Beta(1.5, 6.5) posterior mean = 1.5/8 = 18.8% with uncertainty
  The Bayesian model is conservative on sparse evidence — prevents false confidence.

Why cycle-aware gap over simple recency:
  Simple: "3+ years = peak". A question on a 2-year cycle is DUE at year 2.
  A question on a 5-year cycle is not due at year 3.
  Overdue ratio = current_gap / avg_historical_gap solves this precisely.
"""
import logging
import math
from datetime import datetime, timezone
from typing import Optional

logger = logging.getLogger(__name__)

CURRENT_YEAR = datetime.now().year

# Jeffreys prior — optimal for binomial, unbiased for small samples
# Beta(0.5, 0.5) — slightly conservative, avoids extreme posteriors with k=0 or k=n
_BAYES_ALPHA = 0.5
_BAYES_BETA  = 0.5

# Default assumed cycle length when question has only 1 appearance
_DEFAULT_CYCLE_YEARS = 3.0


# ---------------------------------------------------------------------------
# Public scoring function
# ---------------------------------------------------------------------------

def calculate_score(
    years: list[int],
    avg_marks: Optional[float] = None,
    total_papers: int = 0,
    weights: Optional[dict] = None,
) -> float:
    """
    Compute prediction score (0–100) for a question pattern.

    Args:
        years:        All years this question appeared.
        avg_marks:    Average marks this question carries.
        total_papers: Total processed papers for this subject (enables Bayesian normalization).
        weights:      Optional override for signal weights (from app_settings).
    """
    if not years:
        return 0.0

    if weights is None:
        try:
            from services.settings_service import get_prediction_weights
            weights = get_prediction_weights()
        except Exception:
            weights = {"frequency": 40.0, "recency": 30.0, "consecutive": 20.0, "marks": 10.0}

    w_freq = float(weights.get("frequency", 40.0))
    w_gap  = float(weights.get("recency",   30.0))
    w_cons = float(weights.get("consecutive", 20.0))
    w_mark = float(weights.get("marks",      10.0))

    sorted_years = sorted(years)
    k = len(sorted_years)
    n = max(total_papers, k * 2, 8)   # conservative denominator when paper_count unavailable

    # --- Signal 1: Bayesian frequency ---
    # Posterior mean of Beta-Binomial: E[θ|k,n] = (α+k)/(α+β+n)
    bayes_prob   = (_BAYES_ALPHA + k) / (_BAYES_ALPHA + _BAYES_BETA + n)
    freq_score   = bayes_prob * 100.0 * (w_freq / 100.0)

    # --- Signal 2: Cycle-aware gap ---
    gap_factor   = _cycle_gap_factor(sorted_years)
    gap_score    = gap_factor * w_gap

    # --- Signal 3: Consecutive streak ---
    streak       = _max_consecutive(sorted_years)
    cons_score   = min(streak / 4.0, 1.0) * w_cons

    # --- Signal 4: Marks weight ---
    if avg_marks and avg_marks >= 7:
        mark_factor = 1.0
    elif avg_marks and avg_marks >= 3:
        mark_factor = 0.6
    else:
        mark_factor = 0.3
    mark_score = mark_factor * w_mark

    raw = freq_score + gap_score + cons_score + mark_score
    return round(min(raw, 100.0), 2)


def compute_overdue_ratio(years: list[int]) -> float:
    """
    Return the overdue ratio: current_gap / avg_historical_gap.
    >1.0 means the question is overdue based on its own historical cycle.
    """
    if not years:
        return 0.0
    s = sorted(years)
    current_gap = CURRENT_YEAR - s[-1]
    if len(s) >= 2:
        gaps = [s[i+1] - s[i] for i in range(len(s) - 1)]
        avg_gap = sum(gaps) / len(gaps)
    else:
        avg_gap = _DEFAULT_CYCLE_YEARS
    return round(current_gap / avg_gap, 2) if avg_gap > 0 else 0.0


def compute_unit_analysis(questions: list[dict], patterns: list[dict]) -> dict:
    """
    Returns rich per-unit statistics used by professor_engine and oracle_engine.

    Return shape:
    {
      unit_key: {
        "question_count": int,
        "years": list[int],
        "last_year": int | None,
        "avg_gap": float,
        "current_gap": int,
        "overdue_ratio": float,
        "deficit_score": float   # 0–1, higher = more overdue coverage
      }
    }
    """
    from collections import defaultdict

    units: dict = defaultdict(lambda: {
        "question_count": 0,
        "years": set(),
        "last_year": None,
    })

    for q in questions:
        unit_key = int(q.get("unit") or q.get("unit_number") or 0)
        year = q.get("year")
        units[unit_key]["question_count"] += 1
        if year:
            yr = int(year)
            units[unit_key]["years"].add(yr)
            ly = units[unit_key]["last_year"]
            if ly is None or yr > ly:
                units[unit_key]["last_year"] = yr

    for p in patterns:
        unit_key = int(p.get("unit_number") or 0)
        for yr in (p.get("occurrence_years") or []):
            units[unit_key]["years"].add(int(yr))
        last = p.get("last_asked_year")
        if last:
            ly = units[unit_key]["last_year"]
            if ly is None or int(last) > ly:
                units[unit_key]["last_year"] = int(last)

    result = {}
    for unit_key, data in units.items():
        sorted_years = sorted(data["years"])
        last = data["last_year"]
        current_gap = (CURRENT_YEAR - last) if last else 99

        if len(sorted_years) >= 2:
            gaps = [sorted_years[i+1] - sorted_years[i] for i in range(len(sorted_years)-1)]
            avg_gap = sum(gaps) / len(gaps)
        else:
            avg_gap = _DEFAULT_CYCLE_YEARS

        overdue_ratio = current_gap / avg_gap if avg_gap > 0 else 0.0
        # Deficit score 0–1: how badly is this unit overdue?
        deficit_score = min(overdue_ratio / 2.0, 1.0)

        result[unit_key] = {
            "question_count":   data["question_count"],
            "years":            sorted_years,
            "last_year":        last,
            "avg_gap":          round(avg_gap, 2),
            "current_gap":      current_gap,
            "overdue_ratio":    round(overdue_ratio, 2),
            "deficit_score":    round(deficit_score, 2),
        }

    return dict(result)


# ---------------------------------------------------------------------------
# Pattern analysis (called after paper processing)
# ---------------------------------------------------------------------------

def run_pattern_analysis(supabase, paper_id: str, subject_id: str):
    """
    For every question in the paper, find semantically similar questions
    from other papers and merge into question_patterns with updated scores.
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
        logger.info(f"No questions for paper {paper_id}")
        return

    # Fetch total processed papers for subject — needed for Bayesian scoring
    pc_res = (
        supabase.table("question_papers")
        .select("id", count="exact")
        .eq("subject_id", subject_id)
        .eq("processing_status", "done")
        .execute()
    )
    total_papers = pc_res.count or 0

    now_iso = datetime.now(timezone.utc).isoformat()

    for question in questions:
        text = (question.get("text") or "").strip()
        if not text:
            continue

        embedding = embed_text(text)
        similar   = find_similar_questions(embedding, subject_id, threshold=0.60)

        if len(similar) < 2:
            continue

        years = sorted(set(
            r.payload.get("year") for r in similar
            if r.payload.get("year") is not None
        ))
        if len(years) < 2:
            continue

        avg_marks = question.get("marks")
        score     = calculate_score(years, avg_marks, total_papers=total_papers)

        existing_res = (
            supabase.table("question_patterns")
            .select("id, occurrence_years, avg_marks")
            .eq("embedding_id", similar[0].id)
            .execute()
        )
        existing = existing_res.data[0] if existing_res.data else None

        if existing:
            merged_years  = sorted(set((existing.get("occurrence_years") or []) + years))
            merged_marks  = existing.get("avg_marks") or avg_marks
            updated_score = calculate_score(merged_years, merged_marks, total_papers=total_papers)
            supabase.table("question_patterns").update({
                "occurrence_years": merged_years,
                "occurrence_count": len(merged_years),
                "last_asked_year":  max(merged_years),
                "prediction_score": updated_score,
                "updated_at":       now_iso,
            }).eq("id", existing["id"]).execute()
        else:
            supabase.table("question_patterns").insert({
                "subject_id":       subject_id,
                "canonical_text":   text,
                "occurrence_years": years,
                "occurrence_count": len(years),
                "avg_marks":        float(avg_marks) if avg_marks is not None else None,
                "prediction_score": score,
                "last_asked_year":  max(years),
                "embedding_id":     similar[0].id,
                "question_type":    question.get("question_type"),
                "unit_number":      question.get("unit_number"),
                "updated_at":       now_iso,
            }).execute()

    logger.info(f"Pattern analysis complete — paper {paper_id}, {total_papers} total papers")


# ---------------------------------------------------------------------------
# Answer generation (batch LLM)
# ---------------------------------------------------------------------------

def generate_answers_for_subject(supabase, subject_id: str):
    """Batch-generate answers for top unanswered question patterns."""
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
        return

    numbered = "\n".join(f"{i+1}. {p['canonical_text']}" for i, p in enumerate(patterns))
    prompt = (
        "You are a GTU exam preparation expert. "
        "Write a concise model answer (3-6 sentences or key bullet points) for each question.\n"
        "Return ONLY a valid JSON array. Each item: {\"index\": <n>, \"answer\": \"<text>\"}\n"
        "No markdown. No extra text.\n\n"
        f"Questions:\n{numbered}\n\nJSON array:"
    )

    try:
        answers = generate_json(prompt)
        if not isinstance(answers, list):
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

        if answer_map:
            supabase.table("predictions").delete().eq("subject_id", subject_id).execute()

        logger.info(f"Generated {len(answer_map)} answers for subject {subject_id}")
    except Exception as e:
        logger.warning(f"Answer generation failed for subject {subject_id}: {e}")


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _cycle_gap_factor(sorted_years: list[int]) -> float:
    """
    Returns 0.40–1.20 multiplier based on overdue ratio.

    Curve:
      ratio 0.0 (asked this year)   → 0.40  (strong penalty)
      ratio 0.5 (halfway in cycle)  → 0.73
      ratio 1.0 (exactly due)       → 1.00  (peak)
      ratio 1.5 (50% overdue)       → 1.08
      ratio 2.0+ (very overdue)     → 1.15–1.20 (high urgency cap)
    """
    if not sorted_years:
        return 0.5

    last_asked  = sorted_years[-1]
    current_gap = CURRENT_YEAR - last_asked

    if len(sorted_years) >= 2:
        gaps    = [sorted_years[i+1] - sorted_years[i] for i in range(len(sorted_years) - 1)]
        avg_gap = sum(gaps) / len(gaps)
    else:
        avg_gap = _DEFAULT_CYCLE_YEARS

    if avg_gap <= 0:
        avg_gap = 1.0

    ratio = current_gap / avg_gap

    if ratio <= 0:
        return 0.40
    elif ratio <= 1.0:
        # Smooth ramp: 0.40 → 1.00
        return 0.40 + ratio * 0.60
    elif ratio <= 2.0:
        # Overdue bonus: 1.00 → 1.15
        return 1.00 + (ratio - 1.0) * 0.15
    else:
        # Very overdue cap: 1.15 → 1.20
        return min(1.15 + (ratio - 2.0) * 0.025, 1.20)


def _max_consecutive(years: list[int]) -> int:
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
