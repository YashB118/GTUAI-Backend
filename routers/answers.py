import asyncio
import logging
import weakref
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, field_validator
from database import get_supabase
from middleware.auth import get_current_user
from middleware.limiter import limiter

router = APIRouter(prefix="/answers", tags=["answers"])
logger = logging.getLogger(__name__)

# Per-pattern in-flight locks. If 10 students hit /generate for the same
# pattern_id concurrently, only one LLM call runs; the rest await and pick up
# the cached row written by the first one.
_inflight: "weakref.WeakValueDictionary[str, asyncio.Lock]" = weakref.WeakValueDictionary()
_locks_guard = asyncio.Lock()


async def _get_lock(key: str) -> asyncio.Lock:
    async with _locks_guard:
        lock = _inflight.get(key)
        if lock is None:
            lock = asyncio.Lock()
            _inflight[key] = lock
        return lock


class GenerateRequest(BaseModel):
    question_text: str
    subject_id: str
    marks: int = 7
    pattern_id: Optional[str] = None

    @field_validator("question_text")
    @classmethod
    def question_not_empty(cls, v: str) -> str:
        if len(v.strip()) < 5:
            raise ValueError("question_text must be at least 5 characters")
        return v.strip()

    @field_validator("marks")
    @classmethod
    def marks_in_range(cls, v: int) -> int:
        if not 1 <= v <= 20:
            raise ValueError("marks must be between 1 and 20")
        return v


class AskRequest(BaseModel):
    question: str
    subject_id: str
    marks: int = 7

    @field_validator("question")
    @classmethod
    def question_not_empty(cls, v: str) -> str:
        if len(v.strip()) < 5:
            raise ValueError("question must be at least 5 characters")
        return v.strip()


async def _run_generate(req_question: str, subject_id: str, marks: int, pattern_id: Optional[str]) -> dict:
    """Run sync generate_answer in a thread so the event loop stays free."""
    from services.answer_engine import generate_answer as _generate
    supabase = get_supabase()
    return await asyncio.to_thread(
        _generate, supabase, req_question, subject_id, marks, pattern_id
    )


@router.post("/generate")
@limiter.limit("10/minute")
async def generate_answer(request: Request, req: GenerateRequest, user=Depends(get_current_user)):
    """Generate (or return cached) GTU-style answer for a question pattern.
    Concurrent calls for the same pattern_id are coalesced into one LLM call.
    """
    try:
        if req.pattern_id:
            lock = await _get_lock(req.pattern_id)
            async with lock:
                # First waiter inside the lock picks up the cached row written
                # by whoever held the lock first, so no duplicate LLM call.
                return await _run_generate(
                    req.question_text, req.subject_id, req.marks, req.pattern_id
                )
        return await _run_generate(
            req.question_text, req.subject_id, req.marks, req.pattern_id
        )
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        logger.error(f"Answer generation error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Answer generation failed: {str(e)}")


@router.get("/{pattern_id}")
async def get_cached_answer(pattern_id: str, user=Depends(get_current_user)):
    """Return the cached answer for a question pattern, or 404 if none exists."""
    supabase = get_supabase()
    res = (
        supabase.table("answers")
        .select("content, source_titles, word_count, model_used, generated_at")
        .eq("pattern_id", pattern_id)
        .order("generated_at", desc=True)
        .limit(1)
        .execute()
    )
    if not res.data:
        raise HTTPException(
            status_code=404,
            detail="No cached answer found. Call POST /answers/generate first.",
        )
    return res.data[0]


@router.post("/ask")
@limiter.limit("10/minute")
async def ask_question(request: Request, req: AskRequest, user=Depends(get_current_user)):
    """Free-form question — not tied to a pattern, answer not cached."""
    try:
        return await _run_generate(req.question, req.subject_id, req.marks, None)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        logger.error(f"Ask error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Answer generation failed: {str(e)}")
