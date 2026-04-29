"""
Admin-only endpoints for Phase 4: approvals, paper management, user management,
analytics, prediction config.

All endpoints require an admin role (see middleware/auth.require_admin).
"""
import csv
import io
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    Form,
    HTTPException,
    Query,
    UploadFile,
)
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from database import get_supabase
from middleware.auth import require_admin

router = APIRouter(prefix="/admin", tags=["admin"])
logger = logging.getLogger(__name__)


# ─── Materials ──────────────────────────────────────────────────────────────


@router.get("/materials")
async def list_materials_admin(
    status: Optional[str] = Query(None, pattern="^(pending|approved|rejected)$"),
    subject_id: Optional[str] = None,
    material_type: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    skip: int = Query(0, ge=0),
    admin=Depends(require_admin),
):
    supabase = get_supabase()
    query = supabase.table("study_materials").select(
        "id, title, description, material_type, file_name, file_url, file_size_kb, "
        "approval_status, processing_status, chunk_count, rejection_reason, "
        "created_at, approved_at, uploaded_by, "
        "subjects(name, code), users:uploaded_by(full_name, email, enrollment_no)"
    )
    if status:
        query = query.eq("approval_status", status)
    if subject_id:
        query = query.eq("subject_id", subject_id)
    if material_type:
        query = query.eq("material_type", material_type)
    res = (
        query.order("created_at", desc=True)
        .range(skip, skip + limit - 1)
        .execute()
    )
    return res.data or []


@router.get("/materials/{material_id}/preview")
async def material_preview_url(material_id: str, admin=Depends(require_admin)):
    """Signed URL for in-browser PDF preview (5 min TTL)."""
    supabase = get_supabase()
    res = (
        supabase.table("study_materials")
        .select("id, file_url")
        .eq("id", material_id)
        .maybe_single()
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="Material not found")
    signed = supabase.storage.from_("study-materials").create_signed_url(
        res.data["file_url"], 300
    )
    url = (
        signed.get("signedURL")
        or signed.get("signed_url")
        or (signed.get("data") or {}).get("signedUrl")
    )
    if not url:
        raise HTTPException(status_code=500, detail="Could not generate preview link")
    return {"url": url}


class BulkActionRequest(BaseModel):
    material_ids: list[str] = Field(..., min_length=1)
    reason: Optional[str] = None


def _approve_one(supabase, material_id: str, admin_id: str, background_tasks: BackgroundTasks) -> bool:
    from workers.material_worker import process_material_worker

    now_iso = datetime.now(timezone.utc).isoformat()
    res = (
        supabase.table("study_materials")
        .update({
            "approval_status": "approved",
            "approved_by": admin_id,
            "approved_at": now_iso,
            "processing_status": "queued",
        })
        .eq("id", material_id)
        .execute()
    )
    if res.data:
        background_tasks.add_task(process_material_worker, material_id)
        # Best-effort email
        try:
            row = res.data[0]
            uploader_id = row.get("uploaded_by")
            title = row.get("title", "your material")
            if uploader_id:
                _email_uploader_async(background_tasks, uploader_id, "approved", title)
        except Exception as e:
            logger.warning(f"Could not queue approval email: {e}")
        return True
    return False


def _email_uploader_async(
    background_tasks: BackgroundTasks,
    uploader_id: str,
    kind: str,
    title: str,
    reason: str = "",
) -> None:
    """Queue an email notification (uses Resend if configured)."""
    from services.email_service import (
        is_email_enabled,
        notify_material_approved,
        notify_material_rejected,
    )

    if not is_email_enabled():
        return

    def _task():
        try:
            sb = get_supabase()
            u = (
                sb.table("users")
                .select("email")
                .eq("id", uploader_id)
                .maybe_single()
                .execute()
            )
            email = (u.data or {}).get("email")
            if not email:
                return
            if kind == "approved":
                notify_material_approved(email, title)
            else:
                notify_material_rejected(email, title, reason)
        except Exception as e:
            logger.warning(f"Email task failed: {e}")

    background_tasks.add_task(_task)


@router.post("/materials/bulk-approve")
async def bulk_approve(
    req: BulkActionRequest,
    background_tasks: BackgroundTasks,
    admin=Depends(require_admin),
):
    supabase = get_supabase()
    approved = 0
    for mid in req.material_ids:
        try:
            if _approve_one(supabase, mid, admin["sub"], background_tasks):
                approved += 1
        except Exception as e:
            logger.warning(f"Bulk approve failed for {mid}: {e}")
    return {"approved": approved, "requested": len(req.material_ids)}


