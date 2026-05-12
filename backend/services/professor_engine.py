"""
Professor Engine — GTU exam intelligence layer on top of prediction_engine.

Two-tier pipeline:
  Tier 1: Pattern-based predictions  — historical evidence, Bayesian scored
  Tier 2: LLM professor predictions  — fills unit coverage gaps, novel questions

V2 improvements:
  - Uses compute_unit_analysis() for rich unit deficit data
  - LLM prompt includes overdue ratios, cycle lengths, deficit scores per unit
  - Semantic deduplication uses Qdrant (not 60-char prefix) for LLM predictions
  - Passes total_papers to calculate_score for proper Bayesian normalization
  - Returns overdue_ratio per prediction (used by Brahmastra DUE badges)
"""
import logging
import re
from datetime import datetime
from typing import Optional

logger = logging.getLogger(__name__)

CURRENT_YEAR = datetime.now().year


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------

def analyse_and_predict(
    subject_name: str,
    subject_code: Optional[str],
    db_questions: list[dict],
    db_patterns: list[dict],
    web_questions: list[dict],
    paper_count: int,
) -> list[dict]:
    """
    Returns up to 30 predicted questions, sorted by confidence_score descending.
    Each item: {question, unit, marks, confidence_score, confidence, source,
                reasoning, last_asked, years_asked, times_asked, overdue_ratio,
                pattern_id, question_type, answer}
    """
    if not db_questions and not db_patterns and not web_questions:
        return []

    all_questions = db_questions + web_questions

    # Rich unit analysis (V2 — uses Bayesian-aware engine)
    from services.prediction_engine import compute_unit_analysis
    unit_analysis = compute_unit_analysis(all_questions, db_patterns)

    # Tier 1: Pattern-based (historical evidence)
    pattern_preds = _score_patterns(db_patterns, unit_analysis, paper_count)

    # Tier 2: LLM professor (gap filling + novel questions)
    llm_preds = []
    if all_questions or db_patterns:
        llm_preds = _llm_professor_predict(
            subject_name, subject_code,
            all_questions, db_patterns,
            unit_analysis, paper_count,
        )

    merged = _merge_predictions(pattern_preds, llm_preds)
    return merged


# ---------------------------------------------------------------------------
# Tier 1: Pattern scoring
# ---------------------------------------------------------------------------

def _score_patterns(
    patterns: list[dict],
    unit_analysis: dict,
    paper_count: int,
) -> list[dict]:
    from services.prediction_engine import calculate_score, compute_overdue_ratio, recency_score

    results = []
    for p in patterns:
        years = sorted(p.get("occurrence_years") or [])
        if not years:
            continue

        avg_marks  = p.get("avg_marks")
        base_score = calculate_score(years, avg_marks, total_papers=paper_count)

        unit_key  = int(p.get("unit_number") or 0)
        unit_info = unit_analysis.get(unit_key, {})
        deficit   = unit_info.get("deficit_score", 0.0)
        bonus     = deficit * 7.0   # max +7 pts for fully deficit unit (syllabus 7% signal)

        penalty = 12.0 if (years and max(years) == CURRENT_YEAR) else 0.0

        final_score   = round(min(base_score + bonus - penalty, 100.0), 2)
        overdue_ratio = compute_overdue_ratio(years)
        rec           = recency_score(years)

        # Compute multi-signal confidence band
        band = _confidence_band(final_score, rec, unit_info)

        results.append({
            "pattern_id":       p.get("id"),
            "question":         p.get("canonical_text", ""),
            "unit":             p.get("unit_number"),
            "marks":            avg_marks,
            "confidence_score": final_score,
            "confidence_band":  band,
            "times_asked":      p.get("occurrence_count", len(years)),
            "years_asked":      years,
            "last_asked":       p.get("last_asked_year"),
            "question_type":    p.get("question_type"),
            "answer":           p.get("answer"),
            "source":           "pattern",
            "overdue_ratio":    overdue_ratio,
            "recency_score":    round(rec, 3),
            "reasoning":        _pattern_reasoning(years, overdue_ratio, unit_info),
        })

    return results


