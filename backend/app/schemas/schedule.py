from pydantic import BaseModel
from typing import Optional


class ScheduleSlot(BaseModel):
    day: str
    time: str        # HH:MM 24h
    score: float
    reason: str


class PlatformSchedule(BaseModel):
    platform: str
    slots: list[ScheduleSlot]


class ScheduleRequest(BaseModel):
    content: str
    platforms: list[str]
    niche: Optional[str] = ""
    location: Optional[str] = ""
    frequency: Optional[str] = "daily"   # daily, 3x per week, weekly
    timezone: Optional[str] = "UTC"


class ScheduleResponse(BaseModel):
    recommendations: list[PlatformSchedule]
    summary: str


class QueuePostRequest(BaseModel):
    content: str
    platform: str
    hashtags: list[str] = []
    scheduled_at: str     # ISO 8601 datetime string
    content_item_id: Optional[str] = None
    media_url: Optional[str] = None   # required for Instagram posts


class QueuePost(BaseModel):
    id: str
    platform: str
    content: str
    hashtags: list[str]
    scheduled_at: str
    status: str
    created_at: str
    media_url: Optional[str] = None


class PostNowRequest(BaseModel):
    platform: str
    content: str
    post_id: Optional[str] = None   # queue post id to mark as posted after success
    media_url: Optional[str] = None  # required for Instagram
