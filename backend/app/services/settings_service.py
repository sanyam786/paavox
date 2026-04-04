from app.core.database import get_db


def get_settings(user_id: str) -> dict:
    db = get_db()
    result = db.table("user_settings").select("*").eq("user_id", user_id).execute()
    return result.data[0] if result.data else {}


def upsert_settings(user_id: str, settings: dict) -> dict:
    db = get_db()
    result = db.table("user_settings").upsert({
        "user_id": user_id,
        **settings,
    }, on_conflict="user_id").execute()
    return result.data[0] if result.data else {}
