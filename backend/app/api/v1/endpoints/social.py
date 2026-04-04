from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse

from app.core.auth import get_current_user_id
from app.core.config import settings
from app.services.social_service import (
    SUPPORTED_PLATFORMS,
    get_oauth_url,
    decode_oauth_state,
    exchange_code,
    fetch_platform_identity,
    fetch_facebook_pages,
    save_connected_account,
    get_connected_accounts,
    remove_connected_account,
)

router = APIRouter()


@router.get("/connect/{platform}")
async def initiate_oauth(
    platform: str,
    user_id: str = Depends(get_current_user_id),
):
    if platform not in SUPPORTED_PLATFORMS:
        raise HTTPException(400, f"Unsupported platform: {platform}")
    auth_url = get_oauth_url(user_id, platform)
    return {"auth_url": auth_url}


@router.get("/callback/{platform}")
async def oauth_callback(
    platform: str,
    code: str = Query(None),
    state: str = Query(None),
    error: str = Query(None),
):
    frontend = settings.FRONTEND_URL

    if error or not code or not state:
        return RedirectResponse(f"{frontend}/oauth/error?platform={platform}")

    try:
        state_data = decode_oauth_state(state)
        user_id: str = state_data["user_id"]
        code_verifier: str = state_data.get("cv", "")

        tokens = await exchange_code(platform, code, code_verifier)
        access_token: str = tokens.get("access_token", "")

        platform_user_id, username = await fetch_platform_identity(platform, access_token)

        # For Facebook: store page token + page ID directly so posting works
        if platform == "facebook":
            pages = await fetch_facebook_pages(access_token)
            if pages:
                page = pages[0]
                platform_user_id = page["id"]
                username = page["name"]
                if page.get("access_token"):
                    tokens = {**tokens, "access_token": page["access_token"]}

        save_connected_account(user_id, platform, tokens, platform_user_id, username)

        return RedirectResponse(f"{frontend}/oauth/success?platform={platform}")

    except Exception as e:
        print(f"OAuth callback error [{platform}]: {e}")
        return RedirectResponse(f"{frontend}/oauth/error?platform={platform}")


@router.get("/accounts")
async def list_accounts(user_id: str = Depends(get_current_user_id)):
    return {"accounts": get_connected_accounts(user_id)}


@router.delete("/accounts/{platform}")
async def disconnect_account(
    platform: str,
    user_id: str = Depends(get_current_user_id),
):
    remove_connected_account(user_id, platform)
    return {"disconnected": True}


@router.post("/connect-instagram-via-facebook")
async def connect_instagram_via_facebook(user_id: str = Depends(get_current_user_id)):
    """Derive Instagram Business Account from the already-connected Facebook Page."""
    import httpx
    from app.services.posting_service import get_connected_account

    fb = get_connected_account(user_id, "facebook")
    if not fb:
        raise HTTPException(400, "Connect Facebook first, then link Instagram.")

    fb_token = fb["access_token"]
    fb_page_id = fb["platform_user_id"]

    async with httpx.AsyncClient() as client:
        # Get the Instagram Business Account linked to the Facebook Page
        r = await client.get(
            f"https://graph.facebook.com/v18.0/{fb_page_id}",
            params={"fields": "instagram_business_account{id,username}", "access_token": fb_token},
        )
        r.raise_for_status()
        ig_account = r.json().get("instagram_business_account", {})
        ig_id = ig_account.get("id")
        if not ig_id:
            raise HTTPException(400, "No Instagram Business Account found linked to your Facebook Page. Make sure your Instagram is linked to your Facebook Page in Instagram Settings → Account → Linked Accounts.")

        username = ig_account.get("username", "")

    save_connected_account(
        user_id, "instagram",
        {"access_token": fb_token},
        ig_id,
        f"@{username}",
    )
    return {"connected": True, "username": username, "ig_id": ig_id}


