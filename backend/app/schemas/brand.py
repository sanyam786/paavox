from pydantic import BaseModel
from typing import List, Optional


class BrandCreate(BaseModel):
    name: str
    niche: str = ""
    bio: str = ""
    default_tone: str = "engaging"
    brand_voice: str = ""
    active_platforms: List[str] = []
    posting_frequency: str = "daily"
    audience_persona: str = ""
    location: str = ""


class BrandUpdate(BaseModel):
    name: Optional[str] = None
    niche: Optional[str] = None
    bio: Optional[str] = None
    default_tone: Optional[str] = None
    brand_voice: Optional[str] = None
    active_platforms: Optional[List[str]] = None
    posting_frequency: Optional[str] = None
    audience_persona: Optional[str] = None
    location: Optional[str] = None
