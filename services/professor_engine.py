"""
Professor Engine — uses Groq to reason like an experienced GTU examiner.

Takes all available question data (DB + web) and returns:
- Gap analysis: which units/topics haven't appeared recently
- Novel predictions: new questions likely based on syllabus coverage
- Confidence reasoning: why each question is likely
"""
import logging
from collections import defaultdict
from datetime import datetime
from typing import Optional

logger = logging.getLogger(__name__)

CURRENT_YEAR = datetime.now().year


def analyse_and_predict(
    subject_name: str,
    subject_code: Optional[str],
    db_questions: list[dict],
    db_patterns: list[dict],
    web_questions: list[dict],
    paper_count: int,
) -> list[dict]:
    """
    Core professor analysis. Returns a list of predicted questions with scores.
    Each item: {question, unit, marks, confidence_score, confidence, source, reasoning}
    """
    if not db_questions and not db_patterns and not web_questions:
        return []

    # --- Step 1: Build question pool ---
    all_questions = db_questions + web_questions
    unit_map = _build_unit_map(all_questions, db_patterns)

    # --- Step 2: Gap analysis ---
    gaps = _gap_analysis(unit_map)

    # --- Step 3: Pattern-based predictions (enhanced scoring) ---
    pattern_predictions = _score_patterns(db_patterns, gaps, paper_count)

    # --- Step 4: LLM professor prediction ---
    llm_predictions = []
    if db_questions or web_questions:
        llm_predictions = _llm_professor_predict(
            subject_name, subject_code,
            all_questions, db_patterns,
            unit_map, gaps, paper_count,
        )

    # --- Step 5: Merge & deduplicate ---
    merged = _merge_predictions(pattern_predictions, llm_predictions)
    return merged


def _build_unit_map(questions: list[dict], patterns: list[dict]) -> dict:
    """
    Returns: {unit_number: {questions, last_year, years, marks_distribution}}
    """
    unit_map = defaultdict(lambda: {
        "questions": [],
        "years": set(),
        "last_year": None,
        "marks": [],
        "types": [],
    })

    for q in questions:
        unit = q.get("unit") or q.get("unit_number")
        year = q.get("year")
        marks = q.get("marks")
        unit_key = int(unit) if unit else 0

        entry = unit_map[unit_key]
        entry["questions"].append(q.get("text", ""))
        if year:
            entry["years"].add(int(year))
            if entry["last_year"] is None or int(year) > entry["last_year"]:
                entry["last_year"] = int(year)
        if marks:
            entry["marks"].append(marks)
        if q.get("type") or q.get("question_type"):
            entry["types"].append(q.get("type") or q.get("question_type"))

    for p in patterns:
        unit = p.get("unit_number")
        unit_key = int(unit) if unit else 0
        years = p.get("occurrence_years") or []
        if years:
            last = max(years)
            if unit_map[unit_key]["last_year"] is None or last > unit_map[unit_key]["last_year"]:
                unit_map[unit_key]["last_year"] = last
            unit_map[unit_key]["years"].update(years)

    return dict(unit_map)


def _gap_analysis(unit_map: dict) -> dict:
    """
    Identifies which units haven't been asked in >= 2 years.
    Returns: {unit: gap_years, ...} only for units with gap >= 2
    """
    gaps = {}
    for unit, data in unit_map.items():
        last = data.get("last_year")
        if last is None:
            gaps[unit] = 5  # Never asked — very likely
        else:
            gap = CURRENT_YEAR - last
            if gap >= 2:
                gaps[unit] = gap
    return gaps


def _score_patterns(patterns: list[dict], gaps: dict, paper_count: int) -> list[dict]:
    """Enhanced scoring on existing patterns with gap bonus."""
    from services.prediction_engine import calculate_score

    results = []
    for p in patterns:
        years = sorted(p.get("occurrence_years") or [])
        if len(years) < 1:
            continue

        base_score = p.get("prediction_score") or calculate_score(years, p.get("avg_marks"))

        # Unit gap bonus
        unit = p.get("unit_number")
        unit_key = int(unit) if unit else 0
        gap = gaps.get(unit_key, 0)
        gap_bonus = min(gap * 5, 20) if gap >= 2 else 0

        # Staleness penalty: if asked THIS year already, reduce score
        penalty = 0
        if years and max(years) == CURRENT_YEAR:
            penalty = 15  # Already asked this year, less likely to repeat

        final_score = min(base_score + gap_bonus - penalty, 100)
        final_score = max(final_score, 0)

        results.append({
            "pattern_id": p.get("id"),
            "question": p.get("canonical_text", ""),
            "unit": unit,
            "marks": p.get("avg_marks"),
            "confidence_score": final_score,
            "times_asked": p.get("occurrence_count", len(years)),
            "years_asked": years,
            "last_asked": p.get("last_asked_year"),
            "question_type": p.get("question_type"),
            "answer": p.get("answer"),
            "source": "pattern",
            "gap_bonus": gap_bonus,
        })

    return results


