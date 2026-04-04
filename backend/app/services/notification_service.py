from app.core.database import get_db


def create_notification(user_id: str, type: str, title: str, body: str = "", link: str = "") -> dict:
    try:
        db = get_db()
        result = db.table("notifications").insert({
            "user_id": user_id,
            "type": type,
            "title": title,
            "body": body,
            "link": link,
            "read": False,
        }).execute()
        return result.data[0] if result.data else {}
    except Exception as e:
        print(f"[Notifications] Failed to create: {e}")
        return {}


def get_notifications(user_id: str, limit: int = 30) -> list:
    db = get_db()
    result = (
        db.table("notifications")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    return result.data or []


def mark_read(user_id: str, notification_id: str) -> None:
    db = get_db()
    db.table("notifications").update({"read": True}).eq("id", notification_id).eq("user_id", user_id).execute()


def mark_all_read(user_id: str) -> None:
    db = get_db()
    db.table("notifications").update({"read": True}).eq("user_id", user_id).eq("read", False).execute()
