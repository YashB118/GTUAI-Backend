import logging
import re
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


def _get_embedder():
    from services.pdf_processor import get_embedder
    return get_embedder()


def _get_qdrant():
    from services.pdf_processor import get_qdrant
    return get_qdrant()


def retrieve_context(question: str, subject_id: str, limit: int = 8) -> tuple[str, list[str]]:
    """
    Semantic search in gtu_study_materials for chunks relevant to the question.
    Returns (context_string, list_of_material_ids).
    Returns ("", []) if no material collection or no results.
    """
    from qdrant_client.models import Filter, FieldCondition, MatchValue

    client = _get_qdrant()
    existing = [c.name for c in client.get_collections().collections]
    if "gtu_study_materials" not in existing:
        return "", []

    embedder = _get_embedder()
    query_embedding = embedder.encode(question, show_progress_bar=False).tolist()

    try:
        results = client.search(
            collection_name="gtu_study_materials",
            query_vector=query_embedding,
            query_filter=Filter(
                must=[FieldCondition(
                    key="subject_id",
                    match=MatchValue(value=subject_id),
                )]
            ),
            limit=limit,
            score_threshold=0.5,  # raised from 0.3 to cut irrelevant context
        )
    except Exception as e:
        logger.warning(f"Context retrieval failed: {e}")
        return "", []

    if not results:
        return "", []

    context_parts: list[str] = []
    seen_ids: list[str] = []
    for r in results:
        context_parts.append(r.payload.get("text", ""))
        mat_id = r.payload.get("material_id", "")
        if mat_id and mat_id not in seen_ids:
            seen_ids.append(mat_id)

    return "\n\n---\n\n".join(context_parts), seen_ids


def _resolve_source_titles(supabase, material_ids: list[str]) -> list[str]:
    if not material_ids:
        return []
    try:
        res = (
            supabase.table("study_materials")
            .select("id, title")
            .in_("id", material_ids)
            .execute()
        )
        id_to_title = {str(m["id"]): m["title"] for m in (res.data or [])}
        return [id_to_title.get(mid, "Study Material") for mid in material_ids]
    except Exception as e:
        logger.warning(f"Could not resolve source titles: {e}")
        return []


def _build_prompt(question: str, context: str, marks: int) -> str:
    from services.gtu_style_guide import build_gtu_system_prompt, style_block, question_type_hint
    from services.question_intent import detect_question_intent
    from services.answer_quality import extract_expected_keywords

    word_limit = marks * 40
    intent     = detect_question_intent(question)
    keywords   = extract_expected_keywords(question, context)
    template   = intent.template

    # Temperature hint string (not used in prompt itself but available to caller)
    _TEMPERATURE_BY_TEMPLATE = {
        "definition":  0.15,
        "list":        0.15,
        "derivation":  0.10,
        "numerical":   0.05,
        "code":        0.20,
        "comparison":  0.25,
        "explanation": 0.30,
        "diagram_only": 0.15,
    }

    context_block = (
        "CONTEXT BLOCK (ground your answer in this — quote definitions verbatim where possible):\n"
        f"{context}\n\n"
        "ACCURACY RULE: Only state facts supported by the Context Block above.\n"
        "If a formula or value is not in the context, write 'Refer textbook for exact formula.'\n"
        "Do NOT invent numerical values, formulas, or circuit specifications.\n\n"
        if context else ""
    )

    system_prompt = build_gtu_system_prompt(template, marks, keywords)
    type_hint     = question_type_hint(question)

    tier_label = f"{marks}-mark" + (" (treat as 7+ mark tier)" if marks >= 7 else "")
    code_policy = (
        "CODE EXAMPLE POLICY:\n"
        "- Include a correct, concise code example in a fenced block with language tag.\n"
        "- Keep code exam-suitable (short, readable, no unnecessary boilerplate).\n"
        "- After code, include a short dry-run/sample input-output.\n\n"
    ) if intent.requires_code_example else ""

    kw_str = ", ".join(f"**{k}**" for k in keywords) if keywords else ""
    kw_block = (
        f"MANDATORY KEYWORDS — these terms MUST appear in your answer (bold them):\n{kw_str}\n\n"
        if kw_str else ""
    )

    return f"""{system_prompt}

{type_hint}

{code_policy}{kw_block}{context_block}Question: {question}

FINAL INSTRUCTIONS:
- Soft target word count: ~{word_limit} words (GTU norm: ~40 words per mark).
- Follow the rubric and exemplar structure above precisely.
- Bold every key technical term using **term**.
- No preamble like "Here is the answer" — start directly with the definition / first point.
- If the topic is visual, you MUST include a `Diagram: [labelled diagram of ...]` placeholder.
- End with a one-line `Conclusion:` (or `Answer:` for numericals).
- Output in this exact order with markdown headings:
  1) `### Expected Question Format`
  2) `### How to Write`
  3) `### Ready-to-Write Answer`

Write the GTU topper-style answer now:"""


