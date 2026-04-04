from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.core.auth import get_current_user_id
from app.services.agents.comment_reply_agent import CommentReplyAgent
from app.services.content_service import log_agent_run

router = APIRouter()


class CommentReplyRequest(BaseModel):
    comments: list[str]
    platform: str
    tone: str
    brand_name: str = ""
    niche: str = ""
    location: str = ""


@router.post("/reply")
async def generate_replies(
    payload: CommentReplyRequest,
    user_id: str = Depends(get_current_user_id),
):
    if not payload.comments or all(not c.strip() for c in payload.comments):
        raise HTTPException(400, "At least one comment is required.")
    try:
        agent = CommentReplyAgent()
        results = await agent.run(
            comments=[c for c in payload.comments if c.strip()],
            platform=payload.platform,
            tone=payload.tone,
            brand_name=payload.brand_name,
            niche=payload.niche,
            location=payload.location,
        )
        log_agent_run(user_id, "comment_reply", {"platform": payload.platform, "tone": payload.tone, "comment_count": len(payload.comments)})
        return {"results": results}
    except Exception as e:
        raise HTTPException(500, detail=str(e))
