import asyncio
import base64
import urllib.parse
import httpx
from app.services.agents.base import BaseAgent
from app.schemas.agents import ImageGeneratorRequest, ImageGeneratorResponse
from app.core.config import settings

PLATFORM_SIZES = {
    'instagram_square':   (1024, 1024),
    'instagram_portrait': (768,  960),
    'twitter':            (1024, 576),
    'linkedin':           (1024, 536),
    'tiktok':             (576,  1024),
    'youtube':            (1024, 576),
    'general':            (1024, 1024),
}

STYLE_SUFFIXES = {
    'photorealistic': 'photorealistic, DSLR quality, sharp focus, professional photography',
    'illustration':   'digital illustration, clean lines, vibrant colors, editorial style',
    'minimalist':     'minimalist design, clean, simple, flat design, modern',
    'cinematic':      'cinematic, dramatic lighting, film grain, movie still, moody',
    'cartoon':        'cartoon style, bold outlines, flat colors, fun and playful',
    'abstract':       'abstract art, bold colors, modern art, expressive',
}

HF_MODELS = [
    "black-forest-labs/FLUX.1-schnell",
    "stabilityai/stable-diffusion-xl-base-1.0",
    "runwayml/stable-diffusion-v1-5",
]


class ImageGeneratorAgent(BaseAgent):
    async def run(self, request: ImageGeneratorRequest) -> ImageGeneratorResponse:
        niche_ctx = f"\nCreator niche: {request.niche}" if request.niche else ""
        location_ctx = f"\nCreator location: {request.location} — incorporate region-appropriate settings, aesthetics, or cultural visual elements if relevant" if request.location else ""

        system = f"""You are an expert at writing prompts for AI image generation.
Convert descriptions into concise, vivid image prompts (max 80 words).
Focus on: subject, lighting, colors, composition, mood.
No quotation marks. No forbidden content. Just the prompt text.{niche_ctx}{location_ctx}"""

        user = f"""Image prompt for:
Description: {request.description}
Style: {request.style}
Mood: {request.mood or 'professional'}"""

        enhanced_prompt = self._chat(system, user, max_tokens=150).strip()

        style_suffix = STYLE_SUFFIXES.get(request.style or 'photorealistic', '')
        full_prompt = f"{enhanced_prompt}, {style_suffix}" if style_suffix else enhanced_prompt

        width, height = PLATFORM_SIZES.get(request.platform or 'general', (1024, 1024))

        print(f"[ImageGenerator] Prompt: {full_prompt[:100]}...")

        fal_key      = settings.FAL_KEY.strip()
        hf_key       = settings.HUGGINGFACE_API_KEY.strip()
        together_key = settings.TOGETHER_API_KEY.strip()

        # Waterfall: Fal.ai → HF → Together → Stable Horde → Pollinations
        image_bytes: bytes | None = None

        if fal_key:
            try:
                image_bytes = await self._generate_fal(full_prompt, width, height, fal_key)
            except Exception as e:
                print(f"[ImageGenerator] Fal.ai failed: {e}")

        if image_bytes is None and hf_key:
            try:
                image_bytes = await self._generate_huggingface(full_prompt, width, height, hf_key)
            except Exception as e:
                print(f"[ImageGenerator] HuggingFace failed: {e}")

        if image_bytes is None and together_key:
            try:
                image_bytes = await self._generate_together(full_prompt, width, height, together_key)
            except Exception as e:
                print(f"[ImageGenerator] Together AI failed: {e}")

        if image_bytes is None:
            try:
                image_bytes = await self._generate_stable_horde(full_prompt, width, height)
            except Exception as e:
                print(f"[ImageGenerator] Stable Horde failed: {e}")

        if image_bytes is None:
            try:
                image_bytes = await self._generate_pollinations(full_prompt, width, height)
            except Exception as e:
                print(f"[ImageGenerator] Pollinations failed: {e}")

        if image_bytes is None:
            raise RuntimeError(
                "All image generation providers are currently unavailable. "
                "Please try again in a moment."
            )

        data_url = f"data:image/jpeg;base64,{base64.b64encode(image_bytes).decode()}"

        return ImageGeneratorResponse(
            image_url=data_url,
            prompt_used=full_prompt,
            width=width,
            height=height,
            platform=request.platform or 'general',
        )

    # ── Providers ──────────────────────────────────────────────────────────

    async def _generate_fal(self, prompt: str, width: int, height: int, api_key: str) -> bytes:
        """Fal.ai FLUX.1-schnell — $10 free credits on signup (fal.ai), no card needed."""
        print("[ImageGenerator] Trying Fal.ai...")
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                "https://fal.run/fal-ai/flux/schnell",
                headers={"Authorization": f"Key {api_key}", "Content-Type": "application/json"},
                json={
                    "prompt": prompt,
                    "image_size": {"width": min(width, 1024), "height": min(height, 1024)},
                    "num_inference_steps": 4,
                    "num_images": 1,
                    "enable_safety_checker": False,
                },
            )
            print(f"[ImageGenerator] Fal.ai → {resp.status_code}")
            if resp.status_code != 200:
                raise RuntimeError(f"Fal.ai {resp.status_code}: {resp.text[:200]}")
            image_url = resp.json()["images"][0]["url"]
            # Download the image
            img_resp = await client.get(image_url)
            if not img_resp.headers.get("content-type", "").startswith("image/"):
                raise RuntimeError("Fal.ai returned non-image content.")
            return img_resp.content

    async def _generate_huggingface(self, prompt: str, width: int, height: int, api_key: str) -> bytes:
        """Hugging Face Inference API — free tier. Single pass, fast-fail on auth/billing."""
        async with httpx.AsyncClient(timeout=30.0) as client:
            for model in HF_MODELS:
                print(f"[ImageGenerator] HF trying {model}")
                try:
                    resp = await client.post(
                        f"https://router.huggingface.co/hf-inference/models/{model}",
                        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                        json={"inputs": prompt, "parameters": {"width": min(width, 1024), "height": min(height, 1024), "num_inference_steps": 4}},
                    )
                    ct = resp.headers.get("content-type", "")
                    print(f"[ImageGenerator] HF {model} → {resp.status_code}")

                    if resp.status_code == 200 and ct.startswith("image/"):
                        return resp.content

                    if resp.status_code in (401, 402):
                        raise RuntimeError(f"HuggingFace auth/billing error ({resp.status_code}) — skipping provider.")

                    # 503 = model loading, any other = just try next model
                except RuntimeError:
                    raise
                except Exception as e:
                    print(f"[ImageGenerator] HF {model} exception: {e}")

        raise RuntimeError("HuggingFace: no model succeeded.")

    async def _generate_together(self, prompt: str, width: int, height: int, api_key: str) -> bytes:
        """Together AI — FLUX.1-schnell-Free (requires billing)."""
        print("[ImageGenerator] Trying Together AI...")
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                "https://api.together.xyz/v1/images/generations",
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                json={"model": "black-forest-labs/FLUX.1-schnell-Free", "prompt": prompt,
                      "width": width, "height": height, "steps": 4, "n": 1, "response_format": "b64_json"},
            )
            print(f"[ImageGenerator] Together AI → {resp.status_code}")
            if resp.status_code != 200:
                raise RuntimeError(f"Together AI {resp.status_code}: {resp.text[:200]}")
            return base64.b64decode(resp.json()["data"][0]["b64_json"])

    async def _generate_stable_horde(self, prompt: str, width: int, height: int) -> bytes:
        """Stable Horde — community-run, completely free. No key required (uses anonymous key)."""
        import random
        horde_key = getattr(settings, 'STABLE_HORDE_API_KEY', '').strip() or "0000000000"
        w = min(width, 1024)
        h = min(height, 1024)
        # Round to nearest 64px (Stable Horde requirement)
        w = round(w / 64) * 64
        h = round(h / 64) * 64

        print(f"[ImageGenerator] Stable Horde submitting job {w}x{h}...")
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                "https://stablehorde.net/api/v1/generate/async",
                headers={"apikey": horde_key, "Content-Type": "application/json"},
                json={
                    "prompt": prompt,
                    "params": {
                        "width": w,
                        "height": h,
                        "steps": 20,
                        "sampler_name": "k_euler",
                        "cfg_scale": 7,
                        "n": 1,
                    },
                    "models": ["stable_diffusion"],
                    "r2": False,
                },
            )
            if resp.status_code != 202:
                raise RuntimeError(f"Stable Horde submit error {resp.status_code}: {resp.text[:200]}")
            job_id = resp.json().get("id")

        print(f"[ImageGenerator] Stable Horde job {job_id} — polling...")
        deadline = asyncio.get_event_loop().time() + 90  # max 90s wait
        async with httpx.AsyncClient(timeout=15.0) as client:
            while asyncio.get_event_loop().time() < deadline:
                await asyncio.sleep(5)
                check = await client.get(
                    f"https://stablehorde.net/api/v1/generate/check/{job_id}",
                    headers={"apikey": horde_key},
                )
                data = check.json()
                print(f"[ImageGenerator] Stable Horde check: done={data.get('done')} queue={data.get('queue_position')}")
                if data.get("done"):
                    status = await client.get(
                        f"https://stablehorde.net/api/v1/generate/status/{job_id}",
                        headers={"apikey": horde_key},
                    )
                    gen = status.json().get("generations", [])
                    if gen and gen[0].get("img"):
                        return base64.b64decode(gen[0]["img"])
                    raise RuntimeError("Stable Horde returned no image.")

        raise RuntimeError("Stable Horde timed out after 90s.")

    async def _generate_pollinations(self, prompt: str, width: int, height: int) -> bytes:
        """Pollinations AI — free, no key. Single attempt per model, no long waits."""
        import random
        encoded = urllib.parse.quote(prompt[:400])
        seed = random.randint(1, 999999)
        w = min(width, 1024)
        h = min(height, 1024)

        async with httpx.AsyncClient(timeout=45.0, follow_redirects=True) as client:
            for model in ["flux", "turbo", "flux-realism"]:
                url = (
                    f"https://image.pollinations.ai/prompt/{encoded}"
                    f"?width={w}&height={h}&nologo=true&model={model}&seed={seed}"
                )
                print(f"[ImageGenerator] Pollinations model={model} ...")
                try:
                    resp = await client.get(url)
                    ct = resp.headers.get("content-type", "")
                    print(f"[ImageGenerator] Pollinations {model} → {resp.status_code} {ct}")
                    if resp.status_code == 200 and ct.startswith("image/"):
                        return resp.content
                except Exception as e:
                    print(f"[ImageGenerator] Pollinations {model} error: {e}")

        raise RuntimeError("Pollinations: all models failed.")
