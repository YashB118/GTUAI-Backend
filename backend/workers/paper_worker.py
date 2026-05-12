import logging
from database import get_supabase

logger = logging.getLogger(__name__)


def process_paper(paper_id: str):
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

        # Download PDF bytes from Supabase Storage
        file_bytes = supabase.storage.from_("question-papers").download(file_path)
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
            logger.info(f"Paper {paper_id}: no text layer — will use Gemini vision on raw PDF")

        questions = extract_questions_gemini(raw_text, subject_name, file_bytes=file_bytes)
        logger.info(f"Paper {paper_id}: extracted {len(questions)} questions")

        if not questions:
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
        supabase.table("question_papers").update(
            {"processing_status": "failed"}
        ).eq("id", paper_id).execute()
