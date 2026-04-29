from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel, EmailStr
from database import get_supabase
from middleware.auth import require_admin

router = APIRouter(prefix="/auth", tags=["auth"])


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    enrollment_no: str
    branch: str
    semester: int
    college: str | None = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


@router.post("/register")
async def register(data: RegisterRequest):
    supabase = get_supabase()
    try:
        res = supabase.auth.sign_up(
            {
                "email": data.email,
                "password": data.password,
                "options": {
                    "data": {
                        "full_name": data.full_name,
                        "role": "student",
                    }
                },
            }
        )
        if res.user:
            supabase.table("users").insert(
                {
                    "id": res.user.id,
                    "email": data.email,
                    "full_name": data.full_name,
                    "role": "student",
                    "enrollment_no": data.enrollment_no,
                    "branch": data.branch,
                    "semester": data.semester,
                    "college": data.college,
                }
            ).execute()
        return {"message": "Registration successful. Check your email to verify."}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/login")
async def login(data: LoginRequest):
    supabase = get_supabase()
    try:
        res = supabase.auth.sign_in_with_password(
            {"email": data.email, "password": data.password}
        )
        return {
            "access_token": res.session.access_token,
            "refresh_token": res.session.refresh_token,
            "user": {
                "id": res.user.id,
                "email": res.user.email,
                "role": res.user.user_metadata.get("role", "student"),
            },
        }
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))


@router.get("/users")
async def list_users(
    limit: int = Query(50, ge=1, le=200),
    skip: int = Query(0, ge=0),
    admin=Depends(require_admin),
):
    supabase = get_supabase()
    res = (
        supabase.table("users")
        .select("id, full_name, email, branch, semester, enrollment_no, role, created_at")
        .order("created_at", desc=True)
        .range(skip, skip + limit - 1)
        .execute()
    )
    return res.data or []
