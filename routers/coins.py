"""
Coin system — balance, login reward, transaction history, spend endpoints.
All writes use service key and bypass RLS.
"""
import logging
from datetime import date, datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from database import get_supabase
from middleware.auth import get_current_user

router = APIRouter(prefix="/coins", tags=["coins"])
streaks_router = APIRouter(prefix="/streaks", tags=["streaks"])
logger = logging.getLogger(__name__)

LOGIN_REWARD     = 10
STREAK_7_BONUS   = 75
BRAHMASTRA_REWARD = 20
AI_QUERY_COST    = 10
FREEZE_COST      = 50
FREE_AI_QUERIES  = 5


# ── Helpers ──────────────────────────────────────────────────────────────────

def _ensure_coin_row(supabase, user_id: str) -> dict:
    """Upsert user_coins row, return current row."""
    res = supabase.table("user_coins").select("*").eq("user_id", user_id).limit(1).execute()
    rows = (res.data or []) if res else []
    if rows:
        return rows[0]
    supabase.table("user_coins").insert({"user_id": user_id, "balance": 0, "lifetime_earned": 0}).execute()
    return {"user_id": user_id, "balance": 0, "lifetime_earned": 0}


def _ensure_streak_row(supabase, user_id: str) -> dict:
    res = supabase.table("user_streaks").select("*").eq("user_id", user_id).limit(1).execute()
    rows = (res.data or []) if res else []
    if rows:
        return rows[0]
    supabase.table("user_streaks").insert({"user_id": user_id}).execute()
    return {"user_id": user_id, "current_streak": 0, "longest_streak": 0,
            "last_active_date": None, "streak_freeze_count": 0}


def add_coins(user_id: str, amount: int, tx_type: str, note: str = "", ref_id: Optional[str] = None) -> int:
    """
    Add (positive) or subtract (negative) coins atomically.
    Returns new balance. Raises HTTPException if balance would go negative.
    """
    supabase = get_supabase()
    row = _ensure_coin_row(supabase, user_id)
    new_balance = row["balance"] + amount
    if new_balance < 0:
        raise HTTPException(status_code=400, detail="Insufficient coins")

    new_lifetime = row["lifetime_earned"] + max(amount, 0)
    supabase.table("user_coins").update({
        "balance": new_balance,
        "lifetime_earned": new_lifetime,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }).eq("user_id", user_id).execute()

    tx_payload: dict = {"user_id": user_id, "amount": amount, "type": tx_type, "note": note}
    if ref_id:
        tx_payload["ref_id"] = ref_id
    supabase.table("coin_transactions").insert(tx_payload).execute()
    return new_balance


# ── Routes ───────────────────────────────────────────────────────────────────

@streaks_router.get("/me")
async def get_my_streak(user=Depends(get_current_user)):
    supabase = get_supabase()
    row = _ensure_streak_row(supabase, user["sub"])
    return {
        "current_streak": row["current_streak"],
        "longest_streak": row["longest_streak"],
        "last_active_date": row.get("last_active_date"),
        "streak_freeze_count": row["streak_freeze_count"],
    }


@router.get("/me")
async def get_my_coins(user=Depends(get_current_user)):
    supabase = get_supabase()
    row = _ensure_coin_row(supabase, user["sub"])
    return {"balance": row["balance"], "lifetime_earned": row["lifetime_earned"]}


@router.get("/transactions")
async def get_transactions(
    limit: int = Query(30, ge=1, le=100),
    skip: int = Query(0, ge=0),
    user=Depends(get_current_user),
):
    supabase = get_supabase()
    res = (
        supabase.table("coin_transactions")
        .select("id, amount, type, note, created_at")
        .eq("user_id", user["sub"])
        .order("created_at", desc=True)
        .range(skip, skip + limit - 1)
        .execute()
    )
    return res.data or []


@router.post("/login-reward")
async def claim_login_reward(user=Depends(get_current_user)):
    """
    Idempotent — safe to call on every dashboard load.
    Awards coins once per calendar day (UTC). Also updates streak.
    """
    supabase = get_supabase()
    user_id = user["sub"]
    today = date.today()

    # Check if already claimed today
    already = (
        supabase.table("coin_transactions")
        .select("id")
        .eq("user_id", user_id)
        .eq("type", "login")
        .gte("created_at", f"{today.isoformat()}T00:00:00+00:00")
        .limit(1)
        .execute()
    )
    if already and (already.data or []):
        row = _ensure_coin_row(supabase, user_id)
        streak = _ensure_streak_row(supabase, user_id)
        return {
            "awarded": 0,
            "balance": row["balance"],
            "streak": streak["current_streak"],
            "already_claimed": True,
        }

    # Update streak
    streak = _ensure_streak_row(supabase, user_id)
    last = streak.get("last_active_date")
    last_date = date.fromisoformat(last) if last else None

    if last_date is None or (today - last_date).days > 2:
        new_streak = 1
    elif (today - last_date).days == 1:
        new_streak = streak["current_streak"] + 1
    else:
        # Same day — streak unchanged (shouldn't reach here due to early return, but safety net)
        new_streak = streak["current_streak"]

    new_longest = max(new_streak, streak["longest_streak"])
    supabase.table("user_streaks").update({
        "current_streak": new_streak,
        "longest_streak": new_longest,
        "last_active_date": today.isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }).eq("user_id", user_id).execute()

    # Award login coins
    total_awarded = LOGIN_REWARD
    add_coins(user_id, LOGIN_REWARD, "login", f"Day {new_streak} login")

    # Streak milestone bonus (every 7 days)
    bonus = 0
    if new_streak > 0 and new_streak % 7 == 0:
        bonus = STREAK_7_BONUS
        add_coins(user_id, bonus, "streak_bonus", f"{new_streak}-day streak milestone!")
        total_awarded += bonus

    row = _ensure_coin_row(supabase, user_id)
    return {
        "awarded": total_awarded,
        "balance": row["balance"],
        "streak": new_streak,
        "streak_bonus": bonus,
        "already_claimed": False,
    }


