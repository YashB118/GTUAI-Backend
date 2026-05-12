"""Post-generation answer quality verification."""
from __future__ import annotations


def verify_answer_quality(
    answer_text: str,
    marks: int,
    template: str,
    expected_keywords: list[str],
    rag_context: str = "",
) -> dict:
    word_count   = len(answer_text.split())
    target_words = marks * 40
    word_count_ok = 0.7 <= word_count / max(target_words, 1) <= 1.5

    keyword_hits     = sum(1 for kw in expected_keywords if kw.lower() in answer_text.lower())
    keyword_coverage = keyword_hits / max(len(expected_keywords), 1)

    has_conclusion = any(
        phrase in answer_text.lower()
        for phrase in ["conclusion", "hence", "therefore", "thus,", "in summary"]
    )

    issues: list[str] = []
    if not word_count_ok:
        issues.append(f"word count {word_count} vs target {target_words}")
    if keyword_coverage < 0.6:
        issues.append(f"keyword coverage {keyword_coverage:.0%}")
    if marks >= 7 and not has_conclusion:
        issues.append("missing conclusion for 7-mark answer")

    word_score    = 30 if word_count_ok else 0
    keyword_score = round(keyword_coverage * 50)
    conc_score    = 20 if has_conclusion else 0
    quality_score = word_score + keyword_score + conc_score

    return {
        "word_count":       word_count,
        "target_words":     target_words,
        "keyword_coverage": round(keyword_coverage, 2),
        "has_conclusion":   has_conclusion,
        "quality_score":    quality_score,
        "issues":           issues,
    }


def extract_expected_keywords(question_text: str, rag_context: str = "") -> list[str]:
    """Extract 5-8 technical keywords the examiner expects in the answer."""
    import re
    context_terms  = re.findall(r'\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b', rag_context)
    question_terms = re.findall(r'\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b', question_text)
    # Also pull ALL-CAPS acronyms
    acronyms = re.findall(r'\b[A-Z]{2,6}\b', question_text + " " + rag_context)
    combined = list(dict.fromkeys(question_terms + acronyms + context_terms))
    return combined[:8]
