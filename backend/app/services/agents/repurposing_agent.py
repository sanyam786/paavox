import json
import re
from app.services.agents.base import BaseAgent
from app.schemas.agents import RepurposeRequest, RepurposeResponse

PLATFORM_TRAITS = {
    "instagram": "visual, lifestyle-focused, uses line breaks and emojis, 2200 char limit",
    "twitter": "punchy, conversational, max 280 chars, 1-2 hashtags only, no fluff",
    "linkedin": "professional, value-driven, thought leadership, longer form is fine",
    "tiktok": "energetic, trendy, hook in first line, Gen-Z friendly, 2200 char limit",
    "youtube": "SEO-friendly description, includes keywords, timestamps if relevant, call to action",
    "facebook": "conversational, community-focused, drives comments and shares",
}


class RepurposingAgent(BaseAgent):
    async def run(self, request: RepurposeRequest) -> RepurposeResponse:
        source = request.source_platform.value
        target = request.target_platform.value
        source_traits = PLATFORM_TRAITS.get(source, "general social media")
        target_traits = PLATFORM_TRAITS.get(target, "general social media")

        voice_context = ""
        if request.brand_voice:
            voice_context += f"\nBrand voice: {request.brand_voice}"
        if request.niche:
            voice_context += f"\nCreator niche: {request.niche}"
        if request.location:
            voice_context += f"\nCreator location: {request.location} — tailor cultural references and idioms accordingly"

        system = f"""You are an expert social media strategist who specializes in repurposing content across platforms.
You deeply understand what works on each platform and transform content to feel native, not copy-pasted.

Source platform ({source}): {source_traits}
Target platform ({target}): {target_traits}{voice_context}

Always respond with valid JSON in this exact format:
{{
  "repurposed_content": "the full transformed content for {target}",
  "changes": ["change 1", "change 2", "change 3"]
}}

The "changes" array should list 2-4 key transformations you made (e.g. "Shortened to fit 280 char limit", "Added professional tone for LinkedIn").
"""

        tone_instruction = "Preserve the original tone and voice." if request.preserve_tone else "Adapt the tone to best fit the target platform."

        user = f"""Repurpose this {source} content for {target}:

---
{request.content}
---

{tone_instruction}
Make it feel native to {target}, not like it was copied from {source}."""

        raw = self._chat(system, user, max_tokens=1024)

        try:
            json_match = re.search(r'\{.*\}', raw, re.DOTALL)
            data = json.loads(json_match.group() if json_match else raw)
        except json.JSONDecodeError:
            data = {"repurposed_content": raw.strip(), "changes": []}

        return RepurposeResponse(
            repurposed_content=data.get("repurposed_content", ""),
            changes=data.get("changes", []),
            platform=request.target_platform,
        )
