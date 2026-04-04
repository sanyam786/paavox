from datetime import datetime, timezone
from app.core.database import get_db


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def create_pipeline(user_id: str, name: str) -> dict:
    db = get_db()
    result = db.table("pipelines").insert({
        "user_id": user_id,
        "name": name,
        "status": "in_progress",
        "current_step": 0,
        "topic": "",
        "content_format": "",
        "content_body": "",
        "caption": "",
        "hashtags": [],
        "image_url": "",
        "platform": "",
        "scheduled_time": "",
        "posted": False,
    }).execute()
    return result.data[0]


def list_pipelines(user_id: str) -> list:
    db = get_db()
    # Exclude large fields (image_url, content_body) from the list view to avoid timeouts
    result = (
        db.table("pipelines")
        .select("id,user_id,name,status,current_step,topic,content_format,platform,posted,created_at,updated_at")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )
    return result.data


def get_pipeline(user_id: str, pipeline_id: str) -> dict | None:
    db = get_db()
    result = (
        db.table("pipelines")
        .select("*")
        .eq("user_id", user_id)
        .eq("id", pipeline_id)
        .execute()
    )
    return result.data[0] if result.data else None


def update_pipeline(user_id: str, pipeline_id: str, updates: dict) -> dict:
    db = get_db()
    updates["updated_at"] = _now()
    result = (
        db.table("pipelines")
        .update(updates)
        .eq("user_id", user_id)
        .eq("id", pipeline_id)
        .execute()
    )
    return result.data[0] if result.data else {}


def delete_pipeline(user_id: str, pipeline_id: str) -> bool:
    db = get_db()
    db.table("pipelines").delete().eq("user_id", user_id).eq("id", pipeline_id).execute()
    return True
