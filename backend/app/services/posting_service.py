import json
import httpx
from app.core.database import get_db


async def _refresh_google_token(user_id: str, refresh_token: str) -> str:
    """Exchange a Google refresh token for a fresh access token and persist it."""
    from app.core.config import settings
    async with httpx.AsyncClient() as client:
        r = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "grant_type": "refresh_token",
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "refresh_token": refresh_token,
            },
        )
        if r.status_code != 200:
            raise Exception(f"Google token refresh failed: {r.text[:300]}")
        new_token = r.json().get("access_token", "")
        if not new_token:
            raise Exception("Google token refresh returned no access_token.")
    # Persist the fresh token
    db = get_db()
    db.table("connected_accounts").update({"access_token": new_token}).eq("user_id", user_id).eq("platform", "youtube").execute()
    return new_token

# Platforms that support direct text posting
TEXT_POSTING_SUPPORTED = ["twitter", "linkedin", "facebook"]
# Platforms that require a media URL
MEDIA_POSTING_SUPPORTED = ["instagram"]


def get_access_token(user_id: str, platform: str) -> str | None:
    db = get_db()
    result = (
        db.table("connected_accounts")
        .select("access_token")
        .eq("user_id", user_id)
        .eq("platform", platform)
        .execute()
    )
    return result.data[0]["access_token"] if result.data else None


def get_connected_account(user_id: str, platform: str) -> dict | None:
    db = get_db()
    result = (
        db.table("connected_accounts")
        .select("access_token,refresh_token,platform_user_id")
        .eq("user_id", user_id)
        .eq("platform", platform)
        .execute()
    )
    return result.data[0] if result.data else None


async def _post_twitter(access_token: str, content: str) -> dict:
    async with httpx.AsyncClient() as client:
        r = await client.post(
            "https://api.twitter.com/2/tweets",
            json={"text": content},
            headers={"Authorization": f"Bearer {access_token}"},
        )
        r.raise_for_status()
        return r.json()


async def _post_linkedin(access_token: str, content: str, image_url: str | None = None) -> dict:
    import base64

    headers = {
        "Authorization": f"Bearer {access_token}",
        "X-Restli-Protocol-Version": "2.0.0",
    }

    async def _to_bytes(url: str) -> bytes:
        if url.startswith("data:"):
            _, b64data = url.split(",", 1)
            return base64.b64decode(b64data)
        async with httpx.AsyncClient(timeout=60.0) as dl:
            return (await dl.get(url)).content

    async with httpx.AsyncClient(timeout=60.0) as client:
        # Get LinkedIn person URN
        me = await client.get("https://api.linkedin.com/v2/userinfo", headers=headers)
        me.raise_for_status()
        person_id = me.json().get("sub", "")
        author_urn = f"urn:li:person:{person_id}"

        # Parse image_url: may be a single URL or JSON array
        image_urls: list[str] = []
        if image_url:
            try:
                parsed = json.loads(image_url)
                if isinstance(parsed, list):
                    image_urls = [u for u in parsed if u]
            except (ValueError, TypeError):
                pass
            if not image_urls:
                image_urls = [image_url]

        # Upload each media item and collect asset URNs
        asset_urns: list[str] = []
        for url in image_urls:
            is_vid = _is_video_url(url)
            recipe = "urn:li:digitalmediaRecipe:feedshare-video" if is_vid else "urn:li:digitalmediaRecipe:feedshare-image"
            content_type = "video/mp4" if is_vid else "image/jpeg"

            # Step 1: register upload
            reg = await client.post(
                "https://api.linkedin.com/v2/assets?action=registerUpload",
                json={
                    "registerUploadRequest": {
                        "recipes": [recipe],
                        "owner": author_urn,
                        "serviceRelationships": [{
                            "relationshipType": "OWNER",
                            "identifier": "urn:li:userGeneratedContent",
                        }],
                    }
                },
                headers=headers,
            )
            reg.raise_for_status()
            val = reg.json()["value"]
            upload_url = val["uploadMechanism"]["com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"]["uploadUrl"]
            asset_urn = val["asset"]

            # Step 2: upload bytes
            media_bytes = await _to_bytes(url)
            put = await client.put(
                upload_url,
                content=media_bytes,
                headers={"Authorization": f"Bearer {access_token}", "Content-Type": content_type},
            )
            if put.status_code not in (200, 201):
                raise Exception(f"LinkedIn media upload failed: {put.status_code} {put.text[:200]}")
            asset_urns.append(asset_urn)

        # Build ugcPost
        if asset_urns:
            is_vid_post = image_urls and _is_video_url(image_urls[0])
            media_list = [
                {"status": "READY", "media": urn, "description": {"text": ""}, "title": {"text": ""}}
                for urn in asset_urns
            ]
            share_content = {
                "shareCommentary": {"text": content},
                "shareMediaCategory": "VIDEO" if is_vid_post else "IMAGE",
                "media": media_list,
            }
        else:
            share_content = {
                "shareCommentary": {"text": content},
                "shareMediaCategory": "NONE",
            }

        r = await client.post(
            "https://api.linkedin.com/v2/ugcPosts",
            json={
                "author": author_urn,
                "lifecycleState": "PUBLISHED",
                "specificContent": {"com.linkedin.ugc.ShareContent": share_content},
                "visibility": {"com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"},
            },
            headers=headers,
        )
        r.raise_for_status()
        return r.json()


