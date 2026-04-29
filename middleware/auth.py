from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer
from config import settings
import jwt

security = HTTPBearer()


async def get_current_user(token=Depends(security)):
    try:
        payload = jwt.decode(
            token.credentials,
            settings.jwt_secret,
            algorithms=["HS256"],
            options={"verify_exp": True},
            audience="authenticated",
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

    # Block suspended users at auth layer
    user_id = payload.get("sub")
    if user_id:
        try:
            from database import get_supabase
            res = (
                get_supabase()
                .table("users")
                .select("suspended")
                .eq("id", user_id)
                .maybe_single()
                .execute()
            )
            if res.data and res.data.get("suspended"):
                raise HTTPException(status_code=403, detail="Account suspended")
        except HTTPException:
            raise
        except Exception:
            pass  # DB check failure must not block auth

    return payload


def _is_admin(user: dict) -> bool:
    role = user.get("user_metadata", {}).get("role") or user.get("role")
    email = user.get("email") or user.get("user_metadata", {}).get("email", "")
    return role == "admin" or email in settings.admin_emails


async def require_admin(user=Depends(get_current_user)):
    if not _is_admin(user):
        raise HTTPException(status_code=403, detail="Admin only")
    return user
