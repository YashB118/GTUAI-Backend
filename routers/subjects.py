import time
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from database import get_supabase
from middleware.auth import get_current_user, require_admin

router = APIRouter(prefix="/subjects", tags=["subjects"])

_cache: list | None = None
_cache_ts: float = 0.0
_CACHE_TTL = 300  # 5 minutes


def _get_all_subjects() -> list:
    global _cache, _cache_ts
    if _cache is not None and (time.time() - _cache_ts) < _CACHE_TTL:
        return _cache
    supabase = get_supabase()
    res = supabase.table("subjects").select("*").order("name").execute()
    _cache = res.data or []
    _cache_ts = time.time()
    return _cache


def _invalidate_cache() -> None:
    global _cache, _cache_ts
    _cache = None
    _cache_ts = 0.0


class SubjectCreate(BaseModel):
    name: str
    code: Optional[str] = None
    branch: Optional[str] = None
    semester: Optional[int] = None


@router.get("/")
async def list_subjects(
    branch: Optional[str] = None,
    semester: Optional[int] = None,
):
    subjects = _get_all_subjects()
    if branch:
        subjects = [s for s in subjects if s.get("branch") == branch]
    if semester is not None:
        subjects = [s for s in subjects if s.get("semester") == semester]
    return subjects


@router.post("/")
async def create_subject(data: SubjectCreate, user=Depends(require_admin)):
    supabase = get_supabase()
    res = supabase.table("subjects").insert({
        "name": data.name,
        "code": data.code,
        "branch": data.branch,
        "semester": data.semester,
    }).execute()
    if not res.data:
        raise HTTPException(status_code=500, detail="Failed to create subject")
    _invalidate_cache()
    return res.data[0]


@router.delete("/{subject_id}")
async def delete_subject(subject_id: str, user=Depends(require_admin)):
    supabase = get_supabase()
    supabase.table("subjects").delete().eq("id", subject_id).execute()
    _invalidate_cache()
    return {"message": "Subject deleted"}
