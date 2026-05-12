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

_BRANCH_ALIASES = {
    # BE branches
    "ce": "CE",
    "civil": "CIVIL",
    "civilengineering": "CIVIL",
    "cse": "CE",
    "computer": "CE",
    "computerengineering": "CE",
    "it": "IT",
    "informationtechnology": "IT",
    "me": "ME",
    "mechanical": "ME",
    "mechanicalengineering": "ME",
    "ee": "EE",
    "electrical": "EE",
    "electricalengineering": "EE",
    "ec": "EC",
    "ece": "EC",
    "electronics": "EC",
    "electronicsandcommunication": "EC",
    "ic": "IC",
    "instrumentation": "IC",
    "instrumentationandcontrol": "IC",
    "chem": "CHEM",
    "chemical": "CHEM",
    "chemicalengineering": "CHEM",
    "auto": "AUTO",
    "automobile": "AUTO",
    # Diploma-specific aliases (same normalized names, differentiated by program)
    "co": "CO",
    "computeroperations": "CO",
}

_PROGRAM_ALIASES = {
    "be": "BE",
    "btech": "BE",
    "b.e.": "BE",
    "b.tech": "BE",
    "bachelor": "BE",
    "degree": "BE",
    "diploma": "DIPLOMA",
    "dip": "DIPLOMA",
    "polytechnic": "DIPLOMA",
}


def _normalize_branch(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    cleaned = "".join(ch for ch in value.lower() if ch.isalnum())
    if not cleaned:
        return None
    return _BRANCH_ALIASES.get(cleaned, cleaned.upper())


def _normalize_program(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    cleaned = "".join(ch for ch in value.lower() if ch.isalnum())
    if not cleaned:
        return None
    return _PROGRAM_ALIASES.get(cleaned, cleaned.upper())


def _get_all_subjects() -> list:
    global _cache, _cache_ts
    if _cache is not None and (time.time() - _cache_ts) < _CACHE_TTL:
        return _cache
    supabase = get_supabase()
    res = supabase.table("subjects").select("*").order("semester").order("name").execute()
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
    program: str = "BE"


@router.get("/")
async def list_subjects(
    branch: Optional[str] = None,
    semester: Optional[int] = None,
    program: Optional[str] = None,
):
    subjects = _get_all_subjects()

    norm_program = _normalize_program(program)
    if norm_program:
        subjects = [
            s for s in subjects
            if (s.get("program") or "BE").upper() == norm_program
        ]

    norm_branch = _normalize_branch(branch)
    if norm_branch:
        subjects = [
            s for s in subjects
            if _normalize_branch(s.get("branch")) == norm_branch
            or s.get("branch") == "COMMON"  # always include common cross-branch subjects
        ]

    if semester is not None:
        subjects = [s for s in subjects if s.get("semester") == semester]

    return subjects


@router.get("/branches")
async def list_branches(program: Optional[str] = None):
    """Return distinct branches available, optionally filtered by program."""
    subjects = _get_all_subjects()
    norm_program = _normalize_program(program)
    if norm_program:
        subjects = [s for s in subjects if (s.get("program") or "BE").upper() == norm_program]
    branches = sorted({s.get("branch") for s in subjects if s.get("branch") and s.get("branch") != "COMMON"})
    return {"branches": branches}


@router.get("/programs")
async def list_programs():
    """Return distinct programs (BE, DIPLOMA) available."""
    subjects = _get_all_subjects()
    programs = sorted({(s.get("program") or "BE").upper() for s in subjects})
    return {"programs": programs}


@router.post("/")
async def create_subject(data: SubjectCreate, user=Depends(require_admin)):
    supabase = get_supabase()
    res = supabase.table("subjects").insert({
        "name": data.name,
        "code": data.code,
        "branch": _normalize_branch(data.branch),
        "semester": data.semester,
        "program": _normalize_program(data.program) or "BE",
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