async def _post_instagram(access_token: str, ig_user_id: str, image_url: str, caption: str) -> dict:
    """Two-step Instagram publish: create container then publish. Supports both images and videos (Reels)."""
    image_url = (image_url or "").strip()
    if not image_url or not image_url.startswith("http"):
        raise Exception("Instagram requires a valid public media URL (must start with http/https).")
    is_vid = _is_video_url(image_url)
    async with httpx.AsyncClient(timeout=120.0) as client:
        # Step 1: create media container
        try:
            if is_vid:
                container_params = {
                    "media_type": "REELS",
                    "video_url": image_url,
                    "caption": caption,
                    "access_token": access_token,
                }
            else:
                container_params = {
                    "image_url": image_url,
                    "caption": caption,
                    "access_token": access_token,
                }
            create = await client.post(
                f"https://graph.facebook.com/v18.0/{ig_user_id}/media",
                params=container_params,
            )
            create.raise_for_status()
        except httpx.HTTPStatusError as e:
            raise Exception(f"Instagram container error: {e.response.text}")
        except Exception as e:
            raise Exception(f"Instagram container request failed: {type(e).__name__}: {e}")

        creation_id = create.json().get("id")

        # For video (Reels), poll until Instagram finishes processing before publishing
        if is_vid:
            import asyncio
            for _ in range(15):  # max ~75 seconds
                await asyncio.sleep(5)
                status_r = await client.get(
                    f"https://graph.facebook.com/v18.0/{creation_id}",
                    params={"fields": "status_code", "access_token": access_token},
                )
                status_code = status_r.json().get("status_code", "")
                if status_code == "FINISHED":
                    break
                if status_code == "ERROR":
                    raise Exception("Instagram video processing failed.")

        try:
            publish = await client.post(
                f"https://graph.facebook.com/v18.0/{ig_user_id}/media_publish",
                params={"creation_id": creation_id, "access_token": access_token},
            )
            publish.raise_for_status()
        except httpx.HTTPStatusError as e:
            raise Exception(f"Instagram publish error: {e.response.text}")

        return publish.json()


async def _post_instagram_carousel(access_token: str, ig_user_id: str, image_urls: list[str], caption: str) -> dict:
    """Instagram carousel post: create one container per image, then a carousel container, then publish."""
    import asyncio

    for url in image_urls:
        if not url or not url.startswith("http"):
            raise Exception(f"Instagram carousel requires valid public image URLs (got: {url[:60]})")

    async def _wait_for_container(client, container_id: str, label: str, initial_wait: int = 10, max_attempts: int = 8, interval: int = 10) -> None:
        """Poll until container status is FINISHED. Raises on ERROR or timeout."""
        await asyncio.sleep(initial_wait)  # let Instagram start processing before first poll
        for attempt in range(max_attempts):
            r = await client.get(
                f"https://graph.facebook.com/v18.0/{container_id}",
                params={"fields": "status_code", "access_token": access_token},
            )
            status = r.json().get("status_code", "")
            print(f"[Instagram] {label} status: {status} (attempt {attempt + 1})")
            if status == "FINISHED":
                return
            if status == "ERROR":
                raise Exception(f"Instagram {label} processing failed (status=ERROR).")
            await asyncio.sleep(interval)
        raise Exception(f"Instagram {label} not ready after {initial_wait + max_attempts * interval}s.")

    async def _create_carousel_item(client, i: int, url: str, max_attempts: int = 3) -> str:
        """Create a single carousel item container, retrying on transient errors."""
        for attempt in range(1, max_attempts + 1):
            r = await client.post(
                f"https://graph.facebook.com/v18.0/{ig_user_id}/media",
                params={"image_url": url, "is_carousel_item": "true", "access_token": access_token},
            )
            if r.status_code == 200:
                return r.json()["id"]
            body = r.json() if r.headers.get("content-type", "").startswith("application/json") else {}
            is_transient = body.get("error", {}).get("is_transient", False)
            if is_transient and attempt < max_attempts:
                print(f"[Instagram] Carousel item {i + 1} transient error (attempt {attempt}) — retrying in 3s…")
                await asyncio.sleep(3)
                continue
            raise Exception(f"Instagram carousel item {i + 1} error: {r.text}")
        raise Exception(f"Instagram carousel item {i + 1} failed after {max_attempts} attempts.")

    async with httpx.AsyncClient(timeout=180.0) as client:
        # Step 1: create a media container for each image
        # Images process in <5s — use a fixed sleep instead of polling to avoid rate limits
        child_ids: list[str] = []
        for i, url in enumerate(image_urls):
            child_id = await _create_carousel_item(client, i, url)
            child_ids.append(child_id)
        await asyncio.sleep(8)  # let all child containers finish processing

        # Step 2: create carousel container referencing all child item IDs
        try:
            r = await client.post(
                f"https://graph.facebook.com/v18.0/{ig_user_id}/media",
                params={
                    "media_type": "CAROUSEL",
                    "children": ",".join(child_ids),
                    "caption": caption,
                    "access_token": access_token,
                },
            )
            r.raise_for_status()
            carousel_id = r.json()["id"]
        except httpx.HTTPStatusError as e:
            raise Exception(f"Instagram carousel container error: {e.response.text}")

        # Step 2b: wait for carousel container — one status check after a fixed delay
        await _wait_for_container(client, carousel_id, "carousel container", initial_wait=10, max_attempts=3, interval=10)

        # Step 3: publish
        try:
            publish = await client.post(
                f"https://graph.facebook.com/v18.0/{ig_user_id}/media_publish",
                params={"creation_id": carousel_id, "access_token": access_token},
            )
            publish.raise_for_status()
        except httpx.HTTPStatusError as e:
            raise Exception(f"Instagram carousel publish error: {e.response.text}")

        return publish.json()


