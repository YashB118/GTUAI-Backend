import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from database import get_supabase
from middleware.auth import get_current_user
from middleware.limiter import limiter
from services.chat_engine import stream_chat_response

router = APIRouter(prefix="/chat", tags=["chat"])
logger = logging.getLogger(__name__)


class NewSessionRequest(BaseModel):
    subject_id: str


class MessageRequest(BaseModel):
    session_id: str
    subject_id: str
    message: str


@router.post("/sessions")
async def create_session(req: NewSessionRequest, user=Depends(get_current_user)):
    supabase = get_supabase()
    res = supabase.table("chat_sessions").insert({
        "user_id": user["sub"],
        "subject_id": req.subject_id,
        "title": "New Chat",
    }).execute()
    if not res.data:
        raise HTTPException(500, "Failed to create session")
    return res.data[0]


@router.get("/sessions")
async def list_sessions(subject_id: Optional[str] = None, user=Depends(get_current_user)):
    supabase = get_supabase()
    query = (
        supabase.table("chat_sessions")
        .select("*, subjects(name, code)")
        .eq("user_id", user["sub"])
        .order("updated_at", desc=True)
    )
    if subject_id:
        query = query.eq("subject_id", subject_id)
    return query.execute().data or []


@router.get("/sessions/{session_id}/messages")
async def get_messages(session_id: str, user=Depends(get_current_user)):
    supabase = get_supabase()
    session_res = supabase.table("chat_sessions").select("user_id").eq("id", session_id).single().execute()
    if not session_res.data or session_res.data["user_id"] != user["sub"]:
        raise HTTPException(404, "Session not found")
    msgs = (
        supabase.table("chat_messages")
        .select("*")
        .eq("session_id", session_id)
        .order("created_at")
        .execute()
    )
    return msgs.data or []


@router.post("/message")
@limiter.limit("20/minute")
async def send_message(request: Request, req: MessageRequest, user=Depends(get_current_user)):
    supabase = get_supabase()

    session_res = (
        supabase.table("chat_sessions")
        .select("user_id, subject_id")
        .eq("id", req.session_id)
        .single()
        .execute()
    )
    if not session_res.data or session_res.data["user_id"] != user["sub"]:
        raise HTTPException(404, "Session not found")

    # Persist user message
    supabase.table("chat_messages").insert({
        "session_id": req.session_id,
        "role": "user",
        "content": req.message,
    }).execute()

    # Auto-title from first message
    existing = (
        supabase.table("chat_messages")
        .select("id", count="exact")
        .eq("session_id", req.session_id)
        .execute()
    )
    if (existing.count or 0) <= 1:
        title = req.message[:60] + ("..." if len(req.message) > 60 else "")
        from datetime import datetime, timezone
        supabase.table("chat_sessions").update({
            "title": title,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", req.session_id).execute()

    # History (last 20 messages, exclude just-inserted user msg)
    history_res = (
        supabase.table("chat_messages")
        .select("role, content")
        .eq("session_id", req.session_id)
        .order("created_at", desc=True)
        .limit(21)
        .execute()
    )
    history = list(reversed(history_res.data or []))[:-1]

    return StreamingResponse(
        stream_chat_response(
            supabase=supabase,
            session_id=req.session_id,
            subject_id=req.subject_id,
            user_message=req.message,
            history=history,
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.delete("/sessions/{session_id}")
async def delete_session(session_id: str, user=Depends(get_current_user)):
    supabase = get_supabase()
    supabase.table("chat_sessions").delete().eq("id", session_id).eq("user_id", user["sub"]).execute()
    return {"deleted": True}
