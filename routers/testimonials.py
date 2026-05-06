from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from middleware.auth import get_current_user
from database import get_supabase

router = APIRouter(prefix="/testimonials", tags=["testimonials"])


class TestimonialCreate(BaseModel):
    quote: str
    stars: int = 5
    college: str = ""


@router.get("")
async def list_testimonials():
    supabase = get_supabase()
    res = (
        supabase.table("testimonials")
        .select("id, name, branch, semester, college, quote, stars, created_at")
        .eq("approved", True)
        .order("created_at", desc=True)
        .limit(20)
        .execute()
    )
    return res.data or []


@router.post("")
async def create_testimonial(data: TestimonialCreate, user=Depends(get_current_user)):
    if not 1 <= data.stars <= 5:
        raise HTTPException(status_code=400, detail="Stars must be between 1 and 5")
    if len(data.quote.strip()) < 20:
        raise HTTPException(status_code=400, detail="Review must be at least 20 characters")

    supabase = get_supabase()
    profile_res = (
        supabase.table("users")
        .select("full_name, branch, semester")
        .eq("id", user["sub"])
        .maybe_single()
        .execute()
    )
    p = profile_res.data or {}

    res = supabase.table("testimonials").insert({
        "user_id": user["sub"],
        "name": p.get("full_name") or "GTU Student",
        "branch": p.get("branch"),
        "semester": p.get("semester"),
        "college": data.college.strip() or None,
        "quote": data.quote.strip(),
        "stars": data.stars,
        "approved": True,
    }).execute()

    return res.data[0] if res.data else {}