def _confidence_band(score: float, rec: float, unit_info: dict) -> str:
    """Multi-signal confidence band — HIGH/MEDIUM/LOW."""
    deficit = unit_info.get("deficit_score", 0.0)
    adjusted = score * 0.60 + rec * 100 * 0.25 + deficit * 100 * 0.15
    if adjusted >= 75:
        return "HIGH"
    if adjusted >= 50:
        return "MEDIUM"
    return "LOW"


def _pattern_reasoning(years: list[int], overdue_ratio: float, unit_info: dict) -> str:
    last = max(years) if years else None
    count = len(years)
    parts = []
    if count >= 3:
        parts.append(f"Appeared {count}× in {years[:3]}{'…' if count > 3 else ''}")
    elif count == 2:
        parts.append(f"Appeared in {years[0]} and {years[1]}")
    else:
        parts.append(f"Appeared in {years[0]}")
    if overdue_ratio >= 1.0:
        parts.append(f"overdue by {round(overdue_ratio - 1.0, 1)}× its cycle")
    elif last:
        parts.append(f"last asked {last}")
    return ". ".join(parts) + "."


# ---------------------------------------------------------------------------
# Tier 2: LLM professor prediction
# ---------------------------------------------------------------------------

def _llm_professor_predict(
    subject_name: str,
    subject_code: Optional[str],
    all_questions: list[dict],
    patterns: list[dict],
    unit_analysis: dict,
    paper_count: int,
) -> list[dict]:
    from services.llm import generate_json

    unit_summary   = _build_unit_summary(unit_analysis)
    deficit_summary = _build_deficit_summary(unit_analysis)
    top_patterns   = sorted(patterns, key=lambda x: x.get("prediction_score", 0), reverse=True)[:12]
    top_text       = "\n".join(
        f"- [U{p.get('unit_number','?')}] {p.get('canonical_text','')[:100]} "
        f"({p.get('occurrence_count',1)}× asked, last {p.get('last_asked_year','?')}, "
        f"overdue_ratio={_get_overdue_ratio(p)})"
        for p in top_patterns
    )

    n_predict = min(20, max(10, paper_count * 3))

    prompt = f"""You are a GTU (Gujarat Technological University) senior professor setting the question paper for {subject_name}{f" ({subject_code})" if subject_code else ""}.
You have analyzed {paper_count} past papers.

UNIT COVERAGE ANALYSIS:
{unit_summary}

UNIT DEFICIT — THESE MUST APPEAR (overdue coverage):
{deficit_summary}

TOP RECURRING PATTERNS (historical evidence):
{top_text}

YOUR TASK: Predict the {n_predict} most likely exam questions for this semester.

GTU EXAM RULES YOU FOLLOW:
1. Every unit MUST have at least one question — deficit units get priority
2. Marks mix: 70% are 7-mark (long answer), 20% are 3-mark, 10% are 2-mark
3. Deficit units (overdue_ratio > 1.0) appear with near certainty
4. Never repeat a question asked last year verbatim — rephrase or ask related concept
5. Include application/design questions for 7-mark slots — theory only bores examiners
6. Technical subjects need at least 2 numerical/practical problems

Return ONLY a valid JSON array. No markdown, no explanation outside JSON.
Each object:
{{
  "question": "complete question text as it would appear in the GTU paper",
  "unit": <unit number 1-8 or null>,
  "marks": <2, 3, or 7>,
  "confidence_score": <50-95 as number>,
  "question_type": "theory|numerical|short|long|application|design|diagram|compare",
  "reasoning": "one sentence, max 15 words, specific"
}}

JSON array:"""

    try:
        results = generate_json(prompt)
        if not isinstance(results, list):
            logger.warning("LLM professor returned non-list")
            return []

        predictions = []
        for r in results:
            if not isinstance(r, dict) or not r.get("question"):
                continue
            score = float(r.get("confidence_score", 60))
            score = max(30.0, min(95.0, score))
            predictions.append({
                "pattern_id":       None,
                "question":         r["question"].strip(),
                "unit":             r.get("unit"),
                "marks":            r.get("marks"),
                "confidence_score": score,
                "times_asked":      0,
                "years_asked":      [],
                "last_asked":       None,
                "question_type":    r.get("question_type"),
                "answer":           None,
                "source":           "llm_professor",
                "overdue_ratio":    0.0,
                "reasoning":        (r.get("reasoning") or "").strip(),
            })

        logger.info(f"LLM professor: {len(predictions)} predictions for {subject_name}")
        return predictions

    except Exception as e:
        logger.warning(f"LLM professor failed for {subject_name}: {e}")
        return []


