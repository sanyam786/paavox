from fastapi import APIRouter, Depends
from app.core.auth import get_current_user_id
from app.services.notification_service import get_notifications, mark_read, mark_all_read

router = APIRouter()


@router.get("/")
async def list_notifications(user_id: str = Depends(get_current_user_id)):
    items = get_notifications(user_id)
    unread = sum(1 for n in items if not n.get("read"))
    return {"notifications": items, "unread": unread}


@router.post("/read-all")
async def read_all_notifications(user_id: str = Depends(get_current_user_id)):
    mark_all_read(user_id)
    return {"ok": True}


@router.post("/{notification_id}/read")
async def read_notification(notification_id: str, user_id: str = Depends(get_current_user_id)):
    mark_read(user_id, notification_id)
    return {"ok": True}
