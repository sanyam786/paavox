import base64
import json
import re

import httpx

from app.core.config import settings
from app.schemas.agents import VideoCreatorRequest, VideoCreatorResponse, VideoScene
from app.services.agents.base import BaseAgent

STYLE_SUFFIXES = {
    "cinematic":    "cinematic lighting, dramatic composition, film grain, professional camera work, depth of field",
    "vlog":         "casual authentic vlog style, natural daylight, handheld feel, warm colour grade",
    "educational":  "clean modern visuals, clear presentation, professional studio look, minimal distractions",
    "promotional":  "vibrant colours, dynamic energy, high-contrast, commercial broadcast quality",
    "storytelling": "documentary style, emotional narrative, natural light, intimate camera angles",
}

ASPECT_LABELS = {
    "9:16": "vertical Reels / TikTok",
    "1:1":  "square feed post",
    "16:9": "horizontal YouTube / landscape",
}

# Fal.ai image sizes for cover image fallback
COVER_SIZES = {
    "9:16": {"width": 768,  "height": 1344},
    "1:1":  {"width": 1024, "height": 1024},
    "16:9": {"width": 1344, "height": 768},
}


class VideoCreatorAgent(BaseAgent):
    async def run(self, request: VideoCreatorRequest) -> VideoCreatorResponse:
        aspect_ratio  = request.aspect_ratio or "9:16"
        style         = request.style or "cinematic"
        duration      = request.duration or 5

        # ── Step 1: LLM → storyboard + cinematic video prompt ────────────────
        context_parts = []
        if request.niche:
            context_parts.append(f"Creator niche: {request.niche}")
        if request.brand_voice:
            context_parts.append(f"Brand voice: {request.brand_voice}")
        if request.location:
            context_parts.append(f"Location: {request.location} — visuals should reflect regional aesthetics where relevant")
        context_block = ("\n" + "\n".join(context_parts)) if context_parts else ""

        # If the content body contains an explicit AI VIDEO PROMPT (from the pipeline
        # content writer), extract and use it directly — it's already a cinematic prompt.
        content_ref = ""
        if request.content_body:
            prompt_match = re.search(
                r'AI VIDEO PROMPT:\s*(.+?)(?:\n---|\n[A-Z]{2,}|\Z)',
                request.content_body,
                re.IGNORECASE | re.DOTALL,
            )
            if prompt_match:
                extracted = prompt_match.group(1).strip().split('\n')[0].strip()
                content_ref = f"\n\nUse this as the primary visual concept — it was written specifically for AI video generation:\n{extracted}"
            else:
                content_ref = f"\n\nBase the video on this content (focus on the hook/first scene only for the visual prompt):\n{request.content_body[:500]}"

        format_label = ASPECT_LABELS.get(aspect_ratio, aspect_ratio)

        system = f"""You are an expert short-form video director who creates viral reels and TikToks.{context_block}

Always respond with valid JSON in this exact format:
{{
  "video_prompt": "A single comprehensive text-to-video prompt (100-200 words). Describe the visuals, subject, actions, lighting, camera movements, and mood vividly. NO dialogue, NO text overlays in the prompt — only visual descriptions.",
  "script": "The full spoken narration / hook / voiceover for the entire video",
  "scenes": [
    {{
      "scene_number": 1,
      "visual_description": "What happens visually in this scene",
      "text_overlay": "Short on-screen text (max 6 words)",
      "spoken_words": "What is spoken / narrated in this scene"
    }}
  ]
}}"""

        user = f"""Create a {duration}-second {style} short video about:
{request.topic}{content_ref}

Format: {format_label}
Style: {style}
IMPORTANT: This is a {duration}-second clip — one powerful single scene, not multiple scenes. The video_prompt must describe ONE continuous shot that works in {duration} seconds. Hook must land in the first 2 seconds."""

        raw = self._chat(system, user, max_tokens=1200)

        try:
            json_match = re.search(r'\{.*\}', raw, re.DOTALL)
            data = json.loads(json_match.group() if json_match else raw)
        except (json.JSONDecodeError, AttributeError):
            data = {}

        video_prompt = data.get("video_prompt") or request.topic
        style_suffix = STYLE_SUFFIXES.get(style, "")
        full_prompt  = f"{video_prompt}, {style_suffix}" if style_suffix else video_prompt

        script = data.get("script", "")
        scenes = [
            VideoScene(
                scene_number=s.get("scene_number", i + 1),
                visual_description=s.get("visual_description", ""),
                text_overlay=s.get("text_overlay", ""),
                spoken_words=s.get("spoken_words", ""),
            )
            for i, s in enumerate(data.get("scenes", []))
        ]

        # ── Step 2: Generate video via Fal.ai Kling ──────────────────────────
        video_url       = ""
        cover_image_url = ""
        video_error     = ""
        fal_key         = settings.FAL_KEY.strip()

        if not fal_key:
            video_error = "FAL_KEY is not configured. Add it to your .env to enable AI video generation."
        else:
            try:
                video_url = await self._generate_fal_video(full_prompt, aspect_ratio, duration, fal_key)
                print(f"[VideoCreator] Video URL: {video_url[:80]}...")
            except Exception as e:
                video_error = str(e)
                print(f"[VideoCreator] Kling video failed: {e}")

            if not video_url:
                # Fallback: generate a cover image via FLUX
                try:
                    cover_image_url = await self._generate_cover_image(full_prompt, aspect_ratio, fal_key)
                    print("[VideoCreator] Cover image generated as fallback.")
                except Exception as e:
                    print(f"[VideoCreator] Cover image failed: {e}")

        return VideoCreatorResponse(
            video_url=video_url,
            cover_image_url=cover_image_url,
            video_error=video_error,
            script=script,
            scenes=scenes,
            prompt_used=full_prompt,
            duration=duration,
            aspect_ratio=aspect_ratio,
        )

    async def _generate_fal_video(
        self, prompt: str, aspect_ratio: str, duration: int, api_key: str
    ) -> str:
        """Generate video — tries fast models first, falls back to Kling."""
        import os
        import fal_client
        os.environ["FAL_KEY"] = api_key

        # LTX Video sizes for aspect ratio
        ltx_sizes = {
            "9:16": (576, 1024),
            "1:1":  (768, 768),
            "16:9": (1024, 576),
        }

        # Models in speed order: LTX (~30s) → Kling v1.6 (~3min) → Kling v1
        candidates = [
            {
                "id": "fal-ai/ltx-video",
                "args": lambda: {
                    "prompt": prompt[:500],
                    "width":  ltx_sizes.get(aspect_ratio, (576, 1024))[0],
                    "height": ltx_sizes.get(aspect_ratio, (576, 1024))[1],
                    "num_frames": duration * 25,
                    "fps": 25,
                    "num_inference_steps": 30,
                },
                "url_path": lambda r: r.get("video", {}).get("url") or r.get("url", ""),
            },
            {
                "id": "fal-ai/kling-video/v1.6/standard/text-to-video",
                "args": lambda: {
                    "prompt": prompt[:800],
                    "duration": str(duration),
                    "aspect_ratio": aspect_ratio,
                },
                "url_path": lambda r: r.get("video", {}).get("url", ""),
            },
            {
                "id": "fal-ai/kling-video/v1/standard/text-to-video",
                "args": lambda: {
                    "prompt": prompt[:800],
                    "duration": str(duration),
                    "aspect_ratio": aspect_ratio,
                },
                "url_path": lambda r: r.get("video", {}).get("url", ""),
            },
        ]

        for candidate in candidates:
            model_id = candidate["id"]
            try:
                print(f"[VideoCreator] Trying: {model_id}")
                result = await fal_client.subscribe_async(
                    model_id,
                    arguments=candidate["args"](),
                    on_queue_update=lambda u: print(f"[VideoCreator] {type(u).__name__}"),
                )
                url = candidate["url_path"](result)
                if url:
                    print(f"[VideoCreator] Success with {model_id}")
                    return url
                print(f"[VideoCreator] {model_id} returned no URL, trying next...")
            except Exception as e:
                print(f"[VideoCreator] {model_id} failed: {e}")
                continue

        return ""

    async def _generate_cover_image(
        self, prompt: str, aspect_ratio: str, api_key: str
    ) -> str:
        """Generate a cover/thumbnail image via Fal.ai FLUX as fallback."""
        size = COVER_SIZES.get(aspect_ratio, {"width": 1024, "height": 1024})
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                "https://fal.run/fal-ai/flux/schnell",
                headers={"Authorization": f"Key {api_key}"},
                json={
                    "prompt": prompt[:400],
                    "image_size": size,
                    "num_inference_steps": 4,
                    "num_images": 1,
                    "enable_safety_checker": False,
                },
            )
            resp.raise_for_status()
            img_url = resp.json()["images"][0]["url"]
            img_resp = await client.get(img_url)
            b64 = base64.b64encode(img_resp.content).decode()
            return f"data:image/jpeg;base64,{b64}"
