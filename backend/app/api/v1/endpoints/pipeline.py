from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from app.core.auth import get_current_user_id
from app.schemas.pipeline import PipelineCreate, PipelineUpdate
from app.services.pipeline_service import (
    create_pipeline, list_pipelines, get_pipeline, update_pipeline, delete_pipeline,
)

router = APIRouter()


@router.post("/")
async def create(body: PipelineCreate, user_id: str = Depends(get_current_user_id)):
    try:
        return create_pipeline(user_id, body.name)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/")
async def list_all(user_id: str = Depends(get_current_user_id)):
    try:
        return list_pipelines(user_id)
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{pipeline_id}")
async def get_one(pipeline_id: str, user_id: str = Depends(get_current_user_id)):
    pipeline = get_pipeline(user_id, pipeline_id)
    if not pipeline:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    return pipeline


@router.patch("/{pipeline_id}")
async def update(pipeline_id: str, body: PipelineUpdate, user_id: str = Depends(get_current_user_id)):
    try:
        updates = body.model_dump(exclude_none=True)
        pipeline = update_pipeline(user_id, pipeline_id, updates)
        # When a pipeline is completed, save a consolidated content item so it appears in the calendar
        if updates.get("status") == "completed":
            _save_pipeline_content_item(user_id, pipeline_id, pipeline)
        return pipeline
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def _save_pipeline_content_item(user_id: str, pipeline_id: str, pipeline: dict) -> None:
    """Save a single content item representing the completed pipeline, for calendar/content library."""
    try:
        from app.core.database import get_db
        db = get_db()
        caption   = pipeline.get("caption") or ""
        hashtags  = pipeline.get("hashtags") or []
        image_url = pipeline.get("image_url") or ""
        platform  = pipeline.get("platform") or "instagram"
        content   = caption or pipeline.get("content_body") or pipeline.get("topic") or "Pipeline content"
        # Avoid duplicate entries if completed more than once
        existing = db.table("content_items").select("id").eq("pipeline_id", pipeline_id).execute()
        if existing.data:
            return
        db.table("content_items").insert({
            "user_id":          user_id,
            "pipeline_id":      pipeline_id,
            "platform":         platform,
            "type":             "pipeline",
            "content":          content,
            "hashtags":         hashtags,
            "original_content": pipeline.get("topic") or "",
            "image_url":        image_url,
        }).execute()
    except Exception:
        pass  # Non-blocking — don't fail the pipeline update if this errors


@router.post("/{pipeline_id}/generate-video")
async def start_video_generation(
    pipeline_id: str,
    body: dict,
    background_tasks: BackgroundTasks,
    user_id: str = Depends(get_current_user_id),
):
    """Start background video generation for a pipeline. Returns immediately; polls /pipeline/{id} for status."""
    try:
        update_pipeline(user_id, pipeline_id, {"video_status": "generating"})
        background_tasks.add_task(_bg_generate_video, user_id, pipeline_id, body)
        return {"status": "generating"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


async def _bg_generate_video(user_id: str, pipeline_id: str, request_data: dict) -> None:
    from app.services.agents.video_creator_agent import VideoCreatorAgent
    from app.schemas.agents import VideoCreatorRequest
    from app.services.notification_service import create_notification

    try:
        req = VideoCreatorRequest(**request_data)
        result = await VideoCreatorAgent().run(req)

        if result.video_url:
            update_pipeline(user_id, pipeline_id, {"video_url": result.video_url, "video_status": "ready"})
            pipeline = get_pipeline(user_id, pipeline_id)
            name = (pipeline or {}).get("name", "Pipeline")
            create_notification(
                user_id=user_id,
                type="video_ready",
                title="🎬 Video ready!",
                body=f'Your video for "{name}" has been generated.',
                link=f"/pipeline/{pipeline_id}",
            )
            # Also save to content library
            try:
                from app.services.content_service import save_video
                from app.schemas.agents import VideoCreatorResponse, VideoScene
                save_video(user_id, request_data, result)
            except Exception:
                pass
        else:
            update_pipeline(user_id, pipeline_id, {"video_status": "failed"})
    except Exception as e:
        print(f"[BG Video] {e}")
        try:
            update_pipeline(user_id, pipeline_id, {"video_status": "failed"})
        except Exception:
            pass


@router.delete("/{pipeline_id}")
async def delete(pipeline_id: str, user_id: str = Depends(get_current_user_id)):
    try:
        delete_pipeline(user_id, pipeline_id)
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
