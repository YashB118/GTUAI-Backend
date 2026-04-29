from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, BackgroundTasks, Query, Request
from typing import Optional
from middleware.auth import get_current_user
from middleware.limiter import limiter
from database import get_supabase
from services.file_validator import validate_pdf
from workers.paper_worker import process_paper
import uuid

router = APIRouter(prefix="/papers", tags=["papers"])

EXAM_TYPES = {"summer", "winter", "mid", "internal"}


@router.post("/upload")
@limiter.limit("5/minute")
async def upload_paper(
    request: Request,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    subject_id: str = Form(...),
    year: int = Form(...),
    exam_type: str = Form(...),
    user=Depends(get_current_user),
):
    if exam_type not in EXAM_TYPES:
        raise HTTPException(status_code=400, detail=f"exam_type must be one of {EXAM_TYPES}")

    content = await file.read()
    validate_pdf(content, file.filename or "")

    supabase = get_supabase()
    safe_name = f"{uuid.uuid4()}.pdf"
    path = f"{subject_id}/{year}/{exam_type}/{safe_name}"

    try:
        upload_res = supabase.storage.from_("question-papers").upload(
            path, content, {"content-type": "application/pdf"}
        )
        if hasattr(upload_res, "status_code") and upload_res.status_code >= 400:
            raise HTTPException(status_code=500, detail=f"Storage upload failed: {upload_res.text}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Storage upload failed: {e}")

    try:
        record = supabase.table("question_papers").insert({
            "subject_id": subject_id,
            "uploaded_by": user["sub"],
            "year": year,
            "exam_type": exam_type,
            "file_url": path,
            "file_name": file.filename,
            "processing_status": "pending",
            "question_count": 0,
        }).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB insert failed: {e}")

    paper_id = record.data[0]["id"] if record.data else None
    if paper_id:
        background_tasks.add_task(process_paper, paper_id)

    return {"paper_id": paper_id, "status": "queued"}


@router.get("/{paper_id}/status")
async def get_paper_status(paper_id: str, user=Depends(get_current_user)):
    supabase = get_supabase()
    res = (
        supabase.table("question_papers")
        .select("id, processing_status, question_count, file_name")
        .eq("id", paper_id)
        .single()
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="Paper not found")
    return res.data


@router.get("/")
async def list_papers(
    subject_id: Optional[str] = None,
    uploaded_by: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    skip: int = Query(0, ge=0),
    user=Depends(get_current_user),
):
    supabase = get_supabase()
    query = supabase.table("question_papers").select("*, subjects(name, code)")
    if subject_id:
        query = query.eq("subject_id", subject_id)
    if uploaded_by:
        query = query.eq("uploaded_by", uploaded_by)
    res = (
        query.order("created_at", desc=True)
        .range(skip, skip + limit - 1)
        .execute()
    )
    return res.data or []


@router.get("/{paper_id}")
async def get_paper(paper_id: str, user=Depends(get_current_user)):
    supabase = get_supabase()
    res = (
        supabase.table("question_papers")
        .select("*, subjects(name, code)")
        .eq("id", paper_id)
        .single()
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="Paper not found")
    return res.data
