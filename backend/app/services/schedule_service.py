from app.core.database import get_db


def add_to_queue(user_id: str, payload: dict) -> dict:
    db = get_db()
    result = db.table("post_queue").insert({
        "user_id": user_id,
        "platform": payload["platform"],
        "content": payload["content"],
        "hashtags": payload.get("hashtags", []),
        "scheduled_at": payload["scheduled_at"],
        "content_item_id": payload.get("content_item_id"),
        "media_url": payload.get("media_url"),
        "status": "scheduled",
    }).execute()
    return result.data[0] if result.data else {}


def get_queue(user_id: str, status: str | None = None) -> list:
    db = get_db()
    query = (
        db.table("post_queue")
        .select("*")
        .eq("user_id", user_id)
        .order("scheduled_at", desc=False)
    )
    if status:
        query = query.eq("status", status)
    return query.execute().data or []


def log_posted(user_id: str, platform: str, content: str, media_url: str | None = None) -> None:
    """Create a post_queue record in posted state for direct Post Now actions."""
    from datetime import datetime, timezone
    now = datetime.now(tz=timezone.utc).isoformat()
    try:
        db = get_db()
        db.table("post_queue").insert({
            "user_id": user_id,
            "platform": platform,
            "content": content,
            "hashtags": [],
            "scheduled_at": now,
            "posted_at": now,
            "media_url": media_url,
            "status": "posted",
        }).execute()
    except Exception:
        pass  # Never break the post flow over logging


def get_posted_history(user_id: str, platform: str | None = None) -> list:
    db = get_db()
    query = (
        db.table("post_queue")
        .select("*")
        .eq("user_id", user_id)
        .eq("status", "posted")
        .order("posted_at", desc=True)
    )
    if platform:
        query = query.eq("platform", platform)
    return query.execute().data or []


def delete_queue_post(post_id: str, user_id: str) -> bool:
    db = get_db()
    result = (
        db.table("post_queue")
        .delete()
        .eq("id", post_id)
        .eq("user_id", user_id)
        .execute()
    )
    return bool(result.data)
