from fastapi import APIRouter, BackgroundTasks, UploadFile, File, Form, Depends, HTTPException, Query, Request
from middleware.auth import get_current_user, require_admin
from middleware.limiter import limiter
from database import get_supabase, get_storage_client
from services.file_validator import validate_pdf
import uuid

router = APIRouter(prefix="/materials", tags=["materials"])

MATERIAL_TYPES = {"notes", "textbook", "handwritten", "summary", "slides"}


@router.post("/upload")
@limiter.limit("5/minute")
async def upload_material(
    request: Request,
    file: UploadFile = File(...),
    subject_id: str = Form(...),
    title: str = Form(...),
    description: str = Form(""),
    material_type: str = Form(...),
    user=Depends(get_current_user),
):
    if material_type not in MATERIAL_TYPES:
        raise HTTPException(status_code=400, detail=f"material_type must be one of {MATERIAL_TYPES}")

    content = await file.read()
    validate_pdf(content, file.filename or "")
    size_kb = len(content) // 1024

    supabase = get_supabase()
    safe_name = f"{uuid.uuid4()}.pdf"
    path = f"{subject_id}/{material_type}/{safe_name}"

    try:
        storage = get_storage_client()
        upload_res = storage.storage.from_("study-materials").upload(
            path, content, file_options={"content-type": "application/pdf", "upsert": "false"}
        )
        if hasattr(upload_res, "status_code") and upload_res.status_code >= 400:
            raise HTTPException(status_code=500, detail="Storage upload failed")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Storage upload failed: {e}")

    record = (
        supabase.table("study_materials")
        .insert({
            "uploaded_by": user["sub"],
            "subject_id": subject_id,
            "title": title,
            "description": description,
            "file_url": path,
            "file_name": file.filename,
            "file_size_kb": size_kb,
            "material_type": material_type,
            "approval_status": "pending",
            "processing_status": "pending",
        })
        .execute()
    )

    return {
        "material_id": record.data[0]["id"] if record.data else None,
        "status": "pending_approval",
    }


@router.get("/")
async def list_materials(
    subject_id: str | None = None,
    approved_only: bool = True,
    uploaded_by: str | None = None,
    limit: int = Query(50, ge=1, le=200),
    skip: int = Query(0, ge=0),
    user=Depends(get_current_user),
):
    supabase = get_supabase()
    query = supabase.table("study_materials").select(
        "id, title, description, material_type, file_name, file_url, file_size_kb, "
        "approval_status, processing_status, chunk_count, created_at, "
        "uploaded_by, subjects(name, code)"
    )
    if approved_only and not uploaded_by:
        query = query.eq("approval_status", "approved")
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


@router.patch("/{material_id}/approve")
async def approve_material(
    material_id: str,
    background_tasks: BackgroundTasks,
    admin=Depends(require_admin),
):
    from datetime import datetime, timezone
    supabase = get_supabase()

    mat_res = (
        supabase.table("study_materials")
        .select("id, subject_id, approval_status")
        .eq("id", material_id)
        .maybe_single()
        .execute()
    )
    if not mat_res.data:
        raise HTTPException(status_code=404, detail="Material not found")

    now_iso = datetime.now(timezone.utc).isoformat()
    res = (
        supabase.table("study_materials")
        .update({
            "approval_status": "approved",
            "approved_by": admin["sub"],
            "approved_at": now_iso,
            "processing_status": "queued",
        })
        .eq("id", material_id)
        .execute()
    )

    from workers.material_worker import process_material_worker
    background_tasks.add_task(process_material_worker, material_id)

    return res.data[0] if res.data else {}


@router.get("/{material_id}/download")
async def get_download_url(material_id: str, user=Depends(get_current_user)):
    supabase = get_supabase()
    res = (
        supabase.table("study_materials")
        .select("id, file_url, approval_status")
        .eq("id", material_id)
        .maybe_single()
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="Material not found")
    if res.data["approval_status"] != "approved":
        raise HTTPException(status_code=403, detail="Material not approved")
    signed = get_storage_client().storage.from_("study-materials").create_signed_url(
        res.data["file_url"], 120
    )
    url = signed.get("signedURL") or signed.get("signed_url") or (signed.get("data") or {}).get("signedUrl")
    if not url:
        raise HTTPException(status_code=500, detail="Could not generate download link")
    return {"url": url}


@router.patch("/{material_id}/reject")
async def reject_material(
    material_id: str,
    reason: str = "",
    admin=Depends(require_admin),
):
    supabase = get_supabase()
    res = (
        supabase.table("study_materials")
        .update({"approval_status": "rejected", "rejection_reason": reason})
        .eq("id", material_id)
        .execute()
    )
    return res.data[0] if res.data else {}
