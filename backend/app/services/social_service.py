import secrets
import hashlib
import base64
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode

import jwt
import httpx

from app.core.config import settings
from app.core.database import get_db

SUPPORTED_PLATFORMS = ["twitter", "instagram", "linkedin", "facebook", "youtube"]

# Redirect URIs — backends handles the callback, then redirects to frontend
def _redirect_uri(platform: str) -> str:
    return f"http://localhost:8000/api/v1/social/callback/{platform}"


PLATFORM_CONFIG: dict = {
    "twitter": {
        "auth_url": "https://twitter.com/i/oauth2/authorize",
        "token_url": "https://api.twitter.com/2/oauth2/token",
        "scopes": "tweet.read tweet.write users.read offline.access",
        "pkce": True,
    },
    "instagram": {
        "auth_url": "https://www.facebook.com/v18.0/dialog/oauth",
        "token_url": "https://graph.facebook.com/v18.0/oauth/access_token",
        "scopes": "instagram_business_basic,instagram_business_content_publish,instagram_business_manage_comments",
        "pkce": False,
    },
    "linkedin": {
        "auth_url": "https://www.linkedin.com/oauth/v2/authorization",
        "token_url": "https://www.linkedin.com/oauth/v2/accessToken",
        "scopes": "openid profile email w_member_social",
        "pkce": False,
        "credentials_in_body": True,  # LinkedIn requires creds in body, not Basic Auth
    },
    "facebook": {
        "auth_url": "https://www.facebook.com/v18.0/dialog/oauth",
        "token_url": "https://graph.facebook.com/v18.0/oauth/access_token",
        "scopes": "public_profile,business_management,pages_show_list,pages_manage_posts,pages_manage_engagement,pages_read_engagement,pages_read_user_content,instagram_basic,instagram_content_publish",
        "pkce": False,
    },
    "youtube": {
        "auth_url": "https://accounts.google.com/o/oauth2/v2/auth",
        "token_url": "https://oauth2.googleapis.com/token",
        "scopes": "https://www.googleapis.com/auth/youtube https://www.googleapis.com/auth/youtube.upload",
        "pkce": False,
    },
}

_CLIENT_IDS = {
    "twitter":   lambda: settings.TWITTER_CLIENT_ID,
    "instagram": lambda: settings.FACEBOOK_APP_ID,         # Instagram uses auth Facebook app
    "linkedin":  lambda: settings.LINKEDIN_CLIENT_ID,
    "facebook":  lambda: settings.FACEBOOK_PAGES_APP_ID,
    "youtube":   lambda: settings.GOOGLE_CLIENT_ID,
}

_CLIENT_SECRETS = {
    "twitter":   lambda: settings.TWITTER_CLIENT_SECRET,
    "instagram": lambda: settings.FACEBOOK_APP_SECRET,         # Instagram uses auth Facebook app
    "linkedin":  lambda: settings.LINKEDIN_CLIENT_SECRET,
    "facebook":  lambda: settings.FACEBOOK_PAGES_APP_SECRET,
    "youtube":   lambda: settings.GOOGLE_CLIENT_SECRET,
}


# ── PKCE helpers ──────────────────────────────────────────────────────────────

def _generate_pkce() -> tuple[str, str]:
    code_verifier = base64.urlsafe_b64encode(secrets.token_bytes(32)).rstrip(b"=").decode()
    digest = hashlib.sha256(code_verifier.encode()).digest()
    code_challenge = base64.urlsafe_b64encode(digest).rstrip(b"=").decode()
    return code_verifier, code_challenge


# ── OAuth state (signed JWT) ──────────────────────────────────────────────────

def create_oauth_state(user_id: str, platform: str, code_verifier: str = "") -> str:
    payload = {
        "user_id": user_id,
        "platform": platform,
        "cv": code_verifier,
        "exp": datetime.now(tz=timezone.utc) + timedelta(minutes=10),
    }
    return jwt.encode(payload, settings.APP_SECRET_KEY, algorithm="HS256")


def decode_oauth_state(state: str) -> dict:
    return jwt.decode(state, settings.APP_SECRET_KEY, algorithms=["HS256"])


# ── OAuth URL builder ─────────────────────────────────────────────────────────

def build_oauth_url(platform: str, state: str, code_challenge: str = "") -> str:
    cfg = PLATFORM_CONFIG[platform]
    params: dict = {
        "client_id": _CLIENT_IDS[platform](),
        "redirect_uri": _redirect_uri(platform),
        "scope": cfg["scopes"],
        "state": state,
        "response_type": "code",
    }
    if cfg["pkce"]:
        params["code_challenge"] = code_challenge
        params["code_challenge_method"] = "S256"
    # Google requires access_type=offline to get refresh token
    if platform == "youtube":
        params["access_type"] = "offline"
        params["prompt"] = "consent"
    return f"{cfg['auth_url']}?{urlencode(params)}"


def get_oauth_url(user_id: str, platform: str) -> str:
    cfg = PLATFORM_CONFIG[platform]
    code_verifier = code_challenge = ""
    if cfg["pkce"]:
        code_verifier, code_challenge = _generate_pkce()
    state = create_oauth_state(user_id, platform, code_verifier)
    return build_oauth_url(platform, state, code_challenge)


# ── Token exchange ────────────────────────────────────────────────────────────

