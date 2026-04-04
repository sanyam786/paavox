from fastapi import APIRouter, Depends, HTTPException
from app.core.auth import get_current_user_id
from app.schemas.settings import UserSettings
from app.services.settings_service import get_settings, upsert_settings

router = APIRouter()


@router.get("/")
async def get_user_settings(user_id: str = Depends(get_current_user_id)):
    try:
        return get_settings(user_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/")
async def update_user_settings(
    settings: UserSettings,
    user_id: str = Depends(get_current_user_id),
):
    try:
        return upsert_settings(user_id, settings.model_dump())
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
