from app.core.database import get_db
from app.schemas.agents import CaptionResponse


def _delete_short_file(serve_url: str) -> None:
    """Delete a clip — from Cloudinary if it's a CDN URL, otherwise from local disk."""
    if "cloudinary.com" in serve_url:
        from app.core.cloud_storage import delete_clip_from_cloud
        delete_clip_from_cloud(serve_url)
    else:
        from app.core.clips_store import delete_clip
        clip_id = serve_url.rstrip("/").split("/")[-1]
        delete_clip(clip_id)


def save_caption(user_id: str, request_data: dict, result: CaptionResponse) -> dict:
    """Save a caption generation to Supabase."""
    db = get_db()

    # Save agent run
    run = db.table("agent_runs").insert({
        "user_id": user_id,
        "agent_type": "caption",
        "status": "completed",
        "input": request_data,
        "output": {
            "caption": result.caption,
            "hashtags": result.hashtags,
            "character_count": result.character_count,
            "platform": result.platform.value,
        },
    }).execute()

    run_id = run.data[0]["id"] if run.data else None

    # Save content item
    item = db.table("content_items").insert({
        "user_id": user_id,
        "agent_run_id": run_id,
        "platform": result.platform.value,
        "type": "caption",
        "content": result.caption,
        "hashtags": result.hashtags,
        "original_content": request_data.get("content", ""),
    }).execute()

    return item.data[0] if item.data else {}


def log_agent_run(user_id: str, agent_type: str, input_data: dict = {}, output_data: dict = {}) -> None:
    """Log a completed agent run for analytics tracking."""
    try:
        db = get_db()
        db.table("agent_runs").insert({
            "user_id": user_id,
            "agent_type": agent_type,
            "status": "completed",
            "input": input_data,
            "output": output_data,
        }).execute()
    except Exception:
        pass  # Never let analytics logging break the main flow


