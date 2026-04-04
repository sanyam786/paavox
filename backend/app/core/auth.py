import jwt
from jwt import PyJWKClient
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.config import settings

security = HTTPBearer(auto_error=False)

# Cached JWKS client — fetches Clerk's public keys once and reuses them
_jwks_client: PyJWKClient | None = None

# Track seen user IDs so we only upsert once per server process lifetime
_seen_users: set[str] = set()


def _get_jwks_client() -> PyJWKClient:
    global _jwks_client
    if _jwks_client is None:
        jwks_url = f"{settings.CLERK_JWT_ISSUER}/.well-known/jwks.json"
        _jwks_client = PyJWKClient(jwks_url, cache_keys=True)
    return _jwks_client


def _ensure_user_exists(user_id: str, payload: dict) -> None:
    """Upsert the user into the users table from JWT claims. Never raises."""
    if user_id in _seen_users:
        return
    try:
        from app.core.database import get_db
        db = get_db()
        email = (
            payload.get("email")
            or payload.get("primary_email_address")
            or f"{user_id}@unknown.clerk"
        )
        first_name = payload.get("first_name") or payload.get("given_name") or ""
        last_name  = payload.get("last_name")  or payload.get("family_name") or ""
        db.table("users").upsert({
            "id":         user_id,
            "email":      email,
            "first_name": first_name,
            "last_name":  last_name,
        }, on_conflict="id").execute()
        _seen_users.add(user_id)
    except Exception as e:
        print(f"[Auth] user upsert failed (non-fatal): {e}")


async def get_current_user_id(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> str:
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")

    token = credentials.credentials

    try:
        client = _get_jwks_client()
        signing_key = client.get_signing_key_from_jwt(token)
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            options={"verify_aud": False},  # Clerk tokens have no audience claim
        )
        user_id: str | None = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Token missing user ID")
        _ensure_user_exists(user_id, payload)
        return user_id

    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {e}")
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Auth failed: {e}")
