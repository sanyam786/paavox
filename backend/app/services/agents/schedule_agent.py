import json
import re
from app.services.agents.base import BaseAgent
from app.schemas.schedule import ScheduleRequest, ScheduleResponse, PlatformSchedule, ScheduleSlot

PLATFORM_AUDIENCE = {
    "instagram": "visual content consumers, peak during lunch (11-13h) and evenings (19-21h)",
    "twitter":   "news/trend followers, peak during mornings (8-10h) and lunch (12-13h)",
    "linkedin":  "professionals, peak Tuesday-Thursday mornings (7-9h) and midday (12-13h)",
    "tiktok":    "younger audiences, peak evenings (19-23h) and weekends",
    "youtube":   "video viewers, peak Friday-Sunday afternoons (15-18h) and evenings",
    "facebook":  "broad demographics, peak midweek afternoons (13-16h)",
}


class ScheduleAgent(BaseAgent):
    async def run(self, request: ScheduleRequest) -> ScheduleResponse:
        platforms_info = "\n".join(
            f"- {p}: {PLATFORM_AUDIENCE.get(p, 'general audience')}"
            for p in request.platforms
        )

        system = """You are an expert social media scheduling strategist with deep knowledge of platform algorithms and audience behavior patterns.
You analyze content and niches to recommend the exact best times to post for maximum reach and engagement.

Always respond with valid JSON in this exact format:
{
  "recommendations": [
    {
      "platform": "instagram",
      "slots": [
        {
          "day": "Tuesday",
          "time": "18:00",
          "score": 9.1,
          "reason": "Peak evening engagement for lifestyle content"
        },
        {
          "day": "Friday",
          "time": "12:00",
          "score": 8.7,
          "reason": "Lunch break browsing surge before weekend"
        }
      ]
    }
  ],
  "summary": "Brief overall scheduling strategy in 2 sentences."
}

Rules:
- Provide exactly 3 time slots per platform
- Score is 1-10 based on expected engagement potential
- Days must be full names: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday
- Times in 24h HH:MM format
- Reasons must be specific to the niche and platform, not generic
- Order slots by score descending"""

        location_line = f"\nCreator location: {request.location} — adjust times for local peak hours if relevant" if request.location else ""

        user = f"""Content to schedule:
{request.content}

Niche: {request.niche or "general"}
Posting frequency preference: {request.frequency}
Timezone: {request.timezone}{location_line}

Platforms and their audience behaviour:
{platforms_info}

Recommend the 3 best posting slots per platform for this specific niche and content."""

        raw = self._chat(system, user, max_tokens=1500)

        try:
            match = re.search(r'\{.*\}', raw, re.DOTALL)
            data = json.loads(match.group() if match else raw)
        except json.JSONDecodeError:
            data = {"recommendations": [], "summary": "Could not generate schedule. Please try again."}

        recommendations = []
        for rec in data.get("recommendations", []):
            slots = [
                ScheduleSlot(
                    day=s.get("day", "Monday"),
                    time=s.get("time", "12:00"),
                    score=float(s.get("score", 7.0)),
                    reason=s.get("reason", ""),
                )
                for s in rec.get("slots", [])
            ]
            recommendations.append(PlatformSchedule(
                platform=rec.get("platform", ""),
                slots=slots,
            ))

        return ScheduleResponse(
            recommendations=recommendations,
            summary=data.get("summary", ""),
        )
