import json
import re
from app.services.agents.base import BaseAgent
from app.schemas.agents import ContentWriterRequest, ContentWriterResponse, ContentFormat

FORMAT_INSTRUCTIONS = {
    ContentFormat.TIKTOK_SCRIPT: """Write a TikTok hook script for a 5–8 second AI-generated short video clip. Structure it exactly like this:

HOOK (5–8 seconds)
Spoken: [One punchy opening line — stops the scroll instantly]
On-screen text: [Bold hook text, max 5 words]
Visual/action: [One specific shot — subject, movement, camera angle. Be precise.]

---
AI VIDEO PROMPT: [Write a single vivid sentence (40–70 words) describing ONLY the visuals for an AI video generator. Include: subject, action, camera movement, lighting, mood, colour palette. Do NOT include text overlays, dialogue, or narration. Example: "Close-up of hands counting dollar bills on a wooden desk, coins scattering in slow motion, warm golden hour light streaming through a window, shallow depth of field, cinematic film grain"]

CAPTION: [Ready-to-post TikTok caption with hashtags]
AUDIO VIBE: [e.g. trending audio, upbeat background music, dramatic voiceover]

Keep it short — this is a single hook moment, not a full video. The clip must work visually even without sound.""",

    ContentFormat.REELS_SCRIPT: """Write an Instagram Reels hook script for a 5–8 second AI-generated video clip. Structure it exactly like this:

HOOK (5–8 seconds)
Visual: [One specific shot — camera angle, subject, action, setting. Be very precise.]
On-screen text: [Bold hook overlay, max 5 words]
Audio: [One punchy spoken line OR music note]

---
AI VIDEO PROMPT: [Write a single vivid sentence (40–70 words) describing ONLY the visuals for an AI video generator. Include: subject, action, camera movement, lighting, mood, colour palette. Do NOT include text overlays, dialogue, or narration. Example: "Aerial slow-motion shot of a person opening a suitcase full of travel essentials on a rooftop at golden hour, warm orange tones, cinematic depth of field, light wind moving through hair"]

CAPTION: [Ready-to-post Instagram caption with hashtags]
MUSIC/AUDIO VIBE: [e.g. upbeat trending sound, chill lo-fi, dramatic cinematic]

This is a single hook moment — one powerful visual that stops the scroll. Keep the concept focused and specific.""",

    ContentFormat.YOUTUBE_SCRIPT: """Write a complete YouTube video package. Structure it exactly like this:

TITLE OPTIONS
1. [SEO-optimised main title]
2. [Curiosity-gap variant]
3. [How-to variant]

THUMBNAIL CONCEPT
[Describe what the thumbnail should look like — background, text overlay, facial expression/prop, color scheme]

DESCRIPTION
[Full YouTube description: 2–3 sentence hook, what the video covers, timestamps placeholder, links section (Website | Instagram | TikTok), subscribe CTA, relevant keywords naturally included]

TAGS
[12–15 comma-separated SEO tags]

---

SCRIPT

INTRO (0:00–0:45)
[Strong hook in first 10 seconds — state the bold promise. Then brief intro. Then "here's what we'll cover today".]

CHAPTER 1: [Chapter title] (0:45–X:XX)
[Detailed talking points, stories, examples. Write conversationally — to be spoken out loud. Use [B-ROLL: description] for visual cues. Use [PAUSE] for emphasis.]

CHAPTER 2: [Chapter title] (X:XX–X:XX)
[Continue...]

CHAPTER 3: [Chapter title] (X:XX–X:XX)
[Continue...]

CHAPTER 4: [Chapter title] (X:XX–X:XX)
[Continue...]

OUTRO (X:XX–end)
[Recap key takeaways. Ask viewers to like + subscribe. Suggest next video to watch. End screen instruction: "click here for [related video]".]

ESTIMATED DURATION: [X–X minutes]""",

    ContentFormat.TWEET_THREAD: """Write a Tweet thread (8–12 tweets).
- Tweet 1: The hook — bold claim or question that makes people stop scrolling
- Tweets 2–10: Each tweet = one clear idea, max 280 characters each
- Final tweet: Summary + CTA (follow, retweet, reply)
Separate each tweet with a blank line and number them: 1/, 2/, etc.""",

    ContentFormat.LINKEDIN_POST: """Write a LinkedIn article-style post.
- Strong opening line (no "I am excited to share...")
- Short paragraphs (1–3 lines each) with line breaks for mobile readability
- 3–5 key insights or takeaways
- Personal story or data point to build credibility
- Closing question to drive comments
- 3–5 relevant hashtags at the end""",

    ContentFormat.BLOG_POST: """Write a full blog post with:
- Compelling H1 title
- Introduction (hook + what reader will learn)
- 4–6 H2 sections with real depth
- Bullet points and numbered lists where appropriate
- Conclusion with key takeaways
- SEO-friendly subheadings""",

    ContentFormat.CAROUSEL: """Write an Instagram/LinkedIn carousel. Let the topic determine the number of slides naturally — do not pad or cut content to hit a fixed count. A "5 ways" topic should have 7 slides (hook + 5 points + CTA). A "10 tips" topic should have 12. Use your judgement.
Slide 1: Bold headline (the hook)
Middle slides: Each slide = one single idea, 1–2 sentences max
Last slide: CTA (follow, save, share)
Format as:
SLIDE 1: [text]
SLIDE 2: [text]
etc.""",

    ContentFormat.NEWSLETTER: """Write a newsletter edition with:
- Subject line (compelling, 6–10 words)
- Preview text (1 sentence teaser)
- Greeting
- Main story/insight (300–500 words)
- Quick tips or curated links section (3–5 items)
- Closing thought
- Sign-off
Keep it personal and conversational.""",
}

