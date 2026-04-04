import json
import re
from app.services.agents.base import BaseAgent
from app.core.config import settings


COLLAB_TYPES = {
    "podcast_guest":    "appearing as a guest on relevant podcasts",
    "cross_promotion":  "cross-promoting each other's content/accounts",
    "co_created":       "co-creating a piece of content together",
    "newsletter_swap":  "swapping newsletter features or mentions",
    "ig_takeover":      "Instagram story or feed takeover",
    "joint_webinar":    "hosting a joint live session or webinar",
    "affiliate":        "affiliate or referral partnership",
    "brand_collab":     "co-branded product or campaign",
}


class CollabAgent(BaseAgent):
    async def run(
        self,
        niche: str,
        collab_type: str,
        platform: str,
        your_value: str,
        brand_name: str = "",
        audience_size: str = "",
        location: str = "",
    ) -> dict:
        collab_desc = COLLAB_TYPES.get(collab_type, collab_type)
        location_part = f" in {location}" if location else ""

        # Tavily search for real collaborators
        search_context = ""
        try:
            from tavily import TavilyClient
            tavily = TavilyClient(api_key=settings.TAVILY_API_KEY)
            results = tavily.search(
                query=f"{niche} creators {collab_type.replace('_', ' ')} collaboration {platform}{location_part} 2024 2025",
                max_results=5,
            )
            snippets = "\n".join(
                f"- {r.get('title', '')}: {r.get('content', '')[:200]}"
                for r in results.get("results", [])
            )
            search_context = f"\nReal data from search:\n{snippets}"
        except Exception:
            search_context = ""

        brand_ctx = f"Your brand/name: {brand_name}" if brand_name else ""
        audience_ctx = f"Your audience size: {audience_size}" if audience_size else ""
        location_ctx = f"Location/Region: {location} — prioritise collaborators based in or relevant to this region" if location else ""

        system = f"""You are an expert collaboration and outreach strategist for content creators.
{brand_ctx}
{audience_ctx}
{location_ctx}
Collaboration type: {collab_type} — {collab_desc}
Platform focus: {platform}
Always respond with valid JSON only."""

        user = f"""Find 4 ideal collaboration partners and write personalised outreach for each.

Details:
- Niche: {niche}
- Collaboration type: {collab_desc}
- Platform: {platform}
- What you bring to the collab: {your_value}
{search_context}

Return a JSON object with this structure:
{{
  "collaborators": [
    {{
      "name": "creator/brand name or handle",
      "type": "creator|brand|podcast|newsletter|agency",
      "audience_fit": "why their audience aligns with yours",
      "collab_angle": "specific collaboration idea tailored to them",
      "mutual_value": "what each side gains from this collab",
      "outreach_message": "a natural, personalised outreach message (email or DM, under 180 words). Reference their specific work, propose the collab clearly, explain the mutual benefit. Sound human, not corporate.",
      "best_contact_method": "DM|email|LinkedIn|comment"
    }}
  ],
  "pitch_template": "A reusable 3-paragraph collaboration pitch template they can adapt for any outreach",
  "dos": ["do 1 specific to this collab type", "do 2", "do 3"],
  "donts": ["don't 1", "don't 2", "don't 3"]
}}

Make collaborator profiles realistic and specific to the {niche} space on {platform}."""

        raw = self._chat(system, user, max_tokens=2000)
        match = re.search(r'\{.*\}', raw, re.DOTALL)
        text = match.group() if match else raw
        # Remove control characters that are invalid inside JSON strings
        text = re.sub(r'(?<!\\)[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', text)
        return json.loads(text)
