import json
import re
from tavily import TavilyClient
from app.services.agents.base import BaseAgent
from app.schemas.agents import CompetitorAnalysisRequest, CompetitorAnalysisResponse, GapItem
from app.core.config import settings


class CompetitorAnalysisAgent(BaseAgent):
    def __init__(self):
        super().__init__()
        self.tavily = TavilyClient(api_key=settings.TAVILY_API_KEY)

    def _search(self, query: str, max_results: int = 4) -> str:
        results = self.tavily.search(query=query, search_depth="basic", max_results=max_results)
        summaries = [
            f"- {r.get('title', '')}: {r.get('content', '')[:350]}"
            for r in results.get("results", [])
        ]
        return "\n".join(summaries) if summaries else "No results."

    async def run(self, request: CompetitorAnalysisRequest) -> CompetitorAnalysisResponse:
        competitor = request.competitor_name.strip()
        platforms = request.platforms or ["instagram", "tiktok", "youtube", "linkedin", "twitter"]
        platform_str = ", ".join(platforms)

        # ── Multi-query Tavily research ────────────────────────────────────
        niche_ctx = f" {request.niche}" if request.niche else ""
        location_ctx = f" {request.location}" if request.location else ""

        general    = self._search(f"{competitor} brand social media content strategy{niche_ctx}{location_ctx}")
        posts      = self._search(f"{competitor} {platform_str} posts content type format audience")
        audience   = self._search(f"{competitor} target audience brand positioning{niche_ctx}")

        combined_research = f"""=== General Strategy ===
{general}

=== Content & Platform Activity ===
{posts}

=== Audience & Positioning ===
{audience}"""

        # ── Build "your brand" context ─────────────────────────────────────
        your_brand_ctx = ""
        if request.niche:
            your_brand_ctx += f"\n- Your niche: {request.niche}"
        if request.bio:
            your_brand_ctx += f"\n- Your bio: {request.bio}"
        if request.brand_voice:
            your_brand_ctx += f"\n- Your brand voice: {request.brand_voice}"
        if request.location:
            your_brand_ctx += f"\n- Your location: {request.location}"
        if not your_brand_ctx:
            your_brand_ctx = "\n- (No brand info provided — focus on general gaps)"

        system = """You are a strategic social media analyst specialising in competitive intelligence for content creators and brands.
Given research data about a competitor, produce a detailed, actionable analysis comparing their strategy to the user's brand.

Respond ONLY with valid JSON (no markdown):
{
  "competitor_name": "cleaned up name",
  "competitor_overview": "2-3 sentence summary of who they are, their positioning, and why they're successful",
  "competitor_niche": "their primary niche/category",
  "their_content_strategy": [
    "Key strategy point 1 (format, tone, frequency, topics...)",
    "Key strategy point 2",
    "Key strategy point 3",
    "Key strategy point 4"
  ],
  "their_strengths": [
    "Strength 1",
    "Strength 2",
    "Strength 3"
  ],
  "their_weaknesses": [
    "Weakness or blind spot 1",
    "Weakness or blind spot 2",
    "Weakness or blind spot 3"
  ],
  "content_gaps": [
    {
      "gap": "Short label of the gap (e.g. 'No long-form educational content')",
      "opportunity": "Specific way YOU can fill this gap and win audience from them",
      "priority": "high"
    }
  ],
  "your_advantages": [
    "What you do or can do better than this competitor",
    "Another differentiator"
  ],
  "recommendations": [
    "Specific actionable step 1",
    "Specific actionable step 2",
    "Specific actionable step 3",
    "Specific actionable step 4"
  ]
}

Rules:
- content_gaps: 3-5 items, priority must be "high", "medium", or "low"
- Be specific and tactical — avoid generic advice
- your_advantages and recommendations must be tailored to the user's brand context
- If brand context is limited, still give smart strategic advice based on the gap analysis"""

        user = f"""Competitor to analyse: {competitor}
Platforms analysed: {platform_str}

Your brand context:{your_brand_ctx}

Research data:
{combined_research}

Produce a full competitive analysis comparing {competitor}'s strategy to the user's brand."""

        raw = self._chat(system, user, max_tokens=2500)

        try:
            json_match = re.search(r'\{.*\}', raw, re.DOTALL)
            data = json.loads(json_match.group() if json_match else raw)
        except (json.JSONDecodeError, AttributeError):
            data = {}

        gaps = [
            GapItem(
                gap=g.get("gap", ""),
                opportunity=g.get("opportunity", ""),
                priority=g.get("priority", "medium"),
            )
            for g in data.get("content_gaps", [])
        ]

        return CompetitorAnalysisResponse(
            competitor_name=data.get("competitor_name", competitor),
            competitor_overview=data.get("competitor_overview", ""),
            competitor_niche=data.get("competitor_niche", ""),
            their_content_strategy=data.get("their_content_strategy", []),
            their_strengths=data.get("their_strengths", []),
            their_weaknesses=data.get("their_weaknesses", []),
            content_gaps=gaps,
            your_advantages=data.get("your_advantages", []),
            recommendations=data.get("recommendations", []),
        )
