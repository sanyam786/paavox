import asyncio
import json
import re
import subprocess

from app.core.clips_store import new_clip_path
from app.services.agents.base import BaseAgent


def _extract_video_id(url: str) -> str:
    patterns = [
        r"youtu\.be/([A-Za-z0-9_-]{11})",
        r"[?&]v=([A-Za-z0-9_-]{11})",
        r"shorts/([A-Za-z0-9_-]{11})",
        r"embed/([A-Za-z0-9_-]{11})",
    ]
    for p in patterns:
        m = re.search(p, url)
        if m:
            return m.group(1)
    raise ValueError("Invalid YouTube URL. Use a youtube.com or youtu.be link.")


class YouTubeShortsAgent(BaseAgent):

    async def analyze(self, url: str) -> dict:
        loop = asyncio.get_event_loop()
        video_id = _extract_video_id(url)

        # ── 1. Fetch transcript ───────────────────────────────────────────────
        try:
            from youtube_transcript_api import YouTubeTranscriptApi

            def _fetch():
                api = YouTubeTranscriptApi()
                return api.fetch(video_id, languages=["en", "en-US", "en-GB", "en-IN", "hi"])

            transcript_list = await loop.run_in_executor(None, _fetch)
            # Normalise: new API returns objects with .text/.start/.duration attrs
            transcript_list = [
                {
                    "text": getattr(e, "text", e.get("text", "") if isinstance(e, dict) else ""),
                    "start": float(getattr(e, "start", e.get("start", 0) if isinstance(e, dict) else 0)),
                    "duration": float(getattr(e, "duration", e.get("duration", 0) if isinstance(e, dict) else 0)),
                }
                for e in transcript_list
            ]
        except Exception as e:
            raise ValueError(
                f"No transcript available for this video. "
                f"Make sure it has English captions enabled. ({e})"
            )

        # ── 2. Build timestamped transcript text ──────────────────────────────
        total_duration = 0.0
        lines = []
        for entry in transcript_list:
            start = float(entry["start"])
            total_duration = max(total_duration, start + float(entry.get("duration", 0)))
            mins, secs = divmod(int(start), 60)
            hrs = mins // 60
            mins = mins % 60
            ts = f"{hrs}:{mins:02d}:{secs:02d}" if hrs else f"{mins}:{secs:02d}"
            lines.append(f"[{ts} / {int(start)}s] {entry['text']}")

        full_transcript = "\n".join(lines)
        if len(full_transcript) > 10000:
            full_transcript = full_transcript[:10000] + "\n[transcript truncated]"

        # ── 3. Get video title via yt-dlp ─────────────────────────────────────
        video_title = "YouTube Video"
        try:
            r = await loop.run_in_executor(
                None,
                lambda: subprocess.run(
                    ["yt-dlp", "--print", "title", "--no-download", "--no-playlist", url],
                    capture_output=True, text=True, timeout=20,
                ),
            )
            if r.returncode == 0 and r.stdout.strip():
                video_title = r.stdout.strip()
        except Exception:
            pass

        # ── 4. LLM → identify viral moments ──────────────────────────────────
        system = """You are a viral short-form video strategist. Analyze YouTube transcripts and find the best moments to clip as YouTube Shorts.

Respond ONLY with valid JSON (no markdown):
{
  "moments": [
    {
      "title": "Punchy clip title (max 8 words)",
      "start_seconds": 42,
      "end_seconds": 97,
      "reason": "Why this will perform well as a Short",
      "hook": "Exact opening line or best caption for this clip"
    }
  ]
}

Rules:
- Identify exactly 3-5 moments
- Each clip must be 25-60 seconds (never longer than 60s)
- Prioritize: strong hooks, surprising facts, emotional peaks, actionable tips, quotable lines
- Clips must NOT overlap each other
- Use the integer second values from the transcript (the number after the /)
- Each clip must make sense without watching the rest of the video"""

        user = f"""Video: "{video_title}"
Total duration: {int(total_duration // 60)}:{int(total_duration % 60):02d}

Transcript (format: [MM:SS / Nseconds] text):
{full_transcript}

Find the 3-5 best moments to clip as YouTube Shorts."""

        raw = self._chat(system, user, max_tokens=1500)

        try:
            json_match = re.search(r"\{.*\}", raw, re.DOTALL)
            data = json.loads(json_match.group() if json_match else raw)
        except (json.JSONDecodeError, AttributeError):
            data = {"moments": []}

        moments = []
        for i, m in enumerate(data.get("moments", [])[:5]):
            start = int(float(m.get("start_seconds", 0)))
            end   = int(float(m.get("end_seconds", start + 45)))
            # Clamp duration to 15–60 s
            if end - start < 15:
                end = start + 30
            if end - start > 60:
                end = start + 60
            moments.append({
                "index":            i + 1,
                "title":            m.get("title", f"Moment {i + 1}"),
                "start_seconds":    start,
                "end_seconds":      end,
                "duration_seconds": end - start,
                "reason":           m.get("reason", ""),
                "hook":             m.get("hook", ""),
            })

        return {
            "video_title":            video_title,
            "total_duration_seconds": int(total_duration),
            "moments":                moments,
        }

    async def generate_clip(
        self,
        url: str,
        start_seconds: int,
        end_seconds: int,
        title: str,
        crop_vertical: bool = True,
    ) -> str:
        """Download a clip segment, optionally crop 16:9→9:16. Returns clip_id."""
        loop = asyncio.get_event_loop()
        clip_id, output_path = new_clip_path("mp4")
        duration = end_seconds - start_seconds

        # ── 1. Resolve direct stream URLs ─────────────────────────────────────
        try:
            r = await loop.run_in_executor(
                None,
                lambda: subprocess.run(
                    [
                        "yt-dlp",
                        "--get-url",
                        "--format", "bestvideo[ext=mp4][height<=1080]+bestaudio[ext=m4a]/best[ext=mp4]/best",
                        "--no-playlist",
                        url,
                    ],
                    capture_output=True, text=True, timeout=30,
                ),
            )
        except Exception as e:
            raise Exception(f"yt-dlp could not resolve stream URL: {e}")

        stream_urls = [u.strip() for u in r.stdout.strip().splitlines() if u.strip()]
        if not stream_urls:
            raise Exception(
                "Could not resolve YouTube stream URL. "
                "The video may be private, age-restricted, or yt-dlp needs updating."
            )

        video_stream = stream_urls[0]
        audio_stream = stream_urls[1] if len(stream_urls) > 1 else None

        # ── 2. Build ffmpeg command ───────────────────────────────────────────
        # Pre-input -ss = fast stream-seek (accurate enough for social clips)
        cmd = ["ffmpeg", "-y", "-ss", str(start_seconds), "-i", video_stream]

        if audio_stream:
            cmd += ["-ss", str(start_seconds), "-i", audio_stream]

        cmd += [
            "-t", str(duration),
            "-c:v", "libx264", "-preset", "fast", "-crf", "23",
            "-c:a", "aac", "-b:a", "128k",
            "-movflags", "+faststart",
        ]

        if crop_vertical:
            # Center-crop 16:9 source to 9:16, scale to 1080×1920
            cmd += ["-vf", "crop=ih*9/16:ih:(iw-ih*9/16)/2:0,scale=1080:1920"]

        if audio_stream:
            cmd += ["-map", "0:v:0", "-map", "1:a:0"]

        cmd.append(str(output_path))

        # ── 3. Run ffmpeg ─────────────────────────────────────────────────────
        try:
            result = await loop.run_in_executor(
                None,
                lambda: subprocess.run(cmd, capture_output=True, text=True, timeout=180),
            )
        except subprocess.TimeoutExpired:
            raise Exception("Video processing timed out (>3 min). Try a shorter clip.")
        except FileNotFoundError:
            raise Exception("ffmpeg is not installed on this server.")

        if result.returncode != 0 or not output_path.exists():
            detail = result.stderr[-400:] if result.stderr else "unknown error"
            raise Exception(f"ffmpeg failed: {detail}")

        return clip_id
