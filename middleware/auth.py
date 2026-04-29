from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer
from config import settings
import jwt

security = HTTPBearer()


async def get_current_user(token=Depends(security)):
    try:
        payload = jwt.decode(
            token.credentials,
            options={"verify_signature": False},
            algorithms=["HS256"],
        )
        return payload
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")


def _is_admin(user: dict) -> bool:
    role = user.get("user_metadata", {}).get("role") or user.get("role")
    email = user.get("email") or user.get("user_metadata", {}).get("email", "")
    return role == "admin" or email in settings.admin_emails


async def require_admin(user=Depends(get_current_user)):
    if not _is_admin(user):
        raise HTTPException(status_code=403, detail="Admin only")
    return user