def _extract_section(text: str, heading: str) -> str:
    pattern = (
        rf"(?is)###\s*{re.escape(heading)}\s*(.*?)"
        rf"(?=(?:\n###\s*[^\n]+)|\Z)"
    )
    m = re.search(pattern, text)
    return (m.group(1).strip() if m else "")


def _extract_code_example(text: str) -> str:
    m = re.search(r"(?is)```[a-zA-Z0-9_+-]*\n(.*?)```", text)
    if not m:
        return ""
    return m.group(1).strip()


def _build_fallback_answer(question_text: str, marks: int) -> str:
    return (
        "### Expected Question Format\n"
        f"Q. {question_text}\n\n"
        "### How to Write\n"
        f"- Start with a concise definition (for {marks} marks).\n"
        "- Write key points in numbered format.\n"
        "- Add one practical example and close with a conclusion.\n\n"
        "### Ready-to-Write Answer\n"
        "Definition: [Write the core concept in one line].\n"
        "1. Key point one.\n"
        "2. Key point two.\n"
        "3. Key point three.\n"
        "Example: [Use a GTU-relevant technical example].\n"
        "Conclusion: [One-line takeaway]."
    )


def _structured_payload(answer_text: str) -> dict:
    expected_question_format = _extract_section(answer_text, "Expected Question Format")
    how_to_write = _extract_section(answer_text, "How to Write")
    ready_to_write_answer = _extract_section(answer_text, "Ready-to-Write Answer")
    code_example = _extract_code_example(answer_text)
    return {
        "expected_question_format": expected_question_format or None,
        "how_to_write": how_to_write or None,
        "ready_to_write_answer": ready_to_write_answer or None,
        "code_example": code_example or None,
    }


def generate_answer(
    supabase,
    question_text: str,
    subject_id: str,
    marks: int = 7,
    pattern_id: str | None = None,
) -> dict:
    """
    Generate a GTU-style answer with optional RAG context.
    Caches result in the `answers` table when pattern_id is provided.
    Returns {"answer": str, "sources": list[str], "cached": bool}.
    """
    from services.llm import generate_text, is_groq_available

    # Return cached answer if available
    if pattern_id:
        cached_res = (
            supabase.table("answers")
            .select("content, source_titles, quality_score, keyword_coverage, template_used")
            .eq("pattern_id", pattern_id)
            .order("generated_at", desc=True)
            .limit(1)
            .execute()
        )
        if cached_res.data:
            row = cached_res.data[0]
            return {
                "answer":  row["content"],
                "sources": row.get("source_titles") or [],
                "cached":  True,
                "quality": {
                    "quality_score":    row.get("quality_score"),
                    "keyword_coverage": row.get("keyword_coverage"),
                    "template_used":    row.get("template_used"),
                },
                **_structured_payload(row["content"]),
            }

    context, source_ids = retrieve_context(question_text, subject_id)
    source_titles = _resolve_source_titles(supabase, source_ids)
    prompt = _build_prompt(question_text, context, marks)
    is_fallback = False
    try:
        answer_text = generate_text(prompt, temperature=0.35, max_tokens=2048)
    except Exception as e:
        logger.warning(f"LLM generation failed, returning structured fallback: {e}")
        answer_text = _build_fallback_answer(question_text, marks)
        is_fallback = True

    # Never cache fallback answers — they pollute the cache with placeholder text
    if pattern_id and not is_fallback:
        from services.answer_quality import verify_answer_quality, extract_expected_keywords
        from services.question_intent import detect_question_intent
        model_used = "groq-llama" if is_groq_available() else "gemini"
        intent   = detect_question_intent(question_text)
        keywords = extract_expected_keywords(question_text, context)
        quality  = verify_answer_quality(answer_text, marks, intent.template, keywords, context)
        try:
            supabase.table("answers").insert({
                "pattern_id":          pattern_id,
                "question_text":       question_text,
                "subject_id":          subject_id,
                "marks":               marks,
                "content":             answer_text,
                "word_count":          len(answer_text.split()),
                "source_material_ids": source_ids if source_ids else None,
                "source_titles":       source_titles if source_titles else None,
                "model_used":          model_used,
                "quality_score":       quality["quality_score"],
                "template_used":       intent.template,
                "keyword_coverage":    quality["keyword_coverage"],
            }).execute()
        except Exception as e:
            logger.warning(f"Failed to cache answer for pattern {pattern_id}: {e}")

    from services.answer_quality import verify_answer_quality, extract_expected_keywords
    from services.question_intent import detect_question_intent
    intent   = detect_question_intent(question_text)
    keywords = extract_expected_keywords(question_text, context)
    quality  = verify_answer_quality(answer_text, marks, intent.template, keywords, context)

    return {
        "answer":           answer_text,
        "sources":          source_titles,
        "cached":           False,
        "is_fallback":      is_fallback,
        "quality":          quality,
        **_structured_payload(answer_text),
    }
