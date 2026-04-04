from fastapi import APIRouter, Depends, HTTPException, Query
from app.core.auth import get_current_user_id
from app.services.content_service import get_recent_content, get_all_content, delete_content_item

router = APIRouter()


@router.get("/recent")
async def list_recent_content(
    limit: int = Query(default=5, le=20),
    user_id: str = Depends(get_current_user_id),
):
    items = get_recent_content(user_id, limit=limit)
    return {"items": items, "total": len(items)}


@router.get("/")
async def list_all_content(
    platform: str | None = Query(default=None),
    type: str | None = Query(default=None),
    user_id: str = Depends(get_current_user_id),
):
    try:
        items = get_all_content(user_id, platform=platform, type=type)
        return {"items": items, "total": len(items)}
    except Exception as e:
        print(f"[Content] fetch error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{item_id}")
async def remove_content_item(
    item_id: str,
    user_id: str = Depends(get_current_user_id),
):
    success = delete_content_item(item_id, user_id)
    if not success:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Item not found")
    return {"deleted": True}
