import json
import logging
from typing import Generator
import google.generativeai as genai
from services.pdf_processor import get_embedder, get_qdrant
from config import settings

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are GTU GPT — an AI exam assistant built specifically for \
Gujarat Technological University (GTU) students.

Your role:
- Answer exam questions in GTU format (marks-based, precise, well-structured)
- Use context from the student's own study materials when provided
- Reference past question patterns to highlight frequently asked topics
- When asked to predict, pull from the pattern data provided
- Always use GTU-standard terminology

Answer format rules:
- For 2-mark questions: 2–3 precise sentences
- For 3-mark questions: 3 key points or a short definition + example
- For 7-mark questions: use numbered sections with headings
- Bold **key terms**
- If a diagram is needed, describe it in text: [Diagram: ...]
- Never start with "Here is the answer" or filler phrases

If the student asks something unrelated to their subject or exam, politely redirect."""


def _build_context(subject_id: str, user_message: str) -> tuple[str, list[dict]]:
    """Retrieve relevant chunks from Qdrant. Returns (context_text, sources)."""
    try:
        embedder = get_embedder()
        qdrant = get_qdrant()
        query_vector = embedder.encode(user_message, show_progress_bar=False).tolist()
    except Exception as e:
        logger.warning(f"Embedding failed: {e}")
        return "", []

    from qdrant_client.models import Filter, FieldCondition, MatchValue
    subject_filter = Filter(must=[FieldCondition(key="subject_id", match=MatchValue(value=subject_id))])

    context_parts: list[str] = []
    sources: list[dict] = []

    try:
        mat_results = qdrant.search(
            collection_name="gtu_study_materials",
            query_vector=query_vector,
            query_filter=subject_filter,
            limit=4,
            score_threshold=0.45,
        )
        for r in mat_results:
            context_parts.append(
                f"[Study Material — {r.payload.get('title', 'Notes')}, p.{r.payload.get('page', '?')}]\n"
                f"{r.payload.get('text', '')}"
            )
            sources.append({
                "title": r.payload.get("title", "Study Material"),
                "page": r.payload.get("page"),
                "material_id": r.payload.get("material_id"),
            })
    except Exception:
        pass

    try:
        q_results = qdrant.search(
            collection_name="gtu_questions",
            query_vector=query_vector,
            query_filter=subject_filter,
            limit=3,
            score_threshold=0.55,
        )
        if q_results:
            past_qs = "\n".join(
                f"- {r.payload.get('text', '')} ({r.payload.get('year', '')})"
                for r in q_results
            )
            context_parts.append(f"[Past Exam Questions on this topic]\n{past_qs}")
    except Exception:
        pass

    return "\n\n".join(context_parts), sources


def _get_pattern_summary(supabase, subject_id: str) -> str:
    """Top predicted questions for the subject — injected into system context."""
    try:
        res = (
            supabase.table("question_patterns")
            .select("canonical_text, prediction_score, occurrence_years, unit_number")
            .eq("subject_id", subject_id)
            .gte("occurrence_count", 2)
            .order("prediction_score", desc=True)
            .limit(10)
            .execute()
        )
        patterns = res.data or []
        if not patterns:
            return ""
        lines = []
        for p in patterns:
            years = ", ".join(str(y) for y in sorted(p.get("occurrence_years") or []))
            lines.append(
                f"- [{p.get('prediction_score', 0):.0f}% likely] {p['canonical_text']} (asked in: {years})"
            )
        return "Top predicted questions for this subject:\n" + "\n".join(lines)
    except Exception:
        return ""


def stream_chat_response(
    supabase,
    session_id: str,
    subject_id: str,
    user_message: str,
    history: list[dict],
) -> Generator[str, None, None]:
    """Yield SSE data chunks for the frontend stream reader."""
    if not settings.gemini_api_key:
        yield "data: " + json.dumps({"error": "GTU GPT not configured (missing Gemini API key)"}) + "\n\n"
        return

    genai.configure(api_key=settings.gemini_api_key)

    context_text, sources = _build_context(subject_id, user_message)
    pattern_summary = _get_pattern_summary(supabase, subject_id)

    system = SYSTEM_PROMPT
    if pattern_summary:
        system += f"\n\n{pattern_summary}"
    if context_text:
        system += f"\n\nRelevant context from student's study materials:\n{context_text}"

    model = genai.GenerativeModel(settings.gemini_model, system_instruction=system)

    contents = []
    for msg in history[-10:]:
        role = "model" if msg["role"] == "assistant" else "user"
        contents.append({
            "role": role,
            "parts": [{"text": msg["content"]}],
        })
    contents.append({"role": "user", "parts": [{"text": user_message}]})

    full_response: list[str] = []
    try:
        stream = model.generate_content(
            contents,
            stream=True,
            generation_config={"temperature": 0.4, "max_output_tokens": 2048},
        )
        for chunk in stream:
            if chunk.text:
                full_response.append(chunk.text)
                yield "data: " + json.dumps({"token": chunk.text}) + "\n\n"

        # Attempt to generate 3 follow-up question suggestions
        suggestions: list[str] = []
        try:
            suggest_prompt = (
                f'Based on the student\'s question: "{user_message}" and the subject context, '
                "suggest 3 short follow-up GTU exam questions. "
                "Return ONLY a JSON array of 3 strings. No explanation."
            )
            suggest_resp = model.generate_content(
                suggest_prompt,
                generation_config={"temperature": 0.5, "max_output_tokens": 256},
            )
            raw = suggest_resp.text.strip()
            # Strip markdown code fences if present
            if raw.startswith("```"):
                raw = raw.split("```")[1]
                if raw.startswith("json"):
                    raw = raw[4:]
            suggestions = json.loads(raw)
            if not isinstance(suggestions, list):
                suggestions = []
        except Exception:
            pass

        payload: dict = {"done": True}
        if sources:
            payload["sources"] = sources
        if suggestions:
            payload["suggestions"] = suggestions[:3]
        yield "data: " + json.dumps(payload) + "\n\n"

        # Persist assistant message
        assistant_content = "".join(full_response)
        supabase.table("chat_messages").insert({
            "session_id": session_id,
            "role": "assistant",
            "content": assistant_content,
            "sources": sources if sources else None,
        }).execute()

        # Update session timestamp
        from datetime import datetime, timezone
        supabase.table("chat_sessions").update(
            {"updated_at": datetime.now(timezone.utc).isoformat()}
        ).eq("id", session_id).execute()

    except Exception as e:
        logger.error(f"GTU GPT stream error: {e}", exc_info=True)
        yield "data: " + json.dumps({"error": "Generation failed. Try again."}) + "\n\n"
