from pydantic import BaseModel
from typing import Optional, List


class PipelineCreate(BaseModel):
    name: str = "New Pipeline"


class PipelineUpdate(BaseModel):
    name: Optional[str] = None
    status: Optional[str] = None
    current_step: Optional[int] = None
    topic: Optional[str] = None
    content_format: Optional[str] = None
    content_body: Optional[str] = None
    caption: Optional[str] = None
    hashtags: Optional[List[str]] = None
    image_url: Optional[str] = None
    video_url: Optional[str] = None
    video_status: Optional[str] = None   # none | generating | ready | failed
    platform: Optional[str] = None
    scheduled_time: Optional[str] = None
    posted: Optional[bool] = None


class PipelineResponse(BaseModel):
    id: str
    name: str
    status: str
    current_step: int
    topic: str
    content_format: str
    content_body: str
    caption: str
    hashtags: List[str]
    image_url: str
    platform: str
    scheduled_time: str
    posted: bool
    created_at: str
    updated_at: str
