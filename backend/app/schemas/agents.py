from pydantic import BaseModel
from typing import Optional
from enum import Enum


class Platform(str, Enum):
    INSTAGRAM = "instagram"
    TWITTER = "twitter"
    LINKEDIN = "linkedin"
    TIKTOK = "tiktok"
    YOUTUBE = "youtube"
    FACEBOOK = "facebook"


# Caption Agent
class CaptionRequest(BaseModel):
    content: str
    platform: Platform
    tone: Optional[str] = "engaging"
    include_hashtags: bool = True
    include_emojis: bool = True
    brand_voice: Optional[str] = ""
    niche: Optional[str] = ""
    location: Optional[str] = ""


class CaptionResponse(BaseModel):
    caption: str
    hashtags: list[str]
    character_count: int
    platform: Platform


# Repurposing Agent
class RepurposeRequest(BaseModel):
    content: str
    source_platform: Platform
    target_platform: Platform
    preserve_tone: bool = True
    brand_voice: Optional[str] = ""
    niche: Optional[str] = ""
    location: Optional[str] = ""


class RepurposeResponse(BaseModel):
    repurposed_content: str
    changes: list[str]
    platform: Platform


# Image Generator Agent
class ImageGeneratorRequest(BaseModel):
    description: str
    style: Optional[str] = "photorealistic"
    platform: Optional[str] = "general"
    mood: Optional[str] = ""
    niche: Optional[str] = ""
    location: Optional[str] = ""


class ImageGeneratorResponse(BaseModel):
    image_url: str
    prompt_used: str
    width: int
    height: int
    platform: str


# Content Writer Agent
class ContentFormat(str, Enum):
    TIKTOK_SCRIPT  = "tiktok_script"
    REELS_SCRIPT   = "reels_script"
    YOUTUBE_SCRIPT = "youtube_script"
    TWEET_THREAD   = "tweet_thread"
    LINKEDIN_POST  = "linkedin_post"
    BLOG_POST      = "blog_post"
    CAROUSEL       = "carousel"
    NEWSLETTER     = "newsletter"


class ContentWriterRequest(BaseModel):
    topic: str
    content_format: ContentFormat
    tone: Optional[str] = "engaging"
    audience: Optional[str] = ""
    extra_context: Optional[str] = ""
    brand_voice: Optional[str] = ""
    niche: Optional[str] = ""
    location: Optional[str] = ""


class ContentWriterResponse(BaseModel):
    title: str
    body: str
    content_format: ContentFormat
    word_count: int


# Persona Builder Agent
class PersonaBuilderRequest(BaseModel):
    niche: str
    content_type: str          # e.g. "educational videos", "lifestyle photos"
    creator_goal: str          # e.g. "grow to 100k followers", "sell online course"
    current_audience: Optional[str] = ""   # what they know about current followers
    extra_context: Optional[str] = ""
    location: Optional[str] = ""


class PersonaSection(BaseModel):
    label: str
    content: str


class PersonaBuilderResponse(BaseModel):
    persona_name: str          # e.g. "The Ambitious Side-Hustler"
    tagline: str               # one-line summary
    demographics: str
    psychographics: str
    pain_points: str
    goals: str
    content_habits: str        # how/when/where they consume content
    what_resonates: str        # hooks, formats, topics that work
    what_to_avoid: str
    day_in_life: str           # narrative paragraph


# Trend Agent
class Timeframe(str, Enum):
    DAY = "24h"
    WEEK = "7d"
    MONTH = "30d"


class TrendRequest(BaseModel):
    niche: str
    platforms: Optional[list[Platform]] = None
    timeframe: Timeframe = Timeframe.WEEK
    brand_voice: Optional[str] = ""
    bio: Optional[str] = ""
    location: Optional[str] = ""
    include_viral: bool = False          # mix in cross-niche viral moments
    location_scope: str = "brand"        # "brand" | "global"


# Video Creator Agent
class VideoCreatorRequest(BaseModel):
    topic: str
    content_body: Optional[str] = ""
    style: Optional[str] = "cinematic"        # cinematic | vlog | educational | promotional | storytelling
    aspect_ratio: Optional[str] = "9:16"      # 9:16 | 1:1 | 16:9
    duration: Optional[int] = 5               # 5 or 10 seconds
    niche: Optional[str] = ""
    brand_voice: Optional[str] = ""
    location: Optional[str] = ""


class VideoScene(BaseModel):
    scene_number: int
    visual_description: str
    text_overlay: str
    spoken_words: str


class VideoCreatorResponse(BaseModel):
    video_url: str                # Fal.ai MP4 URL (empty string if failed)
    cover_image_url: str          # FLUX cover image as data URL (fallback)
    video_error: str              # reason video failed, empty if succeeded
    script: str
    scenes: list[VideoScene]
    prompt_used: str
    duration: int
    aspect_ratio: str


class TrendTopic(BaseModel):
    topic: str
    score: float
    platforms: list[Platform]
    content_ideas: list[str]
    hashtags: list[str]
    trend_type: str = "niche"   # "niche" | "viral"


class TrendResponse(BaseModel):
    trends: list[TrendTopic]
    niche: str


# Competitor Analysis Agent
class CompetitorAnalysisRequest(BaseModel):
    competitor_name: str
    platforms: Optional[list[str]] = None
    niche: Optional[str] = ""
    brand_voice: Optional[str] = ""
    bio: Optional[str] = ""
    location: Optional[str] = ""


class GapItem(BaseModel):
    gap: str
    opportunity: str
    priority: str  # "high" | "medium" | "low"


class CompetitorAnalysisResponse(BaseModel):
    competitor_name: str
    competitor_overview: str
    competitor_niche: str
    their_content_strategy: list[str]
    their_strengths: list[str]
    their_weaknesses: list[str]
    content_gaps: list[GapItem]
    your_advantages: list[str]
    recommendations: list[str]


# YouTube Shorts Agent
class YouTubeShortsAnalyzeRequest(BaseModel):
    url: str


class ViralMoment(BaseModel):
    index: int
    title: str
    start_seconds: int
    end_seconds: int
    duration_seconds: int
    reason: str
    hook: str


class YouTubeShortsAnalyzeResponse(BaseModel):
    video_title: str
    total_duration_seconds: int
    moments: list[ViralMoment]


class YouTubeShortsClipRequest(BaseModel):
    url: str
    start_seconds: int
    end_seconds: int
    title: str
    crop_vertical: bool = True


class YouTubeShortsClipResponse(BaseModel):
    clip_id: str
    title: str
    duration_seconds: int
    public_url: str = ""


class YouTubeShortsUploadRequest(BaseModel):
    video_url: str
    title: str
    description: str = ""
    privacy: str = "public"  # public | private | unlisted


class YouTubeShortsUploadResponse(BaseModel):
    video_id: str
    url: str