def _llm_professor_predict(
    subject_name: str,
    subject_code: Optional[str],
    all_questions: list[dict],
    patterns: list[dict],
    unit_map: dict,
    gaps: dict,
    paper_count: int,
) -> list[dict]:
    """
    Uses Groq to reason like a GTU examiner and generate novel predictions.
    Returns list of question dicts with confidence scores.
    """
    from services.llm import generate_json, generate_text

    # Build a concise summary of what exists (avoid token overflow)
    unit_summary = _build_unit_summary(unit_map, patterns)
    gap_summary = ", ".join(
        f"Unit {u} (not asked for {g} years)" for u, g in sorted(gaps.items()) if u != 0
    ) or "No major gaps detected"

    # Top patterns (most frequent)
    top_patterns = sorted(patterns, key=lambda x: x.get("prediction_score", 0), reverse=True)[:15]
    top_text = "\n".join(
        f"- [{p.get('unit_number') or '?'}] {p.get('canonical_text', '')[:120]} "
        f"(asked {p.get('occurrence_count', 1)}x in {p.get('occurrence_years', [])})"
        for p in top_patterns
    )

    prompt = f"""You are an experienced GTU (Gujarat Technological University) professor who has been setting question papers for {subject_name}{f" ({subject_code})" if subject_code else ""} for 15 years.

HISTORICAL DATA ({paper_count} papers analyzed):
{unit_summary}

TOP RECURRING QUESTIONS:
{top_text}

UNIT COVERAGE GAPS (topics likely to appear this exam):
{gap_summary}

YOUR TASK:
Based on GTU exam patterns, predict the {min(20, max(10, paper_count * 3))} most likely exam questions.

GTU PROFESSOR RULES YOU FOLLOW:
1. Cover ALL units in the paper (usually 5-8 units per subject)
2. Include mix of marks: 7-mark (long answer, 2 questions/unit), 3-mark (short, conceptual), 2-mark (definition/fill)
3. Prioritize topics from GAP units - they MUST appear after a gap
4. Include 2-3 "perennial" questions that appear almost every year
5. Add 2-3 "application/design" type questions testing deep understanding
6. Consider what advanced topics students would be expected to know in industry
7. Avoid asking the exact same question that appeared last year (paraphrase or related topic)
8. For technical subjects: include numerical/practical questions

Return ONLY a valid JSON array. No markdown, no explanation.
Each object must have:
{{
  "question": "complete question text as it would appear in GTU paper",
  "unit": <unit number 1-8 or null>,
  "marks": <2, 3, or 7>,
  "confidence_score": <50-95 as float, your confidence this will appear>,
  "question_type": "theory|numerical|short|long|fill|application|design",
  "reasoning": "brief reason why this is likely (max 20 words)"
}}

JSON array of predictions:"""

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
                "pattern_id": None,
                "question": r["question"].strip(),
                "unit": r.get("unit"),
                "marks": r.get("marks"),
                "confidence_score": score,
                "times_asked": 0,
                "years_asked": [],
                "last_asked": None,
                "question_type": r.get("question_type"),
                "answer": None,
                "source": "llm_professor",
                "reasoning": r.get("reasoning", ""),
            })

        logger.info(f"LLM professor generated {len(predictions)} predictions for {subject_name}")
        return predictions

    except Exception as e:
        logger.warning(f"LLM professor prediction failed: {e}")
        return []


def _build_unit_summary(unit_map: dict, patterns: list[dict]) -> str:
    lines = []
    for unit in sorted(unit_map.keys()):
        if unit == 0:
            continue
        data = unit_map[unit]
        q_count = len(data["questions"])
        last = data.get("last_year") or "never"
        years_list = sorted(data.get("years", set()))
        lines.append(
            f"Unit {unit}: {q_count} questions total, "
            f"years: {years_list if years_list else 'none'}, "
            f"last asked: {last}"
        )
    return "\n".join(lines) if lines else "No unit data available"


def _merge_predictions(pattern_preds: list[dict], llm_preds: list[dict]) -> list[dict]:
    """
    Merge pattern-based and LLM predictions.
    Deduplicate by semantic similarity (simple: first 60 chars).
    LLM predictions fill gaps in units not covered by patterns.
    """
    seen_texts = set()
    merged = []

    # Pattern predictions first (they have historical evidence)
    for p in sorted(pattern_preds, key=lambda x: x["confidence_score"], reverse=True):
        key = p["question"][:60].lower().strip()
        if key and key not in seen_texts:
            seen_texts.add(key)
            merged.append(p)

    # LLM predictions: add those covering units not yet represented
    # or boosting overall coverage
    covered_units = {p["unit"] for p in merged if p.get("unit")}

    for p in sorted(llm_preds, key=lambda x: x["confidence_score"], reverse=True):
        key = p["question"][:60].lower().strip()
        if key in seen_texts:
            continue

        unit = p.get("unit")
        is_gap_unit = unit not in covered_units

        # Boost score for gap-filling LLM predictions
        if is_gap_unit and unit:
            p = dict(p)
            p["confidence_score"] = min(p["confidence_score"] + 10, 95)
            covered_units.add(unit)

        seen_texts.add(key)
        merged.append(p)

    # Final sort
    merged.sort(key=lambda x: x["confidence_score"], reverse=True)
    return merged[:30]  # Top 30
