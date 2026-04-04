from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.core.auth import get_current_user_id
from app.services.agents.influencer_agent import InfluencerAgent
from app.services.content_service import log_agent_run
from app.core.database import get_db

router = APIRouter()


class InfluencerRequest(BaseModel):
    niche: str
    platform: str
    follower_range: str
    campaign_goal: str
    brand_name: str = ""
    location: str = ""


@router.post("/find")
async def find_influencers(
    payload: InfluencerRequest,
    user_id: str = Depends(get_current_user_id),
):
    try:
        # Auto-fill brand name from settings if not provided
        if not payload.brand_name:
            db = get_db()
            row = db.table("user_settings").select("niche").eq("user_id", user_id).execute()
            if row.data:
                payload.brand_name = row.data[0].get("niche", "")

        agent = InfluencerAgent()
        result = await agent.run(
            niche=payload.niche,
            platform=payload.platform,
            follower_range=payload.follower_range,
            campaign_goal=payload.campaign_goal,
            brand_name=payload.brand_name,
            location=payload.location,
        )
        log_agent_run(user_id, "influencer", {"niche": payload.niche, "platform": payload.platform, "follower_range": payload.follower_range})
        return result
    except Exception as e:
        raise HTTPException(500, detail=str(e))
