import logging
import threading
import time
from database import get_supabase, get_storage_client

logger = logging.getLogger(__name__)

_MAX_RETRIES  = 3
_RETRY_DELAY  = 3  # seconds between LLM retries

# Serialise all paper processing — prevents concurrent model init crashes
# and Groq rate-limit bursts when multiple papers upload simultaneously.
_PROCESS_LOCK = threading.Semaphore(1)


def process_paper(paper_id: str):
    with _PROCESS_LOCK:
        _process_paper_inner(paper_id)


def _process_paper_inner(paper_id: str):
    """
    Sync background task (runs in FastAPI thread pool):
    Downloads the PDF, extracts questions via Gemini,
    embeds via sentence-transformers, stores in Qdrant + DB,
    then runs pattern analysis.
    """
    supabase = get_supabase()

    try:
        # Mark as processing
        supabase.table("question_papers").update(
            {"processing_status": "processing"}
        ).eq("id", paper_id).execute()

        # Fetch paper + subject name
        paper_res = (
            supabase.table("question_papers")
            .select("*, subjects(name)")
            .eq("id", paper_id)
            .single()
            .execute()
        )
        paper = paper_res.data
        if not paper:
            raise ValueError(f"Paper {paper_id} not found in DB")

        subject_name = (paper.get("subjects") or {}).get("name", "Unknown Subject")
        file_path = paper["file_url"]
        subject_id = paper["subject_id"]
        year = paper.get("year")

        # Download PDF bytes — use dedicated storage client (service key guaranteed)
        storage = get_storage_client()
        file_bytes = storage.storage.from_("question-papers").download(file_path)
        if not file_bytes:
            raise ValueError("Downloaded empty file from storage")

        from services.pdf_processor import (
            extract_text,
            extract_questions_gemini,
            embed_text,
            store_in_qdrant,
            ensure_collection,
        )

        ensure_collection()

        raw_text = extract_text(file_bytes)
        if not raw_text.strip():
            logger.info(f"Paper {paper_id}: no text layer — will use Gemini vision")

        questions = _extract_with_retry(raw_text, subject_name, file_bytes, paper_id)
        logger.info(f"Paper {paper_id}: extracted {len(questions)} questions")

        if not questions:
            logger.warning(f"Paper {paper_id}: extraction returned 0 questions — marking done with 0")
            supabase.table("question_papers").update({
                "processing_status": "done",
                "question_count": 0,
            }).eq("id", paper_id).execute()
            return

        stored = 0
        for q in questions:
            text = (q.get("text") or "").strip()
            if not text:
                continue

            embedding = embed_text(text)
            embedding_id = store_in_qdrant(text, embedding, {
                "subject_id": subject_id,
                "year": year,
                "marks": q.get("marks"),
                "unit": q.get("unit"),
                "type": q.get("type"),
                "paper_id": paper_id,
            })

            supabase.table("questions").insert({
                "paper_id": paper_id,
                "subject_id": subject_id,
                "text": text,
                "marks": q.get("marks"),
                "unit_number": q.get("unit"),
                "question_type": q.get("type"),
                "embedding_id": embedding_id,
            }).execute()
            stored += 1

        # Run pattern analysis and generate answers for predicted questions
        from services.prediction_engine import run_pattern_analysis, generate_answers_for_subject
        run_pattern_analysis(supabase, paper_id, subject_id)
        generate_answers_for_subject(supabase, subject_id)

        supabase.table("question_papers").update({
            "processing_status": "done",
            "question_count": stored,
        }).eq("id", paper_id).execute()

        # Shared KB: invalidate predictions cache so all students see updated patterns
        # immediately (instead of waiting up to 3 days for natural TTL expiry)
        try:
            supabase.table("predictions").delete().eq("subject_id", subject_id).execute()
        except Exception as e:
            logger.warning(f"Could not invalidate predictions cache for {subject_id}: {e}")

        logger.info(f"Paper {paper_id}: processing complete ({stored} questions stored)")

    except Exception as e:
        logger.error(f"Paper {paper_id}: processing failed — {e}", exc_info=True)
        try:
            supabase.table("question_papers").update(
                {"processing_status": "failed"}
            ).eq("id", paper_id).execute()
        except Exception:
            pass


def _extract_with_retry(raw_text: str, subject_name: str, file_bytes: bytes, paper_id: str) -> list:
    """
    Retry question extraction up to _MAX_RETRIES times.
    On each failure, waits _RETRY_DELAY seconds before retrying.
    Falls back to a simpler prompt on the last attempt.
    """
    from services.pdf_processor import extract_questions_gemini

    last_exc = None
    for attempt in range(1, _MAX_RETRIES + 1):
        try:
            result = extract_questions_gemini(raw_text, subject_name, file_bytes=file_bytes)
            if isinstance(result, list) and result:
                return result
            if attempt < _MAX_RETRIES:
                logger.warning(f"Paper {paper_id}: attempt {attempt} returned empty list — retrying")
                time.sleep(_RETRY_DELAY)
        except Exception as e:
            last_exc = e
            logger.warning(f"Paper {paper_id}: extraction attempt {attempt} failed: {e}")
            if attempt < _MAX_RETRIES:
                time.sleep(_RETRY_DELAY)

    # Last resort: simple line-by-line extraction without LLM JSON
    logger.warning(f"Paper {paper_id}: all LLM attempts failed ({last_exc}) — using regex fallback")
    return _regex_extract_questions(raw_text)


def _regex_extract_questions(raw_text: str) -> list:
    """
    Regex fallback when LLM extraction fails completely.
    Extracts numbered questions from plain text.
    """
    import re
    questions = []
    # Match patterns like: "Q1.", "1.", "(1)", "Q.1", lines starting with numbers
    pattern = re.compile(
        r'(?:^|\n)\s*(?:Q\.?\s*)?(\d+)[.)]\s*(.+?)(?=\n\s*(?:Q\.?\s*)?\d+[.)]\s*|\Z)',
        re.DOTALL | re.IGNORECASE,
    )
    for m in pattern.finditer(raw_text):
        text = m.group(2).strip()
        text = re.sub(r'\s+', ' ', text)
        if len(text) > 15:  # skip very short fragments
            # Try to detect marks from trailing "(X marks)" or "[X]"
            marks = None
            marks_m = re.search(r'\((\d+)\s*(?:marks?|M)\)', text, re.IGNORECASE)
            if marks_m:
                marks = int(marks_m.group(1))
                text = text[:marks_m.start()].strip()
            questions.append({"text": text, "marks": marks, "unit": None, "type": "theory"})
    return questions
