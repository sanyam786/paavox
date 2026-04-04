from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from fastapi.responses import FileResponse
from app.core.auth import get_current_user_id
from app.schemas.agents import (
    CaptionRequest, CaptionResponse,
    RepurposeRequest, RepurposeResponse,
    TrendRequest, TrendResponse,
    ContentWriterRequest, ContentWriterResponse,
    ImageGeneratorRequest, ImageGeneratorResponse,
    PersonaBuilderRequest, PersonaBuilderResponse,
    VideoCreatorRequest, VideoCreatorResponse,
    YouTubeShortsAnalyzeRequest, YouTubeShortsAnalyzeResponse,
    YouTubeShortsClipRequest, YouTubeShortsClipResponse,
    CompetitorAnalysisRequest, CompetitorAnalysisResponse,
)
from app.services.agents.caption_agent import CaptionAgent
from app.services.agents.repurposing_agent import RepurposingAgent
from app.services.agents.trend_agent import TrendAgent
from app.services.agents.content_writer_agent import ContentWriterAgent
from app.services.agents.image_generator_agent import ImageGeneratorAgent
from app.services.agents.persona_builder_agent import PersonaBuilderAgent
from app.services.agents.video_creator_agent import VideoCreatorAgent
from app.services.content_service import save_caption, save_repurposed, save_written_content, save_generated_image, save_video
from app.services.notification_service import create_notification

router = APIRouter()


