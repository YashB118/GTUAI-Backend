import logging
from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Request
from database import get_supabase
from middleware.auth import get_current_user
from middleware.limiter import limiter
from workers.paper_worker import process_paper

router = APIRouter(prefix="/predictions", tags=["predictions"])
logger = logging.getLogger(__name__)


def _confidence_label(score: float) -> str:
    if score >= 72:
        return "HIGH"
    if score >= 50:
        return "MEDIUM"
    return "LOW"


def _build_response_item(p: dict) -> dict:
    score = p.get("confidence_score", p.get("prediction_score", 0))
    return {
        "pattern_id": p.get("pattern_id"),
        "question": p.get("question", ""),
        "prediction_score": round(score, 1),
        "confidence": _confidence_label(score),
        "times_asked": p.get("times_asked", 0),
        "years_asked": p.get("years_asked", []),
        "last_asked": p.get("last_asked"),
        "expected_marks": p.get("marks") or p.get("expected_marks"),
        "unit": p.get("unit"),
        "question_type": p.get("question_type"),
        "answer": p.get("answer"),
        "source": p.get("source", "pattern"),
        "reasoning": p.get("reasoning", ""),
    }


@router.get("/{subject_id}")
@limiter.limit("30/minute")
async def get_predictions(
    request: Request,
    subject_id: str,
    exam_type: Optional[str] = None,
    force_refresh: bool = False,
    user=Depends(get_current_user),
):
    supabase = get_supabase()
    now_iso = datetime.now(timezone.utc).isoformat()

    # Serve from cache unless force_refresh
    if not force_refresh:
        cached_res = (
            supabase.table("predictions")
            .select("*")
            .eq("subject_id", subject_id)
            .gt("valid_until", now_iso)
            .order("generated_at", desc=True)
            .limit(1)
            .execute()
        )
        if cached_res.data:
            cached = cached_res.data[0]
            pqs = cached.get("predicted_questions") or []
            return {
                "subject_id": subject_id,
                "predictions": pqs if isinstance(pqs, list) else [],
                "paper_count": cached.get("paper_count_used", 0),
                "from_cache": True,
                "generated_at": cached.get("generated_at"),
                "sources": ["db_patterns"],
            }

    # ── Fetch all data in parallel ──────────────────────────────────────────

    # Subject info (name, code)
    subj_res = supabase.table("subjects").select("name, code").eq("id", subject_id).maybe_single().execute()
    subject = subj_res.data or {}
    subject_name = subject.get("name", "Unknown")
    subject_code = subject.get("code")

    # All papers + year map (single fetch)
    paper_years_res = (
        supabase.table("question_papers")
        .select("id, year, processing_status")
        .eq("subject_id", subject_id)
        .execute()
    )
    paper_rows = paper_years_res.data or []
    year_map = {p["id"]: p["year"] for p in paper_rows}
    paper_count = sum(1 for p in paper_rows if p.get("processing_status") == "done")

    # Single questions fetch with year join
    questions_res = (
        supabase.table("questions")
        .select("text, marks, unit_number, question_type, paper_id")
        .eq("subject_id", subject_id)
        .execute()
    )
    db_questions_with_year = [
        {
            "text": q["text"],
            "marks": q.get("marks"),
            "unit": q.get("unit_number"),
            "type": q.get("question_type"),
            "year": year_map.get(q.get("paper_id")),
        }
        for q in (questions_res.data or [])
    ]

    # All question patterns for subject
    patterns_res = (
        supabase.table("question_patterns")
        .select("*")
        .eq("subject_id", subject_id)
        .order("prediction_score", desc=True)
        .execute()
    )
    patterns = patterns_res.data or []

    # ── Web paper fetching (background, non-blocking) ──────────────────────
    web_questions = []
    sources_used = ["db_patterns"]
    try:
        from services.web_fetcher import fetch_web_questions
        web_questions = fetch_web_questions(subject_name, subject_code, max_pdfs=3)
        if web_questions:
            sources_used.append("web")
    except Exception as e:
        logger.warning(f"Web fetcher failed (non-fatal): {e}")

    # ── Professor Engine ───────────────────────────────────────────────────
    from services.professor_engine import analyse_and_predict
    raw_predictions = analyse_and_predict(
        subject_name=subject_name,
        subject_code=subject_code,
        db_questions=db_questions_with_year,
        db_patterns=patterns,
        web_questions=web_questions,
        paper_count=paper_count,
    )

    if any(p.get("source") == "llm_professor" for p in raw_predictions):
        sources_used.append("llm_professor")

    # ── Format response items ──────────────────────────────────────────────
    predictions = [_build_response_item(p) for p in raw_predictions]

    # ── Cache result (3-day TTL — shorter to pick up new papers) ──────────
    if predictions:
        valid_until_str = (datetime.now(timezone.utc) + timedelta(days=3)).isoformat()
        supabase.table("predictions").insert({
            "subject_id": subject_id,
            "exam_type": exam_type,
            "predicted_questions": predictions,
            "paper_count_used": paper_count,
            "valid_until": valid_until_str,
        }).execute()

    return {
        "subject_id": subject_id,
        "predictions": predictions,
        "paper_count": paper_count,
        "from_cache": False,
        "generated_at": now_iso,
        "sources": sources_used,
    }


@router.post("/analyze/{paper_id}")
async def trigger_analysis(
    paper_id: str,
    background_tasks: BackgroundTasks,
    user=Depends(get_current_user),
):
    supabase = get_supabase()
    res = supabase.table("question_papers").select("id, processing_status").eq("id", paper_id).single().execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Paper not found")
    background_tasks.add_task(process_paper, paper_id)
    return {"message": "Analysis queued", "paper_id": paper_id}
