"""
Coupon redemption — student-facing only.
Admin coupon management is in admin_coins.py.
"""
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from database import get_supabase
from middleware.auth import get_current_user
from routers.coins import add_coins

router = APIRouter(prefix="/coupons", tags=["coupons"])
logger = logging.getLogger(__name__)


def _one(res) -> dict | None:
    if res is None:
        return None
    rows = res.data or []
    return rows[0] if rows else None


class RedeemRequest(BaseModel):
    code: str


@router.post("/redeem")
async def redeem_coupon(req: RedeemRequest, user=Depends(get_current_user)):
    supabase = get_supabase()
    user_id = user["sub"]
    code = req.code.strip().upper()

    c = _one(
        supabase.table("coupons")
        .select("id, coin_value, max_uses, used_count, expires_at, is_active")
        .eq("code", code)
        .limit(1)
        .execute()
    )
    if not c:
        raise HTTPException(status_code=404, detail="Invalid coupon code")

    if not c["is_active"]:
        raise HTTPException(status_code=400, detail="Coupon is no longer active")
    if c["expires_at"] and datetime.now(timezone.utc).isoformat() > c["expires_at"]:
        raise HTTPException(status_code=400, detail="Coupon has expired")
    if c["max_uses"] is not None and c["used_count"] >= c["max_uses"]:
        raise HTTPException(status_code=400, detail="Coupon has reached its usage limit")

    already = _one(
        supabase.table("coupon_redemptions")
        .select("id")
        .eq("coupon_id", c["id"])
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    if already:
        raise HTTPException(status_code=409, detail="You have already used this coupon")

    supabase.table("coupon_redemptions").insert({
        "coupon_id": c["id"],
        "user_id": user_id,
        "coins_awarded": c["coin_value"],
    }).execute()

    supabase.table("coupons").update({
        "used_count": c["used_count"] + 1
    }).eq("id", c["id"]).execute()

    new_balance = add_coins(user_id, c["coin_value"], "coupon", f"Coupon: {code}", ref_id=c["id"])

    return {
        "coins_awarded": c["coin_value"],
        "balance": new_balance,
        "message": f"Coupon redeemed! +{c['coin_value']} coins added.",
    }
