from app.core.database import get_db


def create_brand(user_id: str, data: dict) -> dict:
    db = get_db()
    result = db.table("brands").insert({"user_id": user_id, **data}).execute()
    return result.data[0]


def list_brands(user_id: str) -> list:
    db = get_db()
    result = db.table("brands").select("*").eq("user_id", user_id).order("created_at").execute()
    return result.data


def get_brand(user_id: str, brand_id: str) -> dict | None:
    db = get_db()
    result = db.table("brands").select("*").eq("user_id", user_id).eq("id", brand_id).execute()
    return result.data[0] if result.data else None


def update_brand(user_id: str, brand_id: str, data: dict) -> dict:
    db = get_db()
    result = db.table("brands").update(data).eq("user_id", user_id).eq("id", brand_id).execute()
    return result.data[0]


def delete_brand(user_id: str, brand_id: str):
    db = get_db()
    db.table("brands").delete().eq("user_id", user_id).eq("id", brand_id).execute()


def set_active_brand(user_id: str, brand_id: str) -> dict:
    db = get_db()
    result = db.table("user_settings").upsert(
        {"user_id": user_id, "active_brand_id": brand_id},
        on_conflict="user_id",
    ).execute()
    return result.data[0] if result.data else {}


def get_active_brand_id(user_id: str) -> str | None:
    db = get_db()
    result = db.table("user_settings").select("active_brand_id").eq("user_id", user_id).execute()
    return result.data[0].get("active_brand_id") if result.data else None