@router.post("/materials/bulk-reject")
async def bulk_reject(
    req: BulkActionRequest,
    background_tasks: BackgroundTasks,
    admin=Depends(require_admin),
):
    supabase = get_supabase()
    rejected = 0
    for mid in req.material_ids:
        try:
            res = (
                supabase.table("study_materials")
                .update({
                    "approval_status": "rejected",
                    "rejection_reason": req.reason or "",
                    "approved_by": admin["sub"],
                })
                .eq("id", mid)
                .execute()
            )
            if res.data:
                rejected += 1
                row = res.data[0]
                uploader_id = row.get("uploaded_by")
                title = row.get("title", "your material")
                if uploader_id:
                    _email_uploader_async(
                        background_tasks, uploader_id, "rejected", title, req.reason or ""
                    )
        except Exception as e:
            logger.warning(f"Bulk reject failed for {mid}: {e}")
    return {"rejected": rejected, "requested": len(req.material_ids)}


# ─── Papers ─────────────────────────────────────────────────────────────────


PAPER_EXAM_TYPES = {"summer", "winter", "mid", "internal"}


@router.post("/papers/upload")
async def admin_upload_paper(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    subject_id: str = Form(...),
    year: int = Form(...),
    exam_type: str = Form(...),
    admin=Depends(require_admin),
):
    """Admin uploads an official GTU paper — auto-marked verified=true."""
    import uuid
    from workers.paper_worker import process_paper

    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF files allowed")
    if exam_type not in PAPER_EXAM_TYPES:
        raise HTTPException(status_code=400, detail=f"exam_type must be one of {PAPER_EXAM_TYPES}")

    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Max file size is 10 MB")

    supabase = get_supabase()
    safe_name = f"{uuid.uuid4()}.pdf"
    path = f"{subject_id}/{year}/{exam_type}/{safe_name}"

    try:
        supabase.storage.from_("question-papers").upload(
            path, content, {"content-type": "application/pdf"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Storage upload failed: {e}")

    insert_payload = {
        "subject_id": subject_id,
        "uploaded_by": admin["sub"],
        "year": year,
        "exam_type": exam_type,
        "file_url": path,
        "file_name": file.filename,
        "processing_status": "pending",
        "question_count": 0,
        "verified": True,
    }
    try:
        record = supabase.table("question_papers").insert(insert_payload).execute()
    except Exception:
        # `verified` column may not exist yet — retry without it
        insert_payload.pop("verified", None)
        record = supabase.table("question_papers").insert(insert_payload).execute()

    paper_id = record.data[0]["id"] if record.data else None
    if paper_id:
        background_tasks.add_task(process_paper, paper_id)
    return {"paper_id": paper_id, "status": "queued", "verified": True}


@router.patch("/papers/{paper_id}/verify")
async def toggle_paper_verified(
    paper_id: str,
    verified: bool = Query(True),
    admin=Depends(require_admin),
):
    supabase = get_supabase()
    try:
        res = (
            supabase.table("question_papers")
            .update({"verified": verified})
            .eq("id", paper_id)
            .execute()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Verify update failed: {e}")
    if not res.data:
        raise HTTPException(status_code=404, detail="Paper not found")
    return {"id": paper_id, "verified": verified}


@router.post("/papers/{paper_id}/reprocess")
async def reprocess_paper(
    paper_id: str,
    background_tasks: BackgroundTasks,
    admin=Depends(require_admin),
):
    from workers.paper_worker import process_paper

    supabase = get_supabase()
    res = (
        supabase.table("question_papers")
        .select("id")
        .eq("id", paper_id)
        .maybe_single()
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="Paper not found")
    supabase.table("question_papers").update(
        {"processing_status": "pending"}
    ).eq("id", paper_id).execute()
    # Wipe extracted questions so reprocess starts fresh
    supabase.table("questions").delete().eq("paper_id", paper_id).execute()
    background_tasks.add_task(process_paper, paper_id)
    return {"status": "requeued", "paper_id": paper_id}


@router.delete("/papers/{paper_id}")
async def delete_paper(paper_id: str, admin=Depends(require_admin)):
    supabase = get_supabase()
    paper_res = (
        supabase.table("question_papers")
        .select("id, subject_id, file_url")
        .eq("id", paper_id)
        .maybe_single()
        .execute()
    )
    if not paper_res.data:
        raise HTTPException(status_code=404, detail="Paper not found")

    # Delete storage object (best-effort)
    try:
        supabase.storage.from_("question-papers").remove([paper_res.data["file_url"]])
    except Exception as e:
        logger.warning(f"Could not delete storage object: {e}")

    # Delete paper (FK cascade will remove questions)
    supabase.table("question_papers").delete().eq("id", paper_id).execute()
    # Invalidate cached predictions for this subject
    subject_id = paper_res.data.get("subject_id")
    if subject_id:
        supabase.table("predictions").delete().eq("subject_id", subject_id).execute()
    return {"deleted": paper_id}


# ─── Subjects ───────────────────────────────────────────────────────────────


@router.get("/subjects/stats")
async def subject_stats(admin=Depends(require_admin)):
    """Per-subject counts: papers, materials (approved), questions extracted."""
    supabase = get_supabase()
    subjects = supabase.table("subjects").select("id, name, code, branch, semester").order("name").execute().data or []

    papers = supabase.table("question_papers").select("subject_id").execute().data or []
    materials = (
        supabase.table("study_materials")
        .select("subject_id, approval_status")
        .execute()
        .data
        or []
    )
    questions = supabase.table("questions").select("subject_id").execute().data or []

    paper_count: dict = {}
    for p in papers:
        paper_count[p["subject_id"]] = paper_count.get(p["subject_id"], 0) + 1
    mat_count: dict = {}
    for m in materials:
        if m.get("approval_status") == "approved":
            mat_count[m["subject_id"]] = mat_count.get(m["subject_id"], 0) + 1
    q_count: dict = {}
    for q in questions:
        q_count[q["subject_id"]] = q_count.get(q["subject_id"], 0) + 1

    return [
        {
            **s,
            "paper_count": paper_count.get(s["id"], 0),
            "material_count": mat_count.get(s["id"], 0),
            "question_count": q_count.get(s["id"], 0),
        }
        for s in subjects
    ]


class SubjectUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    branch: Optional[str] = None
    semester: Optional[int] = None
    credits: Optional[int] = None


@router.patch("/subjects/{subject_id}")
async def update_subject(
    subject_id: str, data: SubjectUpdate, admin=Depends(require_admin)
):
    supabase = get_supabase()
    payload = {k: v for k, v in data.model_dump().items() if v is not None}
    if not payload:
        raise HTTPException(status_code=400, detail="No fields to update")
    try:
        res = (
            supabase.table("subjects")
            .update(payload)
            .eq("id", subject_id)
            .execute()
        )
    except Exception as e:
        # `credits` column may not exist — retry without it
        if "credits" in payload:
            payload.pop("credits", None)
            res = (
                supabase.table("subjects")
                .update(payload)
                .eq("id", subject_id)
                .execute()
            )
        else:
            raise HTTPException(status_code=500, detail=f"Update failed: {e}")
    if not res.data:
        raise HTTPException(status_code=404, detail="Subject not found")
    # Invalidate subjects cache
    try:
        from routers.subjects import _invalidate_cache
        _invalidate_cache()
    except Exception:
        pass
    return res.data[0]


# ─── Users ──────────────────────────────────────────────────────────────────


@router.get("/users")
async def list_users_admin(
    search: Optional[str] = None,
    role: Optional[str] = Query(None, pattern="^(student|admin)$"),
    branch: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    skip: int = Query(0, ge=0),
    admin=Depends(require_admin),
):
    supabase = get_supabase()
    cols = "id, full_name, email, branch, semester, enrollment_no, role, college, created_at"
    # Try with `suspended`; fall back if column missing
    try:
        query = supabase.table("users").select(cols + ", suspended")
    except Exception:
        query = supabase.table("users").select(cols)

    if role:
        query = query.eq("role", role)
    if branch:
        query = query.eq("branch", branch)
    if search:
        like = f"%{search}%"
        query = query.or_(
            f"full_name.ilike.{like},email.ilike.{like},enrollment_no.ilike.{like}"
        )

    try:
        res = (
            query.order("created_at", desc=True)
            .range(skip, skip + limit - 1)
            .execute()
        )
    except Exception:
        # Retry without suspended column
        res = (
            supabase.table("users")
            .select(cols)
            .order("created_at", desc=True)
            .range(skip, skip + limit - 1)
            .execute()
        )
    return res.data or []


@router.get("/users/export-csv")
async def export_users_csv(admin=Depends(require_admin)):
    supabase = get_supabase()
    res = (
        supabase.table("users")
        .select(
            "id, full_name, email, branch, semester, enrollment_no, role, college, created_at"
        )
        .order("created_at", desc=True)
        .execute()
    )
    rows = res.data or []
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(
        ["id", "full_name", "email", "enrollment_no", "branch", "semester", "role", "college", "created_at"]
    )
    for u in rows:
        writer.writerow([
            u.get("id", ""),
            u.get("full_name", ""),
            u.get("email", ""),
            u.get("enrollment_no", ""),
            u.get("branch", ""),
            u.get("semester", ""),
            u.get("role", ""),
            u.get("college", ""),
            u.get("created_at", ""),
        ])
    buf.seek(0)
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=users.csv"},
    )


@router.get("/users/{user_id}/uploads")
async def user_uploads(user_id: str, admin=Depends(require_admin)):
    supabase = get_supabase()
    papers = (
        supabase.table("question_papers")
        .select("id, file_name, year, exam_type, processing_status, created_at, subjects(name, code)")
        .eq("uploaded_by", user_id)
        .order("created_at", desc=True)
        .execute()
        .data
        or []
    )
    materials = (
        supabase.table("study_materials")
        .select(
            "id, title, material_type, approval_status, processing_status, "
            "chunk_count, created_at, subjects(name, code)"
        )
        .eq("uploaded_by", user_id)
        .order("created_at", desc=True)
        .execute()
        .data
        or []
    )
    return {"papers": papers, "materials": materials}


@router.patch("/users/{user_id}/suspend")
async def suspend_user(user_id: str, admin=Depends(require_admin)):
    supabase = get_supabase()
    try:
        res = (
            supabase.table("users")
            .update({"suspended": True})
            .eq("id", user_id)
            .execute()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Suspend failed (run SQL: ALTER TABLE users ADD COLUMN suspended BOOLEAN DEFAULT FALSE). {e}")
    if not res.data:
        raise HTTPException(status_code=404, detail="User not found")
    return {"id": user_id, "suspended": True}


@router.patch("/users/{user_id}/activate")
async def activate_user(user_id: str, admin=Depends(require_admin)):
    supabase = get_supabase()
    try:
        res = (
            supabase.table("users")
            .update({"suspended": False})
            .eq("id", user_id)
            .execute()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Activate failed: {e}")
    if not res.data:
        raise HTTPException(status_code=404, detail="User not found")
    return {"id": user_id, "suspended": False}


@router.patch("/users/{user_id}/promote")
async def promote_user(user_id: str, admin=Depends(require_admin)):
    """Promote a student to admin."""
    if user_id == admin["sub"]:
        raise HTTPException(status_code=400, detail="Cannot promote yourself")
    supabase = get_supabase()
    res = (
        supabase.table("users")
        .update({"role": "admin"})
        .eq("id", user_id)
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="User not found")
    return {"id": user_id, "role": "admin"}


# ─── Analytics ──────────────────────────────────────────────────────────────


@router.get("/analytics/overview")
async def analytics_overview(admin=Depends(require_admin)):
    supabase = get_supabase()

    # Counts via head=True (returns count without rows)
    def _count(table: str, **filters) -> int:
        q = supabase.table(table).select("id", count="exact", head=True)
        for k, v in filters.items():
            q = q.eq(k, v)
        return q.execute().count or 0

    return {
        "total_students": _count("users", role="student"),
        "total_admins": _count("users", role="admin"),
        "total_papers": _count("question_papers"),
        "total_materials": _count("study_materials"),
        "pending_approvals": _count("study_materials", approval_status="pending"),
        "approved_materials": _count("study_materials", approval_status="approved"),
        "rejected_materials": _count("study_materials", approval_status="rejected"),
        "total_questions": _count("questions"),
        "total_subjects": _count("subjects"),
        "total_patterns": _count("question_patterns"),
    }


@router.get("/analytics/uploads-chart")
async def uploads_chart(
    days: int = Query(14, ge=1, le=90),
    admin=Depends(require_admin),
):
    """Papers + materials uploaded per day for the last N days."""
    supabase = get_supabase()
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()

    papers = (
        supabase.table("question_papers")
        .select("created_at")
        .gte("created_at", cutoff)
        .execute()
        .data
        or []
    )
    materials = (
        supabase.table("study_materials")
        .select("created_at")
        .gte("created_at", cutoff)
        .execute()
        .data
        or []
    )

    # Build buckets
    today = datetime.now(timezone.utc).date()
    buckets: list[dict] = []
    for offset in range(days - 1, -1, -1):
        d = today - timedelta(days=offset)
        buckets.append({"date": d.isoformat(), "papers": 0, "materials": 0})
    by_date = {b["date"]: b for b in buckets}

    for p in papers:
        d = (p.get("created_at") or "")[:10]
        if d in by_date:
            by_date[d]["papers"] += 1
    for m in materials:
        d = (m.get("created_at") or "")[:10]
        if d in by_date:
            by_date[d]["materials"] += 1

    return buckets


@router.get("/analytics/top-subjects")
async def top_subjects(
    limit: int = Query(8, ge=1, le=30),
    admin=Depends(require_admin),
):
    supabase = get_supabase()
    subjects = supabase.table("subjects").select("id, name, code").execute().data or []
    papers = supabase.table("question_papers").select("subject_id").execute().data or []

    counts: dict = {}
    for p in papers:
        counts[p["subject_id"]] = counts.get(p["subject_id"], 0) + 1

    enriched = [
        {
            "id": s["id"],
            "name": s["name"],
            "code": s.get("code"),
            "paper_count": counts.get(s["id"], 0),
        }
        for s in subjects
    ]
    enriched.sort(key=lambda x: x["paper_count"], reverse=True)
    return enriched[:limit]


@router.get("/analytics/recent-signups")
async def recent_signups(
    limit: int = Query(10, ge=1, le=50),
    admin=Depends(require_admin),
):
    supabase = get_supabase()
    res = (
        supabase.table("users")
        .select("id, full_name, email, branch, semester, enrollment_no, created_at")
        .eq("role", "student")
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    return res.data or []


@router.get("/analytics/top-materials")
async def top_materials(
    limit: int = Query(10, ge=1, le=30),
    admin=Depends(require_admin),
):
    """Top approved materials — ranked by chunk_count as a proxy for content size."""
    supabase = get_supabase()
    res = (
        supabase.table("study_materials")
        .select("id, title, material_type, chunk_count, file_size_kb, created_at, subjects(name, code)")
        .eq("approval_status", "approved")
        .order("chunk_count", desc=True)
        .limit(limit)
        .execute()
    )
    return res.data or []


# ─── Prediction config ──────────────────────────────────────────────────────


class WeightsUpdate(BaseModel):
    frequency: float = Field(..., ge=0, le=100)
    recency: float = Field(..., ge=0, le=100)
    consecutive: float = Field(..., ge=0, le=100)
    marks: float = Field(..., ge=0, le=100)


@router.get("/predictions/weights")
async def get_weights(admin=Depends(require_admin)):
    from services.settings_service import get_prediction_weights
    return get_prediction_weights()


@router.put("/predictions/weights")
async def set_weights(data: WeightsUpdate, admin=Depends(require_admin)):
    from services.settings_service import set_prediction_weights
    return set_prediction_weights(data.model_dump())


@router.post("/predictions/clear-cache")
async def clear_predictions_cache(
    subject_id: Optional[str] = None,
    admin=Depends(require_admin),
):
    supabase = get_supabase()
    q = supabase.table("predictions").delete()
    if subject_id:
        q = q.eq("subject_id", subject_id)
    else:
        # Delete all (use neq trick)
        q = q.neq("id", "00000000-0000-0000-0000-000000000000")
    res = q.execute()
    return {"cleared": len(res.data or [])}


@router.post("/predictions/rescore/{subject_id}")
async def rescore_subject(
    subject_id: str,
    background_tasks: BackgroundTasks,
    admin=Depends(require_admin),
):
    """Re-calculate prediction_score for every pattern in a subject using current weights."""
    from services.prediction_engine import calculate_score
    from services.settings_service import get_prediction_weights

    supabase = get_supabase()
    patterns = (
        supabase.table("question_patterns")
        .select("id, occurrence_years, avg_marks")
        .eq("subject_id", subject_id)
        .execute()
        .data
        or []
    )
    weights = get_prediction_weights()
    updated = 0
    for p in patterns:
        years = p.get("occurrence_years") or []
        if not years:
            continue
        score = calculate_score(years, p.get("avg_marks"), weights=weights)
        supabase.table("question_patterns").update(
            {"prediction_score": score}
        ).eq("id", p["id"]).execute()
        updated += 1

    # Invalidate cached predictions for this subject
    supabase.table("predictions").delete().eq("subject_id", subject_id).execute()
    return {"updated": updated, "subject_id": subject_id}
