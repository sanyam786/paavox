from pydantic import BaseModel
from typing import List


class UserSettings(BaseModel):
    niche: str = ""
    bio: str = ""
    default_tone: str = "engaging"
    brand_voice: str = ""
    active_platforms: List[str] = []
    posting_frequency: str = "daily"
    audience_persona: str = ""  # JSON string of the generated persona