@router.post("/brahmastra-reward")
async def claim_brahmastra_reward(user=Depends(get_current_user)):
    """Award coins for using Brahmastra. Max 3/day."""
    return await _claim_feature_reward(user["sub"], "brahmastra", "Brahmastra oracle used")


@router.post("/predict-reward")
async def claim_predict_reward(user=Depends(get_current_user)):
    """Award coins for running Andaza Laga predictions. Max 3/day."""
    return await _claim_feature_reward(user["sub"], "brahmastra", "Andaza Laga predictions viewed")


async def _claim_feature_reward(user_id: str, tx_type: str, note: str):
    supabase = get_supabase()
    today = date.today()

    already = (
        supabase.table("coin_transactions")
        .select("id")
        .eq("user_id", user_id)
        .eq("type", tx_type)
        .gte("created_at", f"{today.isoformat()}T00:00:00+00:00")
        .execute()
    )
    already_count = len((already.data or []) if already else [])
    if already_count >= 3:
        row = _ensure_coin_row(supabase, user_id)
        return {"awarded": 0, "balance": row["balance"], "limit_reached": True}

    new_balance = add_coins(user_id, BRAHMASTRA_REWARD, tx_type, note)
    return {"awarded": BRAHMASTRA_REWARD, "balance": new_balance, "limit_reached": False}


class SpendRequest(BaseModel):
    item: str  # "ai_query" | "streak_freeze"


@router.post("/spend")
async def spend_coins(req: SpendRequest, user=Depends(get_current_user)):
    supabase = get_supabase()
    user_id = user["sub"]

    if req.item == "ai_query":
        today = date.today()
        today_ai = (
            supabase.table("coin_transactions")
            .select("id")
            .eq("user_id", user_id)
            .eq("type", "spend_ai")
            .gte("created_at", f"{today.isoformat()}T00:00:00+00:00")
            .execute()
        )
        free_used = len(today_ai.data or [])
        if free_used < FREE_AI_QUERIES:
            return {"spent": 0, "free_remaining": FREE_AI_QUERIES - free_used - 1, "balance": _ensure_coin_row(get_supabase(), user_id)["balance"]}
        new_balance = add_coins(user_id, -AI_QUERY_COST, "spend_ai", "Extra AI query")
        return {"spent": AI_QUERY_COST, "free_remaining": 0, "balance": new_balance}

    elif req.item == "streak_freeze":
        streak = _ensure_streak_row(supabase, user_id)
        if streak["streak_freeze_count"] >= 3:
            raise HTTPException(status_code=400, detail="Max 3 streak freezes at a time")
        new_balance = add_coins(user_id, -FREEZE_COST, "spend_freeze", "Streak freeze purchased")
        supabase.table("user_streaks").update({
            "streak_freeze_count": streak["streak_freeze_count"] + 1,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }).eq("user_id", user_id).execute()
        return {"spent": FREEZE_COST, "balance": new_balance, "freeze_count": streak["streak_freeze_count"] + 1}

    raise HTTPException(status_code=400, detail="Unknown item. Use 'ai_query' or 'streak_freeze'")


@router.get("/leaderboard")
async def leaderboard(
    period: str = Query("all", pattern="^(weekly|all)$"),
    limit: int = Query(20, ge=1, le=50),
    user=Depends(get_current_user),
):
    supabase = get_supabase()

    if period == "all":
        rows = (
            supabase.table("user_coins")
            .select("user_id, balance, lifetime_earned, users:user_id(full_name, branch, semester)")
            .order("lifetime_earned", desc=True)
            .limit(limit)
            .execute()
            .data or []
        )
        return [
            {
                "rank": i + 1,
                "user_id": r["user_id"],
                "full_name": (r.get("users") or {}).get("full_name", "Student"),
                "branch": (r.get("users") or {}).get("branch"),
                "semester": (r.get("users") or {}).get("semester"),
                "lifetime_earned": r["lifetime_earned"],
                "balance": r["balance"],
            }
            for i, r in enumerate(rows)
        ]

    # Weekly: sum transactions from last 7 days
    from datetime import timedelta
    cutoff = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    tx_rows = (
        supabase.table("coin_transactions")
        .select("user_id, amount")
        .gte("created_at", cutoff)
        .gt("amount", 0)
        .execute()
        .data or []
    )
    from collections import defaultdict
    weekly: dict = defaultdict(int)
    for t in tx_rows:
        weekly[t["user_id"]] += t["amount"]

    top_ids = sorted(weekly.keys(), key=lambda uid: weekly[uid], reverse=True)[:limit]
    if not top_ids:
        return []

    users_res = (
        supabase.table("users")
        .select("id, full_name, branch, semester")
        .in_("id", top_ids)
        .execute()
        .data or []
    )
    user_map = {u["id"]: u for u in users_res}
    return [
        {
            "rank": i + 1,
            "user_id": uid,
            "full_name": user_map.get(uid, {}).get("full_name", "Student"),
            "branch": user_map.get(uid, {}).get("branch"),
            "semester": user_map.get(uid, {}).get("semester"),
            "weekly_earned": weekly[uid],
        }
        for i, uid in enumerate(top_ids)
    ]