@router.post("/caption", response_model=CaptionResponse)
async def run_caption_agent(
    request: CaptionRequest,
    user_id: str = Depends(get_current_user_id),
):
    agent = CaptionAgent()
    try:
        result = await agent.run(request)
        try:
            save_caption(user_id, request.model_dump(), result)
        except Exception as db_err:
            print(f"DB save error: {db_err}")
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/repurpose", response_model=RepurposeResponse)
async def run_repurpose_agent(
    request: RepurposeRequest,
    user_id: str = Depends(get_current_user_id),
):
    agent = RepurposingAgent()
    try:
        return await agent.run(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/repurpose/save")
async def save_repurposed_content(
    payload: dict,
    user_id: str = Depends(get_current_user_id),
):
    """Called when user reviews and confirms saving repurposed content."""
    try:
        save_repurposed(user_id, payload)
        return {"saved": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/trends", response_model=TrendResponse)
async def run_trend_agent(
    request: TrendRequest,
    user_id: str = Depends(get_current_user_id),
):
    agent = TrendAgent()
    try:
        return await agent.run(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/content-writer", response_model=ContentWriterResponse)
async def run_content_writer_agent(
    request: ContentWriterRequest,
    user_id: str = Depends(get_current_user_id),
):
    agent = ContentWriterAgent()
    try:
        result = await agent.run(request)
        try:
            save_written_content(user_id, request.model_dump(), result)
        except Exception as db_err:
            print(f"DB save error: {db_err}")
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/image-generator", response_model=ImageGeneratorResponse)
async def run_image_generator_agent(
    request: ImageGeneratorRequest,
    user_id: str = Depends(get_current_user_id),
):
    agent = ImageGeneratorAgent()
    try:
        result = await agent.run(request)
        try:
            save_generated_image(user_id, request.model_dump(), result)
        except Exception as db_err:
            print(f"DB save error: {db_err}")
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/persona-builder", response_model=PersonaBuilderResponse)
async def run_persona_builder_agent(
    request: PersonaBuilderRequest,
    user_id: str = Depends(get_current_user_id),
):
    agent = PersonaBuilderAgent()
    try:
        return await agent.run(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/video", response_model=VideoCreatorResponse)
async def run_video_creator_agent(
    request: VideoCreatorRequest,
    user_id: str = Depends(get_current_user_id),
):
    agent = VideoCreatorAgent()
    try:
        result = await agent.run(request)
        try:
            save_video(user_id, request.model_dump(), result)
            if result.video_url:
                create_notification(
                    user_id,
                    "video_ready",
                    "🎬 Video ready!",
                    body=f'Your video "{request.topic[:50]}" has been generated.',
                    link="/content",
                )
        except Exception as db_err:
            print(f"DB save error (video): {db_err}")
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/trends/save")
async def save_trend_result(
    payload: dict,
    user_id: str = Depends(get_current_user_id),
):
    """Save a selected trend and its content ideas."""
    try:
        from app.services.content_service import save_trend
        save_trend(user_id, payload)
        return {"saved": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Competitor Analysis ─────────────────────────────────────────────────────

@router.post("/competitor-analysis", response_model=CompetitorAnalysisResponse)
async def run_competitor_analysis(
    request: CompetitorAnalysisRequest,
    user_id: str = Depends(get_current_user_id),
):
    from app.services.agents.competitor_analysis_agent import CompetitorAnalysisAgent
    agent = CompetitorAnalysisAgent()
    try:
        return await agent.run(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── YouTube Shorts endpoints ────────────────────────────────────────────────

@router.post("/youtube-shorts/analyze", response_model=YouTubeShortsAnalyzeResponse)
async def analyze_youtube_shorts(
    request: YouTubeShortsAnalyzeRequest,
    user_id: str = Depends(get_current_user_id),
):
    """Analyze a YouTube video and identify the best moments to clip as Shorts."""
    from app.services.agents.youtube_shorts_agent import YouTubeShortsAgent
    agent = YouTubeShortsAgent()
    try:
        result = await agent.analyze(request.url)
        return result
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/youtube-shorts/clip", response_model=YouTubeShortsClipResponse)
async def generate_youtube_short(
    request: YouTubeShortsClipRequest,
    user_id: str = Depends(get_current_user_id),
):
    """Clip a segment, save to disk, persist metadata in content library."""
    from app.services.agents.youtube_shorts_agent import YouTubeShortsAgent
    from app.core.config import settings as app_settings
    from app.services.content_service import save_youtube_short, cleanup_expired_shorts
    from app.core.cloud_storage import is_cloudinary_enabled, upload_clip
    from app.core.clips_store import get_clip_path, delete_clip
    agent = YouTubeShortsAgent()
    try:
        clip_id = await agent.generate_clip(
            url=request.url,
            start_seconds=request.start_seconds,
            end_seconds=request.end_seconds,
            title=request.title,
            crop_vertical=request.crop_vertical,
        )
        duration = request.end_seconds - request.start_seconds

        if is_cloudinary_enabled():
            # Upload to Cloudinary CDN, then remove the local temp file
            local_path = get_clip_path(clip_id)
            serve_url = upload_clip(local_path, clip_id)
            delete_clip(clip_id)
            print(f"[YTShorts] Uploaded to Cloudinary: {serve_url}")
        else:
            # Local filesystem — served via the /serve endpoint (dev / single-server)
            serve_url = f"{app_settings.BACKEND_URL}/api/v1/agents/youtube-shorts/serve/{clip_id}"

        try:
            save_youtube_short(user_id, request.title, serve_url, request.url, duration)
        except Exception as db_err:
            print(f"[YTShorts] DB save error: {db_err}")

        try:
            cleanup_expired_shorts(user_id)
        except Exception:
            pass

        return YouTubeShortsClipResponse(
            clip_id=clip_id,
            title=request.title,
            duration_seconds=duration,
            public_url=serve_url,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/youtube-shorts/serve/{clip_id}")
async def serve_youtube_short(clip_id: str):
    """Public endpoint to stream/download a generated clip by ID (no auth — UUID is capability token)."""
    from app.core.clips_store import get_clip_path
    path = get_clip_path(clip_id)
    if path is None or not path.exists():
        raise HTTPException(status_code=404, detail="Clip not found or expired.")
    return FileResponse(
        path=str(path),
        media_type="video/mp4",
        filename=f"short_{clip_id[:8]}.mp4",
    )


@router.get("/youtube-shorts/download/{clip_id}")
async def download_youtube_short(
    clip_id: str,
    background_tasks: BackgroundTasks,
    user_id: str = Depends(get_current_user_id),
):
    """Stream a generated clip file and delete it after download."""
    from app.core.clips_store import get_clip_path, delete_clip
    path = get_clip_path(clip_id)
    if path is None or not path.exists():
        raise HTTPException(status_code=404, detail="Clip not found or already downloaded.")
    background_tasks.add_task(delete_clip, clip_id)
    return FileResponse(
        path=str(path),
        media_type="video/mp4",
        filename=f"short_{clip_id[:8]}.mp4",
    )
