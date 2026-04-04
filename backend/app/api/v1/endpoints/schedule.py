from fastapi import APIRouter, Depends, HTTPException
from app.core.auth import get_current_user_id
from app.schemas.schedule import ScheduleRequest, ScheduleResponse, QueuePostRequest, PostNowRequest
from app.services.agents.schedule_agent import ScheduleAgent
from app.services.schedule_service import add_to_queue, get_queue, get_posted_history, delete_queue_post, log_posted
from app.services.posting_service import post_now, mark_queue_posted, TEXT_POSTING_SUPPORTED, MEDIA_POSTING_SUPPORTED
from app.services.content_service import log_agent_run

router = APIRouter()


@router.post("/suggest", response_model=ScheduleResponse)
async def suggest_schedule(
    request: ScheduleRequest,
    user_id: str = Depends(get_current_user_id),
):
    try:
        agent = ScheduleAgent()
        result = await agent.run(request)
        log_agent_run(user_id, "schedule", {"platforms": request.platforms, "frequency": request.frequency})
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/queue")
async def queue_post(
    payload: QueuePostRequest,
    user_id: str = Depends(get_current_user_id),
):
    try:
        item = add_to_queue(user_id, payload.model_dump())
        return {"queued": True, "item": item}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/queue")
async def list_queue(
    status: str | None = None,
    user_id: str = Depends(get_current_user_id),
):
    return {"posts": get_queue(user_id, status)}


@router.delete("/queue/{post_id}")
async def remove_from_queue(
    post_id: str,
    user_id: str = Depends(get_current_user_id),
):
    delete_queue_post(post_id, user_id)
    return {"deleted": True}


@router.get("/posted")
async def list_posted(
    platform: str | None = None,
    user_id: str = Depends(get_current_user_id),
):
    return {"posts": get_posted_history(user_id, platform)}


@router.post("/post-now")
async def post_now_endpoint(
    payload: PostNowRequest,
    user_id: str = Depends(get_current_user_id),
):
    all_supported = TEXT_POSTING_SUPPORTED + MEDIA_POSTING_SUPPORTED
    if payload.platform not in all_supported:
        raise HTTPException(
            status_code=400,
            detail=f"Direct posting to {payload.platform} is not yet supported.",
        )
    try:
        result = await post_now(user_id, payload.platform, payload.content, payload.media_url)
        if payload.post_id:
            mark_queue_posted(payload.post_id, user_id)
        else:
            # Direct post-now (not from queue) — log it so analytics can track it
            log_posted(user_id, payload.platform, payload.content, payload.media_url)
        return {"posted": True, "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
