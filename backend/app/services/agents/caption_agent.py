import json
import re
from app.services.agents.base import BaseAgent
from app.schemas.agents import CaptionRequest, CaptionResponse

PLATFORM_LIMITS = {
    "instagram": 2200,
    "twitter": 280,
    "linkedin": 3000,
    "tiktok": 2200,
    "youtube": 5000,
    "facebook": 63206,
}

PLATFORM_STYLES = {
    "instagram": "visual, lifestyle-focused, uses line breaks and emojis naturally",
    "twitter": "punchy, conversational, max 280 chars, 1-2 hashtags only",
    "linkedin": "professional, value-driven, thought leadership tone",
    "tiktok": "energetic, trendy, Gen-Z friendly, hooks at the start",
    "youtube": "SEO-friendly, includes keywords naturally, call to action",
    "facebook": "conversational, community-focused, drives engagement",
}


class CaptionAgent(BaseAgent):
    async def run(self, request: CaptionRequest) -> CaptionResponse:
        platform = request.platform.value
        char_limit = PLATFORM_LIMITS.get(platform, 2000)
        style = PLATFORM_STYLES.get(platform, "engaging and clear")

        voice_context = ""
        if request.brand_voice:
            voice_context += f"\nBrand voice: {request.brand_voice}"
        if request.niche:
            voice_context += f"\nCreator niche: {request.niche}"
        if request.location:
            voice_context += f"\nCreator location: {request.location} — tailor cultural references, slang, and trends accordingly"

        system = f"""You are an expert social media copywriter specializing in {platform}.
Your captions are always optimized for the platform, drive engagement, and feel authentic.
Platform style: {style}
Character limit: {char_limit}{voice_context}

Always respond with valid JSON in this exact format:
{{
  "caption": "the full caption text",
  "hashtags": ["tag1", "tag2", "tag3"]
}}"""

        emoji_instruction = "Include relevant emojis naturally." if request.include_emojis else "Do not use emojis."
        hashtag_instruction = (
            f"Include {'relevant' if request.include_hashtags else 'no'} hashtags in the hashtags array."
        )

        user = f"""Write a {request.tone} caption for {platform} about this content:

{request.content}

{emoji_instruction}
{hashtag_instruction}
Keep it under {char_limit} characters."""

        raw = self._chat(system, user, max_tokens=800)

        # Parse JSON response
        try:
            # Extract JSON if wrapped in markdown
            json_match = re.search(r'\{.*\}', raw, re.DOTALL)
            data = json.loads(json_match.group() if json_match else raw)
        except json.JSONDecodeError:
            # Fallback: use raw text as caption
            data = {"caption": raw.strip(), "hashtags": []}

        caption = data.get("caption", "")
        hashtags = data.get("hashtags", [])

        return CaptionResponse(
            caption=caption,
            hashtags=hashtags,
            character_count=len(caption),
            platform=request.platform,
        )