def _is_video_url(url: str) -> bool:
    """Return True if the URL points to a video file."""
    lower = url.lower().split("?")[0]  # strip query params before checking extension
    return any(lower.endswith(ext) for ext in (".mp4", ".mov", ".avi", ".mkv", ".webm", ".m4v"))


async def _post_facebook(page_token: str, page_id: str, content: str, image_url: str | None = None) -> dict:
    import base64, json as _json

    def _raise_fb_error(r):
        try:
            msg = r.json().get("error", {}).get("message", r.text[:300])
        except Exception:
            msg = r.text[:300]
        raise Exception(f"Facebook {r.status_code}: {msg}")

    async def _to_bytes(url: str) -> bytes:
        """Resolve any URL or data URL to raw image bytes."""
        if url.startswith("data:"):
            _, b64data = url.split(",", 1)
            return base64.b64decode(b64data)
        async with httpx.AsyncClient(timeout=60.0) as dl:
            resp = await dl.get(url)
            return resp.content

    # Parse image_url: may be a single URL/data-URL or a JSON array of them
    image_urls: list[str] = []
    if image_url:
        try:
            parsed = _json.loads(image_url)
            if isinstance(parsed, list):
                image_urls = [u for u in parsed if u]
        except (ValueError, TypeError):
            pass
        if not image_urls:
            image_urls = [image_url]

    # Video post: use /videos endpoint with file_url (Facebook fetches it directly)
    if image_urls and _is_video_url(image_urls[0]):
        async with httpx.AsyncClient(timeout=120.0) as client:
            r = await client.post(
                f"https://graph.facebook.com/v18.0/{page_id}/videos",
                data={
                    "access_token": page_token,
                    "description": content,
                    "file_url": image_urls[0],
                },
            )
            if r.status_code != 200:
                _raise_fb_error(r)
            return r.json()

    async with httpx.AsyncClient(timeout=120.0) as client:
        if len(image_urls) > 1:
            # Multi-photo post: upload each image unpublished, then attach all to one feed post
            photo_ids: list[str] = []
            for url in image_urls:
                img_bytes = await _to_bytes(url)
                r = await client.post(
                    f"https://graph.facebook.com/v18.0/{page_id}/photos",
                    data={"access_token": page_token, "published": "false"},
                    files={"source": ("image.jpg", img_bytes, "image/jpeg")},
                )
                if r.status_code != 200:
                    _raise_fb_error(r)
                photo_ids.append(r.json()["id"])

            # Build attached_media list and post to feed
            attached = [{"media_fbid": pid} for pid in photo_ids]
            r = await client.post(
                f"https://graph.facebook.com/v18.0/{page_id}/feed",
                data={
                    "message": content,
                    "access_token": page_token,
                    "attached_media": _json.dumps(attached),
                },
            )
            if r.status_code != 200:
                _raise_fb_error(r)

        elif len(image_urls) == 1:
            # Single photo post
            img_bytes = await _to_bytes(image_urls[0])
            r = await client.post(
                f"https://graph.facebook.com/v18.0/{page_id}/photos",
                data={"caption": content, "access_token": page_token},
                files={"source": ("image.jpg", img_bytes, "image/jpeg")},
            )
            if r.status_code != 200:
                _raise_fb_error(r)

        else:
            # Text-only post
            r = await client.post(
                f"https://graph.facebook.com/v18.0/{page_id}/feed",
                data={"message": content, "access_token": page_token},
            )
            if r.status_code != 200:
                _raise_fb_error(r)

        return r.json()


