"""
Brahmastra API — /oracle/* endpoints.

Internal prefix: /oracle (clean REST)
User-facing product name: Brahmastra
"""
import logging
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from database import get_supabase
from middleware.auth import get_current_user

router = APIRouter(prefix="/oracle", tags=["brahmastra"])
logger = logging.getLogger(__name__)


class FeedbackRequest(BaseModel):
    question_text: str
    appeared: bool


@router.get("/share/{share_id}")
async def get_brief_by_share(share_id: str):
    """Public endpoint — no auth required. Powers share links."""
    supabase = get_supabase()
    res = (
        supabase.table("oracle_briefs")
        .select("share_id, brief, generated_at, valid_until")
        .eq("share_id", share_id)
        .maybe_single()
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="Brief not found or expired")

    row = res.data
    brief = dict(row["brief"])
    brief.update({
        "share_id":       row["share_id"],
        "generated_at":   row["generated_at"],
        "valid_until":    row["valid_until"],
        "is_shared_view": True,
        "from_cache":     True,
    })
    return brief


@router.get("/{subject_id}")
async def get_brahmastra_brief(
    subject_id: str,
    force_refresh: bool = False,
    user=Depends(get_current_user),
):
    """Generate or serve cached Brahmastra brief for a subject."""
    supabase = get_supabase()

    if force_refresh:
        from datetime import datetime, timezone
        now_iso = datetime.now(timezone.utc).isoformat()
        supabase.table("oracle_briefs").delete().eq("subject_id", subject_id).execute()

    from services.oracle_engine import build_brahmastra_brief
    try:
        brief = build_brahmastra_brief(subject_id, supabase)
        return brief
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.error(f"Brahmastra failed for {subject_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Could not generate Brahmastra brief")


@router.post("/{subject_id}/feedback")
async def post_feedback(
    subject_id: str,
    body: FeedbackRequest,
    user=Depends(get_current_user),
):
    """Post-exam feedback — did this question actually appear?"""
    supabase = get_supabase()

    brief_res = (
        supabase.table("oracle_briefs")
        .select("id")
        .eq("subject_id", subject_id)
        .order("generated_at", desc=True)
        .limit(1)
        .execute()
    )
    if not brief_res.data:
        raise HTTPException(status_code=404, detail="No Brahmastra brief found for this subject")

    oracle_brief_id = brief_res.data[0]["id"]
    user_id = user.get("id") or user.get("sub")

    supabase.table("oracle_feedback").upsert(
        {
            "oracle_brief_id": oracle_brief_id,
            "user_id":         user_id,
            "question_text":   body.question_text[:500],
            "appeared":        body.appeared,
        },
        on_conflict="oracle_brief_id,user_id,question_text",
    ).execute()

    return {"ok": True}
