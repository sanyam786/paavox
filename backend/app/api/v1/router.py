from fastapi import APIRouter
from app.api.v1.endpoints import agents, content, users, settings, social, schedule, analytics, comments, influencer, collab, upload, pipeline, brands, notifications

api_router = APIRouter()

api_router.include_router(agents.router, prefix="/agents", tags=["agents"])
api_router.include_router(content.router, prefix="/content", tags=["content"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(settings.router, prefix="/settings", tags=["settings"])
api_router.include_router(brands.router, prefix="/brands", tags=["brands"])
api_router.include_router(social.router, prefix="/social", tags=["social"])
api_router.include_router(schedule.router, prefix="/schedule", tags=["schedule"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
api_router.include_router(comments.router, prefix="/comments", tags=["comments"])
api_router.include_router(influencer.router, prefix="/influencer", tags=["influencer"])
api_router.include_router(collab.router, prefix="/collab", tags=["collab"])
api_router.include_router(upload.router, prefix="/upload", tags=["upload"])
api_router.include_router(pipeline.router, prefix="/pipeline", tags=["pipeline"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["notifications"])
