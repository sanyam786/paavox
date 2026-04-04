import json
import re
from app.services.agents.base import BaseAgent


class AnalyticsAgent(BaseAgent):
    async def run(self, stats: dict, content_sample: list, niche: str, platforms: list, location: str = "") -> dict:
        location_line = f"\n- Location: {location}" if location else ""
        context = f"""User profile:
- Niche: {niche or 'Not specified'}
- Active platforms: {', '.join(platforms) if platforms else 'Not specified'}{location_line}

Activity summary:
- Total content generated: {stats['total_content']}
- Posts scheduled: {stats['total_scheduled']}
- Posts published: {stats['total_posted']}
- Agent usage: {json.dumps(stats['agent_breakdown'])}
- Platform content breakdown: {json.dumps(stats['platform_breakdown'])}

Recent content samples (last {len(content_sample)} items):
{chr(10).join(f"- [{item['platform']}] [{item['type']}] {item['content'][:120]}" for item in content_sample[:10])}
"""

        prompt = f"""{context}

You are a social media analytics expert. Based on this creator's activity data, provide actionable insights.

Return a JSON object with exactly this structure:
{{
  "summary": "2-3 sentence overall assessment of their content strategy",
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "opportunities": ["opportunity 1", "opportunity 2", "opportunity 3"],
  "recommendations": [
    {{"title": "short title", "detail": "specific actionable recommendation", "priority": "high|medium|low"}},
    {{"title": "short title", "detail": "specific actionable recommendation", "priority": "high|medium|low"}},
    {{"title": "short title", "detail": "specific actionable recommendation", "priority": "high|medium|low"}},
    {{"title": "short title", "detail": "specific actionable recommendation", "priority": "high|medium|low"}}
  ],
  "top_platform": "the platform they should focus on most based on their data",
  "content_score": 7.5
}}

Be specific to their niche, location, and actual usage patterns. content_score is 1-10 rating of their current strategy."""

        raw = self._chat(
            system="You are a social media analytics expert. Always respond with valid JSON only.",
            user=prompt,
            max_tokens=1024,
        )
        match = re.search(r'\{.*\}', raw, re.DOTALL)
        return json.loads(match.group() if match else raw)
