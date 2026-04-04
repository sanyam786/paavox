import json
import re
from app.services.agents.base import BaseAgent
from app.core.config import settings


class InfluencerAgent(BaseAgent):
    async def run(
        self,
        niche: str,
        platform: str,
        follower_range: str,
        campaign_goal: str,
        brand_name: str = "",
        location: str = "",
    ) -> dict:
        # Use Tavily to find real influencer data
        influencer_context = ""
        location_part = f" in {location}" if location else ""
        try:
            from tavily import TavilyClient
            tavily = TavilyClient(api_key=settings.TAVILY_API_KEY)
            results = tavily.search(
                query=f"top {niche} influencers on {platform}{location_part} {follower_range} followers 2024 2025",
                max_results=5,
            )
            snippets = "\n".join(
                f"- {r.get('title', '')}: {r.get('content', '')[:200]}"
                for r in results.get("results", [])
            )
            influencer_context = f"\nReal influencer data from search:\n{snippets}"
        except Exception:
            influencer_context = ""

        brand_ctx = f"Brand/Creator: {brand_name}" if brand_name else ""
        location_ctx = f"Location/Region: {location} — prioritise influencers based in or relevant to this region" if location else ""

        system = f"""You are an influencer marketing strategist who identifies ideal collaborators and drafts compelling outreach messages.
{brand_ctx}
{location_ctx}
Always respond with valid JSON only."""

        user = f"""Find and profile 5 ideal influencer collaborators and draft outreach messages.

Details:
- Niche: {niche}
- Platform: {platform}
- Follower range: {follower_range}
- Campaign goal: {campaign_goal}
{influencer_context}

Return a JSON object with this exact structure:
{{
  "influencers": [
    {{
      "name": "influencer handle or name",
      "estimated_followers": "e.g. 45K",
      "content_style": "brief description of their content style",
      "why_fit": "why they are a good fit for this niche and campaign goal",
      "engagement_level": "high|medium|low",
      "outreach_dm": "a personalised, natural DM (under 150 words) to send to this influencer — reference their specific content style and the campaign goal, do NOT sound corporate"
    }}
  ],
  "campaign_brief": "A 3-4 sentence campaign brief the influencer can use to understand the collaboration",
  "tips": ["tip 1 for this specific platform and niche", "tip 2", "tip 3"]
}}

Make influencer profiles realistic for {platform} in the {niche} space. Use real-sounding names/handles."""

        raw = self._chat(system, user, max_tokens=2000)
        match = re.search(r'\{.*\}', raw, re.DOTALL)
        return json.loads(match.group() if match else raw)
