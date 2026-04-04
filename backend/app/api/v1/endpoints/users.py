from fastapi import APIRouter, Depends
from app.core.auth import get_current_user_id

router = APIRouter()


@router.get("/me")
async def get_me(user_id: str = Depends(get_current_user_id)):
    """Return the current user's info."""
    return {"userId": user_id}
