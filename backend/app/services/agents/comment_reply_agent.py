import json
import re
from app.services.agents.base import BaseAgent


TONE_DESCRIPTIONS = {
    "friendly":      "warm, approachable, conversational — like talking to a friend",
    "professional":  "polished, respectful, authoritative — maintains brand credibility",
    "humorous":      "witty, playful, light-hearted — makes people smile",
    "grateful":      "appreciative, sincere, heartfelt — makes the commenter feel valued",
    "informative":   "helpful, educational, clear — adds value with useful context",
}


class CommentReplyAgent(BaseAgent):
    async def run(
        self,
        comments: list[str],
        platform: str,
        tone: str,
        brand_name: str = "",
        niche: str = "",
        location: str = "",
    ) -> list[dict]:
        tone_desc = TONE_DESCRIPTIONS.get(tone, tone)
        brand_ctx = f"Brand: {brand_name}" if brand_name else ""
        niche_ctx = f"Niche: {niche}" if niche else ""
        location_ctx = f"Location: {location} — match cultural idioms, references, and phrasing natural to this region" if location else ""

        system = f"""You are a social media community manager who writes excellent comment replies.
Platform: {platform}
Tone: {tone} — {tone_desc}
{brand_ctx}
{niche_ctx}
{location_ctx}

Rules:
- Keep replies concise and natural for {platform}
- Never use generic filler like "Great post!" or "Thanks for sharing!"
- Each reply must be distinct in angle and phrasing
- Match the energy of the original comment
- Do NOT include emojis unless explicitly fitting the tone
- Always respond with valid JSON only"""

        comments_text = "\n".join(f"{i+1}. {c}" for i, c in enumerate(comments))

        user = f"""Generate 3 distinct reply options for EACH of the following comments.

Comments:
{comments_text}

Return a JSON array where each element corresponds to one comment:
[
  {{
    "comment": "original comment text",
    "replies": [
      {{"text": "reply option 1", "angle": "one-word angle e.g. empathetic"}},
      {{"text": "reply option 2", "angle": "one-word angle e.g. informative"}},
      {{"text": "reply option 3", "angle": "one-word angle e.g. playful"}}
    ]
  }}
]"""

        raw = self._chat(system, user, max_tokens=1500)
        match = re.search(r'\[.*\]', raw, re.DOTALL)
        return json.loads(match.group() if match else raw)