def get_recent_content(user_id: str, limit: int = 10) -> list:
    """Fetch recent content items for a user."""
    db = get_db()
    result = (
        db.table("content_items")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    return result.data or []


def get_all_content(user_id: str, platform: str | None = None, type: str | None = None) -> list:
    """Fetch all content items, optionally filtered by platform and/or type."""
    db = get_db()
    query = (
        db.table("content_items")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
    )
    if platform:
        query = query.eq("platform", platform)
    if type:
        query = query.eq("type", type)
    return query.limit(50).execute().data or []


def delete_content_item(item_id: str, user_id: str) -> bool:
    """Delete a content item (only if it belongs to the user).
    For youtube_short items, also removes the file from Supabase Storage."""
    db = get_db()
    # Fetch first so we can clean up storage for shorts
    row = db.table("content_items").select("id, type, content").eq("id", item_id).eq("user_id", user_id).execute()
    if not row.data:
        return False
    item = row.data[0]
    if item["type"] == "youtube_short" and item.get("content"):
        try:
            _delete_short_file(item["content"])
        except Exception:
            pass
    result = db.table("content_items").delete().eq("id", item_id).eq("user_id", user_id).execute()
    return bool(result.data)


def save_youtube_short(user_id: str, title: str, public_url: str, source_url: str, duration: int) -> dict:
    """Save a YouTube Shorts clip to content_items after upload to Supabase Storage."""
    import json as _json
    db = get_db()
    item = db.table("content_items").insert({
        "user_id": user_id,
        "platform": "youtube",
        "type": "youtube_short",
        "content": public_url,
        "hashtags": [],
        "original_content": _json.dumps({"title": title, "source_url": source_url, "duration": duration}),
    }).execute()
    return item.data[0] if item.data else {}


def cleanup_expired_shorts(user_id: str) -> None:
    """Delete youtube_short items older than 10 days, including their storage files."""
    from datetime import datetime, timedelta, timezone
    db = get_db()
    cutoff = (datetime.now(timezone.utc) - timedelta(days=10)).isoformat()
    old = (
        db.table("content_items")
        .select("id, content")
        .eq("user_id", user_id)
        .eq("type", "youtube_short")
        .lt("created_at", cutoff)
        .execute()
    )
    for item in (old.data or []):
        try:
            if item.get("content"):
                _delete_short_file(item["content"])
        except Exception:
            pass
        try:
            db.table("content_items").delete().eq("id", item["id"]).execute()
        except Exception:
            pass


def save_repurposed(user_id: str, payload: dict) -> dict:
    """Save a reviewed repurposed content item."""
    db = get_db()

    run = db.table("agent_runs").insert({
        "user_id": user_id,
        "agent_type": "repurpose",
        "status": "completed",
        "input": {
            "content": payload.get("original_content"),
            "source_platform": payload.get("source_platform"),
            "target_platform": payload.get("platform"),
        },
        "output": {
            "repurposed_content": payload.get("content"),
            "changes": payload.get("changes", []),
        },
    }).execute()

    run_id = run.data[0]["id"] if run.data else None

    item = db.table("content_items").insert({
        "user_id": user_id,
        "agent_run_id": run_id,
        "platform": payload.get("platform"),
        "type": "repurposed",
        "content": payload.get("content"),
        "hashtags": [],
        "original_content": payload.get("original_content"),
    }).execute()

    return item.data[0] if item.data else {}


def save_generated_image(user_id: str, request_data: dict, result) -> dict:
    """Save an image generation result to Supabase."""
    db = get_db()

    run = db.table("agent_runs").insert({
        "user_id": user_id,
        "agent_type": "image_generator",
        "status": "completed",
        "input": request_data,
        "output": {
            "image_url": result.image_url,
            "prompt_used": result.prompt_used,
            "width": result.width,
            "height": result.height,
            "platform": result.platform,
        },
    }).execute()

    run_id = run.data[0]["id"] if run.data else None

    item = db.table("content_items").insert({
        "user_id": user_id,
        "agent_run_id": run_id,
        "platform": request_data.get("platform", "general"),
        "type": "image",
        "content": result.image_url,
        "hashtags": [],
        "original_content": request_data.get("description", ""),
    }).execute()

    return item.data[0] if item.data else {}


def save_written_content(user_id: str, request_data: dict, result) -> dict:
    """Save a content writer result to Supabase."""
    db = get_db()

    run = db.table("agent_runs").insert({
        "user_id": user_id,
        "agent_type": "content_writer",
        "status": "completed",
        "input": request_data,
        "output": {
            "title": result.title,
            "body": result.body,
            "content_format": result.content_format.value,
            "word_count": result.word_count,
        },
    }).execute()

    run_id = run.data[0]["id"] if run.data else None

    format_to_platform = {
        "linkedin_post":  "linkedin",
        "tiktok_script":  "tiktok",
        "reels_script":   "instagram",
        "youtube_script": "youtube",
        "tweet_thread":   "twitter",
        "blog_post":      "general",
        "newsletter":     "general",
        "carousel":       "instagram",
    }
    content_format = request_data.get("content_format", "")
    platform = format_to_platform.get(content_format, "general")

    item = db.table("content_items").insert({
        "user_id": user_id,
        "agent_run_id": run_id,
        "platform": platform,
        "type": "written",
        "content": f"{result.title}\n\n{result.body}",
        "hashtags": [],
        "original_content": request_data.get("topic", ""),
    }).execute()

    return item.data[0] if item.data else {}


def save_video(user_id: str, request_data: dict, result) -> dict:
    """Save a video generation result to Supabase."""
    import json as _json
    if not result.video_url:
        return {}  # Don't save failed generations

    db = get_db()

    run = db.table("agent_runs").insert({
        "user_id": user_id,
        "agent_type": "video_creator",
        "status": "completed",
        "input": request_data,
        "output": {
            "video_url": result.video_url,
            "script": result.script,
            "aspect_ratio": result.aspect_ratio,
            "duration": result.duration,
            "prompt_used": result.prompt_used,
        },
    }).execute()

    run_id = run.data[0]["id"] if run.data else None

    # Derive platform from aspect ratio
    aspect_to_platform = {"9:16": "tiktok", "16:9": "youtube", "1:1": "instagram"}
    platform = aspect_to_platform.get(result.aspect_ratio, "tiktok")

    metadata = _json.dumps({
        "topic": request_data.get("topic", ""),
        "style": request_data.get("style", "cinematic"),
        "aspect_ratio": result.aspect_ratio,
        "duration": result.duration,
    })

    item = db.table("content_items").insert({
        "user_id": user_id,
        "agent_run_id": run_id,
        "platform": platform,
        "type": "video",
        "content": result.video_url,
        "hashtags": [],
        "original_content": metadata,
    }).execute()

    return item.data[0] if item.data else {}


def save_trend(user_id: str, payload: dict) -> dict:
    """Save a trend research result."""
    db = get_db()

    run = db.table("agent_runs").insert({
        "user_id": user_id,
        "agent_type": "trend",
        "status": "completed",
        "input": {"niche": payload.get("niche")},
        "output": {
            "topic": payload.get("topic"),
            "score": payload.get("score"),
            "content_ideas": payload.get("content_ideas", []),
            "hashtags": payload.get("hashtags", []),
        },
    }).execute()

    run_id = run.data[0]["id"] if run.data else None

    content_text = f"Trend: {payload.get('topic')}\n\nContent Ideas:\n" + \
        "\n".join(f"• {idea}" for idea in payload.get("content_ideas", []))

    item = db.table("content_items").insert({
        "user_id": user_id,
        "agent_run_id": run_id,
        "platform": payload.get("platform", "instagram"),
        "type": "trend-based",
        "content": content_text,
        "hashtags": payload.get("hashtags", []),
        "original_content": payload.get("niche", ""),
    }).execute()

    return item.data[0] if item.data else {}
