from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer
from config import settings
import jwt
from jwt import PyJWKClient

security = HTTPBearer()

# Cached JWKS client — fetches Supabase public keys once, then caches
_jwks_client: PyJWKClient | None = None


def _get_jwks_client() -> PyJWKClient:
    global _jwks_client
    if _jwks_client is None:
        _jwks_client = PyJWKClient(
            f"{settings.supabase_url}/auth/v1/.well-known/jwks.json",
            cache_keys=True,
        )
    return _jwks_client


async def get_current_user(token=Depends(security)):
    try:
        client = _get_jwks_client()
        signing_key = client.get_signing_key_from_jwt(token.credentials)
        payload = jwt.decode(
            token.credentials,
            signing_key.key,
            algorithms=["ES256", "RS256", "HS256"],
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
