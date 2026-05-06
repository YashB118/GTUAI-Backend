"""
Admin-only: coin grants, coupon CRUD, challenge CRUD, user coin overview.
"""
import logging
import secrets
import string
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from database import get_supabase
from middleware.auth import require_admin
from routers.coins import add_coins, _ensure_coin_row, _ensure_streak_row

router = APIRouter(prefix="/admin", tags=["admin-coins"])
logger = logging.getLogger(__name__)


# ── User coin overview ────────────────────────────────────────────────────────

@router.get("/coins/users")
async def list_users_with_coins(
    search: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    skip: int = Query(0, ge=0),
    admin=Depends(require_admin),
):
    supabase = get_supabase()
    q = supabase.table("users").select(
        "id, full_name, email, branch, semester, enrollment_no"
    )
    if search:
        like = f"%{search}%"
        q = q.or_(f"full_name.ilike.{like},email.ilike.{like},enrollment_no.ilike.{like}")
    users = q.eq("role", "student").order("full_name").range(skip, skip + limit - 1).execute().data or []
    if not users:
        return []

    user_ids = [u["id"] for u in users]
    coins_rows = supabase.table("user_coins").select("user_id, balance, lifetime_earned").in_("user_id", user_ids).execute().data or []
    streak_rows = supabase.table("user_streaks").select("user_id, current_streak, longest_streak").in_("user_id", user_ids).execute().data or []

    coins_map  = {r["user_id"]: r for r in coins_rows}
    streak_map = {r["user_id"]: r for r in streak_rows}

    return [
        {
            **u,
            "balance": coins_map.get(u["id"], {}).get("balance", 0),
            "lifetime_earned": coins_map.get(u["id"], {}).get("lifetime_earned", 0),
            "current_streak": streak_map.get(u["id"], {}).get("current_streak", 0),
            "longest_streak": streak_map.get(u["id"], {}).get("longest_streak", 0),
        }
        for u in users
    ]


# ── Manual coin grant ─────────────────────────────────────────────────────────

class GrantCoinsRequest(BaseModel):
    user_id: str
    amount: int = Field(..., gt=0)
    note: str = Field(default="Admin grant", max_length=200)


@router.post("/coins/grant")
async def grant_coins(req: GrantCoinsRequest, admin=Depends(require_admin)):
    supabase = get_supabase()
    user_res = supabase.table("users").select("id").eq("id", req.user_id).limit(1).execute()
    if not (user_res and user_res.data):
        raise HTTPException(status_code=404, detail="User not found")

    new_balance = add_coins(req.user_id, req.amount, "admin_grant", req.note)
    return {"user_id": req.user_id, "granted": req.amount, "balance": new_balance}


@router.get("/coins/transactions/{user_id}")
async def user_coin_history(
    user_id: str,
    limit: int = Query(50, ge=1, le=200),
    skip: int = Query(0, ge=0),
    admin=Depends(require_admin),
):
    supabase = get_supabase()
    res = (
        supabase.table("coin_transactions")
        .select("id, amount, type, note, created_at")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .range(skip, skip + limit - 1)
        .execute()
    )
    return res.data or []


# ── Coupons ───────────────────────────────────────────────────────────────────

def _gen_code(length: int = 8) -> str:
    alphabet = string.ascii_uppercase + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))


class CreateCouponRequest(BaseModel):
    coin_value: int = Field(..., gt=0)
    max_uses: Optional[int] = Field(None, gt=0)
    expires_at: Optional[str] = None   # ISO datetime string
    note: Optional[str] = None
    code: Optional[str] = None         # custom code; auto-generated if omitted


class UpdateCouponRequest(BaseModel):
    is_active: Optional[bool] = None
    max_uses: Optional[int] = None
    expires_at: Optional[str] = None
    note: Optional[str] = None


@router.get("/coupons")
async def list_coupons(
    is_active: Optional[bool] = None,
    limit: int = Query(50, ge=1, le=200),
    skip: int = Query(0, ge=0),
    admin=Depends(require_admin),
):
    supabase = get_supabase()
    q = supabase.table("coupons").select("*")
    if is_active is not None:
        q = q.eq("is_active", is_active)
    return q.order("created_at", desc=True).range(skip, skip + limit - 1).execute().data or []


@router.post("/coupons")
async def create_coupon(req: CreateCouponRequest, admin=Depends(require_admin)):
    supabase = get_supabase()
    code = (req.code or _gen_code()).strip().upper()

    # Ensure unique
    existing = supabase.table("coupons").select("id").eq("code", code).limit(1).execute()
    if existing and existing.data:
        raise HTTPException(status_code=409, detail=f"Code '{code}' already exists")

    payload = {
        "code": code,
        "coin_value": req.coin_value,
        "max_uses": req.max_uses,
        "expires_at": req.expires_at,
        "is_active": True,
        "note": req.note,
        "created_by": admin["sub"],
    }
    res = supabase.table("coupons").insert(payload).execute()
    return res.data[0] if res.data else {}


