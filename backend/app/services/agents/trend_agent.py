import json
import re
from tavily import TavilyClient
from app.services.agents.base import BaseAgent
from app.schemas.agents import TrendRequest, TrendResponse, TrendTopic
from app.core.config import settings


class TrendAgent(BaseAgent):
    def __init__(self):
        super().__init__()
        self.tavily = TavilyClient(api_key=settings.TAVILY_API_KEY)

    def _search_niche_trends(self, niche: str, timeframe: str, location: str = "") -> str:
        """Search for niche-specific trending topics."""
        time_label = {"24h": "today", "7d": "this week", "30d": "this month"}.get(timeframe, "this week")
        location_part = f" in {location}" if location else ""
        query = f"trending topics {niche} content creators social media{location_part} {time_label}"
        results = self.tavily.search(query=query, search_depth="basic", max_results=5)
        summaries = [
            f"- {r.get('title', '')}: {r.get('content', '')[:300]}"
            for r in results.get("results", [])
        ]
        return "\n".join(summaries) if summaries else "No search results found."

    def _search_viral_trends(self, timeframe: str, location: str = "") -> str:
        """Search for cross-niche viral moments."""
        time_label = {"24h": "today", "7d": "this week", "30d": "this month"}.get(timeframe, "this week")
        location_part = f" in {location}" if location else " worldwide"
        query = f"viral content social media trending{location_part} {time_label} challenges memes trends"
        results = self.tavily.search(query=query, search_depth="basic", max_results=4)
        summaries = [
            f"- {r.get('title', '')}: {r.get('content', '')[:300]}"
            for r in results.get("results", [])
        ]
        return "\n".join(summaries) if summaries else "No viral results found."

    async def run(self, request: TrendRequest) -> TrendResponse:
        niche = request.niche
        timeframe = request.timeframe.value
        platforms = [p.value for p in request.platforms] if request.platforms else [
            "instagram", "twitter", "linkedin", "tiktok"
        ]

        # ── Resolve effective location ─────────────────────────────────────
        # "global" scope ignores brand location; "brand" uses it
        effective_location = ""
        if request.location_scope == "brand" and request.location:
            effective_location = request.location

        # ── Search ────────────────────────────────────────────────────────
        niche_results = self._search_niche_trends(niche, timeframe, effective_location)

        viral_results = ""
        if request.include_viral:
            viral_results = self._search_viral_trends(timeframe, effective_location)

        # ── LLM prompt ────────────────────────────────────────────────────
        system = """You are an expert social media trend analyst who helps content creators find viral content opportunities.
Given real search data, identify the most actionable trends and generate specific content ideas.

Always respond with valid JSON in this exact format:
{
  "trends": [
    {
      "topic": "trend name (short, catchy)",
      "score": 8.5,
      "type": "niche",
      "platforms": ["instagram", "tiktok"],
      "content_ideas": [
        "Specific content idea 1",
        "Specific content idea 2",
        "Specific content idea 3"
      ],
      "hashtags": ["hashtag1", "hashtag2", "hashtag3", "hashtag4", "hashtag5"]
    }
  ]
}

Rules:
- Return exactly 5 trends
- "type" must be "niche" (specific to the creator's niche) or "viral" (cross-niche cultural moment anyone can jump on)
- Score is 1-10 based on viral potential and content opportunity
- content_ideas must be specific and actionable, tailored to a {niche} creator
- hashtags: mix of broad and niche-specific
- Only include platforms from: instagram, twitter, linkedin, tiktok, youtube, facebook
"""

        creator_context = ""
        if request.brand_voice:
            creator_context += f"\nCreator brand voice: {request.brand_voice}"
        if request.bio:
            creator_context += f"\nCreator bio: {request.bio}"

        location_context = ""
        if effective_location:
            location_context = f"\nLocation scope: {effective_location} — prioritise trends relevant to this region"
        else:
            location_context = "\nLocation scope: Global — surface worldwide trends"

        viral_instruction = ""
        if request.include_viral and viral_results:
            viral_instruction = f"""
Include at least 2 trends of type "viral" — cross-niche cultural moments from the viral search data that a {niche} creator can creatively adapt to their content.
The remaining trends should be type "niche" — specific to {niche}.

Viral search data:
{viral_results}
"""
        else:
            viral_instruction = f'\nAll 5 trends should be type "niche".'

        user = f"""Niche: {niche}
Timeframe: {timeframe}
Target platforms: {', '.join(platforms)}{creator_context}{location_context}
{viral_instruction}
Niche search data:
{niche_results}

Identify the 5 most actionable trending topics for a {niche} content creator. Make content ideas highly specific to {niche}."""

        raw = self._chat(system, user, max_tokens=2000)

        try:
            json_match = re.search(r'\{.*\}', raw, re.DOTALL)
            data = json.loads(json_match.group() if json_match else raw)
        except json.JSONDecodeError:
            data = {"trends": []}

        trends = []
        for t in data.get("trends", []):
            try:
                from app.schemas.agents import Platform
                trend_platforms = []
                for p in t.get("platforms", []):
                    try:
                        trend_platforms.append(Platform(p))
                    except ValueError:
                        pass

                trends.append(TrendTopic(
                    topic=t.get("topic", ""),
                    score=float(t.get("score", 5.0)),
                    platforms=trend_platforms,
                    content_ideas=t.get("content_ideas", []),
                    hashtags=t.get("hashtags", []),
                    trend_type=t.get("type", "niche"),
                ))
            except Exception:
                continue

        return TrendResponse(trends=trends, niche=niche)