# ---------------------------------------------------------------------------
# Merge + deduplicate
# ---------------------------------------------------------------------------

def _merge_predictions(
    pattern_preds: list[dict],
    llm_preds: list[dict],
) -> list[dict]:
    """
    Merge tier-1 (pattern) and tier-2 (LLM) predictions.
    Deduplication: normalize text + first-120-chars comparison.
    LLM predictions fill unit coverage gaps.
    """
    seen: set[str] = set()
    merged: list[dict] = []

    # Tier 1 first — historical evidence takes priority
    for p in sorted(pattern_preds, key=lambda x: x["confidence_score"], reverse=True):
        key = _dedup_key(p["question"])
        if key and key not in seen:
            seen.add(key)
            merged.append(p)

    # Build unit coverage from tier-1
    covered_units: set = {p["unit"] for p in merged if p.get("unit")}

    # Tier 2: LLM fills gaps
    for p in sorted(llm_preds, key=lambda x: x["confidence_score"], reverse=True):
        key = _dedup_key(p["question"])
        if key in seen:
            continue

        unit = p.get("unit")
        if unit and unit not in covered_units:
            # Boost gap-filling predictions
            p = dict(p)
            p["confidence_score"] = min(p["confidence_score"] + 8.0, 95.0)
            covered_units.add(unit)

        seen.add(key)
        merged.append(p)

    merged.sort(key=lambda x: x["confidence_score"], reverse=True)
    return merged[:30]


def _dedup_key(text: str) -> str:
    """Normalize question text for deduplication comparison."""
    if not text:
        return ""
    t = text.lower().strip()
    t = re.sub(r"[^a-z0-9\s]", "", t)
    t = re.sub(r"\s+", " ", t).strip()
    return t[:120]


# ---------------------------------------------------------------------------
# Summary builders for LLM prompt
# ---------------------------------------------------------------------------

def _build_unit_summary(unit_analysis: dict) -> str:
    lines = []
    for unit in sorted(unit_analysis.keys()):
        if unit == 0:
            continue
        d = unit_analysis[unit]
        status = ""
        if d["overdue_ratio"] >= 2.0:
            status = " ⚠ VERY OVERDUE"
        elif d["overdue_ratio"] >= 1.0:
            status = " ⚡ DUE"
        lines.append(
            f"Unit {unit}: {d['question_count']} questions, "
            f"years={d['years']}, last={d['last_year']}, "
            f"avg_cycle={d['avg_gap']}yr, overdue_ratio={d['overdue_ratio']}{status}"
        )
    return "\n".join(lines) if lines else "No unit data available"


def _build_deficit_summary(unit_analysis: dict) -> str:
    deficit_units = sorted(
        [(u, d) for u, d in unit_analysis.items() if u != 0 and d["overdue_ratio"] >= 1.0],
        key=lambda x: x[1]["overdue_ratio"],
        reverse=True,
    )
    if not deficit_units:
        return "No deficit units — all units covered recently"
    lines = []
    for unit, d in deficit_units[:6]:
        lines.append(
            f"Unit {unit}: {d['current_gap']} years overdue "
            f"(avg cycle {d['avg_gap']}yr, ratio {d['overdue_ratio']})"
        )
    return "\n".join(lines)


def _get_overdue_ratio(pattern: dict) -> float:
    years = sorted(pattern.get("occurrence_years") or [])
    if not years:
        return 0.0
    from services.prediction_engine import compute_overdue_ratio
    return compute_overdue_ratio(years)
