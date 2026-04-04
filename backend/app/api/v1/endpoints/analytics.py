from fastapi import APIRouter, Depends, HTTPException
from app.core.auth import get_current_user_id
from app.services.analytics_service import get_overview_stats, get_content_sample
from app.services.agents.analytics_agent import AnalyticsAgent
from app.services.content_service import log_agent_run
from app.core.database import get_db

router = APIRouter()


@router.get("/overview")
async def overview(user_id: str = Depends(get_current_user_id)):
    return get_overview_stats(user_id)


@router.post("/insights")
async def generate_insights(user_id: str = Depends(get_current_user_id)):
    try:
        stats = get_overview_stats(user_id)
        content_sample = get_content_sample(user_id)

        # Fetch brand settings for niche + platforms + location context
        db = get_db()
        brand_row = db.table("brands").select("niche,active_platforms,location").eq("user_id", user_id).eq("is_active", True).limit(1).execute()
        niche = ""
        platforms = []
        location = ""
        if brand_row.data:
            niche = brand_row.data[0].get("niche") or ""
            platforms = brand_row.data[0].get("active_platforms") or []
            location = brand_row.data[0].get("location") or ""

        agent = AnalyticsAgent()
        insights = await agent.run(stats, content_sample, niche, platforms, location)
        log_agent_run(user_id, "analytics", {"niche": niche})
        return insights
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