@router.patch("/coupons/{coupon_id}")
async def update_coupon(coupon_id: str, req: UpdateCouponRequest, admin=Depends(require_admin)):
    supabase = get_supabase()
    payload = {k: v for k, v in req.model_dump().items() if v is not None}
    if not payload:
        raise HTTPException(status_code=400, detail="No fields to update")
    res = supabase.table("coupons").update(payload).eq("id", coupon_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Coupon not found")
    return res.data[0]


@router.delete("/coupons/{coupon_id}")
async def delete_coupon(coupon_id: str, admin=Depends(require_admin)):
    supabase = get_supabase()
    supabase.table("coupons").delete().eq("id", coupon_id).execute()
    return {"deleted": coupon_id}


@router.get("/coupons/{coupon_id}/redemptions")
async def coupon_redemptions(
    coupon_id: str,
    limit: int = Query(50, ge=1, le=200),
    admin=Depends(require_admin),
):
    supabase = get_supabase()
    res = (
        supabase.table("coupon_redemptions")
        .select("id, coins_awarded, redeemed_at, users:user_id(full_name, email, enrollment_no)")
        .eq("coupon_id", coupon_id)
        .order("redeemed_at", desc=True)
        .limit(limit)
        .execute()
    )
    return res.data or []


# ── Daily Challenges ──────────────────────────────────────────────────────────

class CreateChallengeRequest(BaseModel):
    question_text: str
    options: list[str] = Field(..., min_length=4, max_length=4)
    correct_option: int = Field(..., ge=0, le=3)
    explanation: Optional[str] = None
    coin_reward: int = Field(default=15, ge=1)
    active_date: str    # ISO date YYYY-MM-DD
    subject_id: Optional[str] = None


class UpdateChallengeRequest(BaseModel):
    question_text: Optional[str] = None
    options: Optional[list[str]] = None
    correct_option: Optional[int] = None
    explanation: Optional[str] = None
    coin_reward: Optional[int] = None
    active_date: Optional[str] = None
    subject_id: Optional[str] = None


@router.get("/challenges")
async def list_challenges(
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    limit: int = Query(30, ge=1, le=100),
    skip: int = Query(0, ge=0),
    admin=Depends(require_admin),
):
    supabase = get_supabase()
    q = supabase.table("daily_challenges").select(
        "id, question_text, options, correct_option, explanation, coin_reward, active_date, "
        "subjects:subject_id(name, code)"
    )
    if from_date:
        q = q.gte("active_date", from_date)
    if to_date:
        q = q.lte("active_date", to_date)
    return q.order("active_date", desc=True).range(skip, skip + limit - 1).execute().data or []


@router.post("/challenges")
async def create_challenge(req: CreateChallengeRequest, admin=Depends(require_admin)):
    supabase = get_supabase()

    # Validate date format
    try:
        date.fromisoformat(req.active_date)
    except ValueError:
        raise HTTPException(status_code=400, detail="active_date must be YYYY-MM-DD")

    payload = {
        "question_text": req.question_text,
        "options": req.options,
        "correct_option": req.correct_option,
        "explanation": req.explanation,
        "coin_reward": req.coin_reward,
        "active_date": req.active_date,
        "subject_id": req.subject_id,
        "created_by": admin["sub"],
    }
    try:
        res = supabase.table("daily_challenges").insert(payload).execute()
    except Exception as e:
        if "unique" in str(e).lower():
            raise HTTPException(status_code=409, detail=f"A challenge already exists for {req.active_date}")
        raise HTTPException(status_code=500, detail=str(e))
    return res.data[0] if res.data else {}


@router.patch("/challenges/{challenge_id}")
async def update_challenge(challenge_id: str, req: UpdateChallengeRequest, admin=Depends(require_admin)):
    supabase = get_supabase()
    payload = {k: v for k, v in req.model_dump().items() if v is not None}
    if not payload:
        raise HTTPException(status_code=400, detail="No fields to update")
    res = supabase.table("daily_challenges").update(payload).eq("id", challenge_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Challenge not found")
    return res.data[0]


@router.delete("/challenges/{challenge_id}")
async def delete_challenge(challenge_id: str, admin=Depends(require_admin)):
    supabase = get_supabase()
    supabase.table("daily_challenges").delete().eq("id", challenge_id).execute()
    return {"deleted": challenge_id}


@router.get("/analytics/coins")
async def coins_analytics(admin=Depends(require_admin)):
    supabase = get_supabase()

    def _count(table: str) -> int:
        try:
            return supabase.table(table).select("id", count="exact", head=True).execute().count or 0
        except Exception:
            return 0

    # Total coins in circulation
    coins_res = supabase.table("user_coins").select("balance, lifetime_earned").execute().data or []
    total_balance = sum(r.get("balance", 0) for r in coins_res)
    total_lifetime = sum(r.get("lifetime_earned", 0) for r in coins_res)

    # Active streaks
    streaks_res = supabase.table("user_streaks").select("current_streak").gt("current_streak", 0).execute().data or []
    active_streaks = len(streaks_res)
    avg_streak = round(sum(r["current_streak"] for r in streaks_res) / max(active_streaks, 1), 1)

    return {
        "total_coins_in_circulation": total_balance,
        "total_coins_ever_earned": total_lifetime,
        "active_streaks": active_streaks,
        "avg_streak_length": avg_streak,
        "total_coupons": _count("coupons"),
        "total_redemptions": _count("coupon_redemptions"),
        "total_challenge_attempts": _count("challenge_attempts"),
    }