FORMAT_LABELS = {
    ContentFormat.TIKTOK_SCRIPT:  "TikTok script",
    ContentFormat.REELS_SCRIPT:   "Reels script",
    ContentFormat.YOUTUBE_SCRIPT: "YouTube script",
    ContentFormat.TWEET_THREAD:   "tweet thread",
    ContentFormat.LINKEDIN_POST:  "LinkedIn post",
    ContentFormat.BLOG_POST:      "blog post",
    ContentFormat.CAROUSEL:       "carousel",
    ContentFormat.NEWSLETTER:     "newsletter",
}


class ContentWriterAgent(BaseAgent):
    async def run(self, request: ContentWriterRequest) -> ContentWriterResponse:
        fmt = request.content_format
        instructions = FORMAT_INSTRUCTIONS[fmt]
        label = FORMAT_LABELS[fmt]

        context_parts = []
        if request.brand_voice:
            context_parts.append(f"Brand voice: {request.brand_voice}")
        if request.niche:
            context_parts.append(f"Creator niche: {request.niche}")
        if request.location:
            context_parts.append(f"Creator location: {request.location} — tailor examples, cultural references, and trends to this region")
        if request.audience:
            context_parts.append(f"Target audience: {request.audience}")
        if request.extra_context:
            context_parts.append(f"Additional context: {request.extra_context}")
        context_block = ("\n" + "\n".join(context_parts)) if context_parts else ""

        system = f"""You are an expert content writer who creates high-performing {label} content for social media creators and brands.
You write in a {request.tone} tone and always tailor content to the specific format and platform.{context_block}

Always respond with valid JSON in this exact format:
{{
  "title": "a short descriptive title for this content piece",
  "body": "the full content here as a plain string — never nest JSON inside body"
}}

The body value must be a plain text string (never an object or array). It must follow these format-specific instructions exactly:
{instructions}"""

        user = f"""Write a {request.tone} {label} about:

{request.topic}"""

        raw = self._chat(system, user, max_tokens=2500)

        try:
            json_match = re.search(r'\{.*\}', raw, re.DOTALL)
            data = json.loads(json_match.group() if json_match else raw)
        except (json.JSONDecodeError, AttributeError):
            data = {"title": request.topic, "body": raw.strip()}

        title = data.get("title", request.topic)
        body  = data.get("body", raw.strip())

        # LLM sometimes returns body as a nested dict/list instead of a plain string.
        # Convert to readable plain text so it posts correctly.
        if not isinstance(body, str):
            if isinstance(body, dict):
                body = "\n\n".join(str(v) for v in body.values() if v)
            elif isinstance(body, list):
                body = "\n\n".join(str(item) for item in body if item)
            else:
                body = str(body)

        # Strip any accidental JSON wrapper the LLM put around the body text itself
        body = body.strip()
        if body.startswith('{') and body.endswith('}'):
            try:
                inner = json.loads(body)
                if isinstance(inner, dict):
                    body = "\n\n".join(str(v) for v in inner.values() if v)
            except (json.JSONDecodeError, TypeError):
                pass

        return ContentWriterResponse(
            title=title,
            body=body,
            content_format=fmt,
            word_count=len(body.split()),
        )