async def exchange_code(platform: str, code: str, code_verifier: str = "") -> dict:
    cfg = PLATFORM_CONFIG[platform]
    data: dict = {
        "code": code,
        "redirect_uri": _redirect_uri(platform),
        "grant_type": "authorization_code",
    }
    if cfg.get("credentials_in_body"):
        # Credentials in POST body, no Basic Auth (e.g. LinkedIn)
        data["client_id"] = _CLIENT_IDS[platform]()
        data["client_secret"] = _CLIENT_SECRETS[platform]()
        auth = None
    else:
        # Basic Auth for all others (Twitter, Facebook, Google, Instagram)
        auth = (_CLIENT_IDS[platform](), _CLIENT_SECRETS[platform]())
        if cfg["pkce"]:
            # Twitter PKCE: also send client_id + code_verifier in body
            data["client_id"] = _CLIENT_IDS[platform]()
            data["code_verifier"] = code_verifier

    async with httpx.AsyncClient() as client:
        resp = await client.post(cfg["token_url"], data=data, auth=auth)
        resp.raise_for_status()
        return resp.json()


# ── Fetch platform username after connecting ──────────────────────────────────

async def fetch_platform_identity(platform: str, access_token: str) -> tuple[str, str]:
    """Returns (platform_user_id, display_name/username). Best-effort."""
    try:
        async with httpx.AsyncClient() as client:
            if platform == "twitter":
                r = await client.get(
                    "https://api.twitter.com/2/users/me",
                    headers={"Authorization": f"Bearer {access_token}"},
                )
                d = r.json().get("data", {})
                return d.get("id", ""), f"@{d.get('username', '')}"

            if platform == "instagram":
                # New Instagram Graph API for Business accounts
                r = await client.get(
                    "https://graph.instagram.com/v21.0/me",
                    params={"fields": "id,username,account_type", "access_token": access_token},
                )
                if r.is_success:
                    d = r.json()
                    return d.get("id", ""), f"@{d.get('username', '')}"
                # Fallback: try via Facebook pages
                r2 = await client.get(
                    "https://graph.facebook.com/v18.0/me/accounts",
                    params={"fields": "instagram_business_account{id,username}", "access_token": access_token},
                )
                for page in r2.json().get("data", []):
                    ig = page.get("instagram_business_account")
                    if ig:
                        return ig.get("id", ""), f"@{ig.get('username', '')}"
                return "", ""

            if platform == "linkedin":
                r = await client.get(
                    "https://api.linkedin.com/v2/userinfo",
                    headers={"Authorization": f"Bearer {access_token}"},
                )
                d = r.json()
                return d.get("sub", ""), d.get("name", "")

            if platform == "facebook":
                # Prefer page identity over personal profile
                pages = await fetch_facebook_pages(access_token)
                if pages:
                    return pages[0].get("id", ""), pages[0].get("name", "")
                # Fallback to personal profile (posting will be unavailable)
                r = await client.get(
                    "https://graph.facebook.com/me",
                    params={"fields": "id,name", "access_token": access_token},
                )
                d = r.json()
                return d.get("id", ""), d.get("name", "")

            if platform == "youtube":
                r = await client.get(
                    "https://www.googleapis.com/youtube/v3/channels",
                    params={"part": "snippet", "mine": "true"},
                    headers={"Authorization": f"Bearer {access_token}"},
                )
                items = r.json().get("items", [])
                if items:
                    return items[0].get("id", ""), items[0]["snippet"].get("title", "")
    except Exception:
        pass
    return "", ""


# ── Supabase persistence ──────────────────────────────────────────────────────

def save_connected_account(
    user_id: str,
    platform: str,
    tokens: dict,
    platform_user_id: str,
    username: str,
) -> None:
    db = get_db()
    db.table("connected_accounts").upsert(
        {
            "user_id": user_id,
            "platform": platform,
            "platform_user_id": platform_user_id,
            "platform_username": username,
            "access_token": tokens.get("access_token", ""),
            "refresh_token": tokens.get("refresh_token", ""),
        },
        on_conflict="user_id,platform",
    ).execute()


def get_connected_accounts(user_id: str) -> list:
    db = get_db()
    result = (
        db.table("connected_accounts")
        .select("id,platform,platform_username,platform_user_id,created_at")
        .eq("user_id", user_id)
        .execute()
    )
    return result.data or []


def remove_connected_account(user_id: str, platform: str) -> None:
    db = get_db()
    db.table("connected_accounts").delete().eq("user_id", user_id).eq("platform", platform).execute()


async def fetch_facebook_pages(user_access_token: str) -> list[dict]:
    """
    Returns pages the user manages, with page-level access tokens.
    Tries /me/accounts first (personally owned), then /me/businesses (business portfolio owned).
    """
    async with httpx.AsyncClient() as client:
        # 1. Personally owned pages
        r = await client.get(
            "https://graph.facebook.com/v18.0/me/accounts",
            params={"fields": "id,name,access_token", "access_token": user_access_token},
        )
        if r.is_success:
            pages = r.json().get("data", [])
            if pages:
                return pages

        # 2. Business portfolio owned pages
        r2 = await client.get(
            "https://graph.facebook.com/v18.0/me/businesses",
            params={"fields": "owned_pages{id,name,access_token}", "access_token": user_access_token},
        )
        if r2.is_success:
            for biz in r2.json().get("data", []):
                owned = biz.get("owned_pages", {}).get("data", [])
                if owned:
                    return owned

        return []