async def upload_youtube_short(
    user_id: str,
    video_url: str,
    title: str,
    description: str,
    privacy: str = "public",
) -> dict:
    """Download a clip from video_url and upload it to the user's YouTube channel."""
    account = get_connected_account(user_id, "youtube")
    if not account:
        raise Exception("No YouTube account connected. Connect it in Settings first.")

    # Always refresh the Google token before uploading — access tokens expire in ~1 hour
    refresh_token = account.get("refresh_token", "")
    if not refresh_token:
        raise Exception("No YouTube refresh token found. Please reconnect your YouTube account in Settings.")
    access_token = await _refresh_google_token(user_id, refresh_token)

    # Step 1: download the video into memory
    async with httpx.AsyncClient(timeout=120.0) as client:
        dl = await client.get(video_url)
        dl.raise_for_status()
        video_bytes = dl.content

    metadata = {
        "snippet": {
            "title": title[:100],
            "description": description,
            "categoryId": "22",  # People & Blogs
        },
        "status": {
            "privacyStatus": privacy,
            "selfDeclaredMadeForKids": False,
        },
    }

    async with httpx.AsyncClient(timeout=300.0) as client:
        # Step 2: init resumable upload session
        init = await client.post(
            "https://www.googleapis.com/upload/youtube/v3/videos",
            params={"uploadType": "resumable", "part": "snippet,status"},
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json",
                "X-Upload-Content-Type": "video/mp4",
                "X-Upload-Content-Length": str(len(video_bytes)),
            },
            json=metadata,
        )
        if init.status_code not in (200, 201):
            raise Exception(f"YouTube upload init failed: {init.text[:300]}")
        upload_url = init.headers.get("Location")
        if not upload_url:
            raise Exception("YouTube: no upload URL returned from init.")

        # Step 3: upload video bytes
        upload = await client.put(
            upload_url,
            content=video_bytes,
            headers={"Content-Type": "video/mp4"},
        )
        if upload.status_code not in (200, 201):
            raise Exception(f"YouTube upload failed: {upload.text[:300]}")
        data = upload.json()
        video_id = data.get("id", "")
        return {"video_id": video_id, "url": f"https://www.youtube.com/shorts/{video_id}"}


async def post_now(user_id: str, platform: str, content: str, media_url: str | None = None) -> dict:
    all_supported = TEXT_POSTING_SUPPORTED + MEDIA_POSTING_SUPPORTED
    if platform not in all_supported:
        raise Exception(f"Direct posting to {platform} is not yet supported")

    account = get_connected_account(user_id, platform)
    if not account:
        raise Exception(f"No {platform} account connected. Connect it in Settings first.")
    access_token = account["access_token"]

    if platform == "twitter":
        return await _post_twitter(access_token, content)
    if platform == "linkedin":
        return await _post_linkedin(access_token, content, (media_url or "").strip() or None)
    if platform == "facebook":
        if not account.get("platform_user_id"):
            raise Exception("No Facebook Page found. Reconnect your Facebook account in Settings.")
        return await _post_facebook(access_token, account["platform_user_id"], content, (media_url or "").strip() or None)
    if platform == "instagram":
        media_url = (media_url or "").strip() or None
        if not media_url:
            raise Exception("Instagram requires an image URL to post.")
        if not account.get("platform_user_id"):
            raise Exception("No Instagram Business account found. Reconnect Instagram in Settings.")
        # Detect carousel: media_url is a JSON array of multiple URLs
        try:
            urls = json.loads(media_url)
            if isinstance(urls, list) and len(urls) > 1:
                return await _post_instagram_carousel(access_token, account["platform_user_id"], urls, content)
        except (json.JSONDecodeError, TypeError, ValueError):
            pass
        return await _post_instagram(access_token, account["platform_user_id"], media_url, content)


def mark_queue_posted(post_id: str, user_id: str) -> None:
    from datetime import datetime, timezone
    db = get_db()
    db.table("post_queue").update({
        "status": "posted",
        "posted_at": datetime.now(tz=timezone.utc).isoformat(),
    }).eq("id", post_id).eq("user_id", user_id).execute()
