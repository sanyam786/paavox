import json
import re
from app.services.agents.base import BaseAgent
from app.schemas.agents import PersonaBuilderRequest, PersonaBuilderResponse


class PersonaBuilderAgent(BaseAgent):
    async def run(self, request: PersonaBuilderRequest) -> PersonaBuilderResponse:
        extra = ""
        if request.location:
            extra += f"\nCreator location: {request.location} — the persona's demographics, cultural values, platform habits, and day-in-life must reflect this region"
        if request.current_audience:
            extra += f"\nWhat the creator knows about their current audience: {request.current_audience}"
        if request.extra_context:
            extra += f"\nAdditional context: {request.extra_context}"

        system = f"""You are an expert audience researcher and marketing strategist.
Your job is to build a deeply specific, realistic audience persona for a content creator.
The persona must be grounded in real human psychology — not generic marketing speak.
Every section must be specific, actionable, and directly useful for creating content.{extra}

Respond with valid JSON in this exact format:
{{
  "persona_name": "A memorable name for this persona type (e.g. 'The Ambitious Side-Hustler')",
  "tagline": "One sentence that captures who they are",
  "demographics": "Age range, gender mix, location, income level, education, job/life stage",
  "psychographics": "Core values, beliefs, lifestyle, personality traits, identity",
  "pain_points": "3-5 specific frustrations, fears, or struggles they face (bullet points)",
  "goals": "3-5 specific aspirations and what success looks like to them (bullet points)",
  "content_habits": "Which platforms they use and when, how long they scroll, what they watch vs skip, when they're most active",
  "what_resonates": "Specific hooks, content formats, tones, topics, and storytelling styles that stop their scroll",
  "what_to_avoid": "Formats, tones, topics, or approaches that turn this audience off",
  "day_in_life": "A vivid 3-4 sentence narrative of a typical day for this person and where your content fits in"
}}"""

        user = f"""Build a detailed audience persona for a content creator with:
Niche: {request.niche}
Content type: {request.content_type}
Creator's goal: {request.creator_goal}"""

        raw = self._chat(system, user, max_tokens=1500)

        try:
            json_match = re.search(r'\{.*\}', raw, re.DOTALL)
            data = json.loads(json_match.group() if json_match else raw)
        except (json.JSONDecodeError, AttributeError):
            data = {}

        def to_str(val: any) -> str:
            if isinstance(val, list):
                return "\n".join(f"• {item}" for item in val)
            return val or ""

        return PersonaBuilderResponse(
            persona_name=data.get("persona_name", "Your Ideal Audience"),
            tagline=to_str(data.get("tagline", "")),
            demographics=to_str(data.get("demographics", "")),
            psychographics=to_str(data.get("psychographics", "")),
            pain_points=to_str(data.get("pain_points", "")),
            goals=to_str(data.get("goals", "")),
            content_habits=to_str(data.get("content_habits", "")),
            what_resonates=to_str(data.get("what_resonates", "")),
            what_to_avoid=to_str(data.get("what_to_avoid", "")),
            day_in_life=to_str(data.get("day_in_life", "")),
        )
