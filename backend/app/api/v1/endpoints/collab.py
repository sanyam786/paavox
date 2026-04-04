from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.core.auth import get_current_user_id
from app.services.agents.collab_agent import CollabAgent
from app.services.content_service import log_agent_run
from app.core.database import get_db

router = APIRouter()


class CollabRequest(BaseModel):
    niche: str
    collab_type: str
    platform: str
    your_value: str
    brand_name: str = ""
    audience_size: str = ""
    location: str = ""


@router.post("/find")
async def find_collaborators(
    payload: CollabRequest,
    user_id: str = Depends(get_current_user_id),
):
    try:
        if not payload.brand_name:
            db = get_db()
            row = db.table("user_settings").select("niche").eq("user_id", user_id).execute()
            if row.data:
                payload.brand_name = row.data[0].get("niche", "")

        agent = CollabAgent()
        result = await agent.run(
            niche=payload.niche,
            collab_type=payload.collab_type,
            platform=payload.platform,
            your_value=payload.your_value,
            brand_name=payload.brand_name,
            audience_size=payload.audience_size,
            location=payload.location,
        )
        log_agent_run(user_id, "collab", {"niche": payload.niche, "collab_type": payload.collab_type, "platform": payload.platform})
        return result
    except Exception as e:
        raise HTTPException(500, detail=str(e))
