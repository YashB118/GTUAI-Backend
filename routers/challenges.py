"""
Daily challenge — student-facing: get today's challenge, submit attempt.
Admin CRUD lives in admin_coins.py.
"""
import logging
from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from database import get_supabase
from middleware.auth import get_current_user
from routers.coins import add_coins

router = APIRouter(prefix="/challenges", tags=["challenges"])
logger = logging.getLogger(__name__)

ATTEMPT_REWARD = 5
CORRECT_REWARD = 15


def _one(res) -> dict | None:
    """Safe single-row extractor — handles None response from supabase-py."""
    if res is None:
        return None
    rows = res.data or []
    return rows[0] if rows else None


@router.get("/today")
async def get_today_challenge(user=Depends(get_current_user)):
    supabase = get_supabase()
    today = date.today().isoformat()

    ch = _one(
        supabase.table("daily_challenges")
        .select("id, question_text, options, coin_reward, subject_id, subjects:subject_id(name)")
        .eq("active_date", today)
        .limit(1)
        .execute()
    )
    if not ch:
        return {"challenge": None}

    attempt = _one(
        supabase.table("challenge_attempts")
        .select("selected_option, is_correct, coins_earned")
        .eq("user_id", user["sub"])
        .eq("challenge_id", ch["id"])
        .limit(1)
        .execute()
    )

    result = {
        "challenge": {
            "id": ch["id"],
            "question_text": ch["question_text"],
            "options": ch["options"],
            "coin_reward": ch["coin_reward"],
            "subject": (ch.get("subjects") or {}).get("name"),
        },
        "attempted": bool(attempt),
    }
    if attempt:
        result["attempt"] = attempt
        full = _one(
            supabase.table("daily_challenges")
            .select("correct_option, explanation")
            .eq("id", ch["id"])
            .limit(1)
            .execute()
        )
        if full:
            result["correct_option"] = full["correct_option"]
            result["explanation"] = full.get("explanation")

    return result


class AttemptRequest(BaseModel):
    challenge_id: str
    selected_option: int


@router.post("/today/attempt")
async def submit_attempt(req: AttemptRequest, user=Depends(get_current_user)):
    supabase = get_supabase()
    user_id = user["sub"]

    ch = _one(
        supabase.table("daily_challenges")
        .select("id, correct_option, explanation, coin_reward, active_date")
        .eq("id", req.challenge_id)
        .limit(1)
        .execute()
    )
    if not ch:
        raise HTTPException(status_code=404, detail="Challenge not found")
    if ch["active_date"] != date.today().isoformat():
        raise HTTPException(status_code=400, detail="This challenge is not for today")

    existing = _one(
        supabase.table("challenge_attempts")
        .select("id")
        .eq("user_id", user_id)
        .eq("challenge_id", req.challenge_id)
        .limit(1)
        .execute()
    )
    if existing:
        raise HTTPException(status_code=409, detail="Already attempted today's challenge")

    is_correct = req.selected_option == ch["correct_option"]
    coins_earned = ATTEMPT_REWARD + (CORRECT_REWARD if is_correct else 0)

    supabase.table("challenge_attempts").insert({
        "user_id": user_id,
        "challenge_id": req.challenge_id,
        "selected_option": req.selected_option,
        "is_correct": is_correct,
        "coins_earned": coins_earned,
    }).execute()

    tx_type = "challenge_correct" if is_correct else "challenge_attempt"
    note = "Daily challenge correct!" if is_correct else "Daily challenge attempt"
    new_balance = add_coins(user_id, coins_earned, tx_type, note, ref_id=req.challenge_id)

    return {
        "is_correct": is_correct,
        "correct_option": ch["correct_option"],
        "explanation": ch.get("explanation"),
        "coins_earned": coins_earned,
        "balance": new_balance,
    }
