import asyncio
import base64
import json
import os
import re
import shutil
import subprocess
import tempfile as _tempfile

from app.core.clips_store import new_clip_path
from app.services.agents.base import BaseAgent


_cookies_tmp: str | None = None  # module-level cached path


def _yt_dlp_bin() -> str:
    """Resolve yt-dlp binary path reliably across venv and system installs."""
    import sys
    # Check PATH first
    found = shutil.which("yt-dlp")
    if found:
        return found
    # Fall back to the same bin directory as the running Python interpreter
    bin_dir = os.path.dirname(sys.executable)
    candidate = os.path.join(bin_dir, "yt-dlp")
    if os.path.isfile(candidate):
        return candidate
    return "yt-dlp"


def _get_cookies_file() -> str | None:
    """Write YouTube cookies env var to a temp file once; return its path.
    Prefers YOUTUBE_COOKIES_B64 (base64-encoded, safe for multi-line env vars).
    Falls back to YOUTUBE_COOKIES (raw Netscape format).
    """
    global _cookies_tmp
    if _cookies_tmp and os.path.exists(_cookies_tmp):
        return _cookies_tmp

    b64 = os.environ.get("YOUTUBE_COOKIES_B64", "").strip()
    if b64:
        try:
            cookies_content = base64.b64decode(b64).decode("utf-8")
        except Exception as e:
            print(f"[YTShorts] Failed to decode YOUTUBE_COOKIES_B64: {e}")
            cookies_content = ""
    else:
        cookies_content = os.environ.get("YOUTUBE_COOKIES", "").strip()

    if not cookies_content:
        print("[YTShorts] No YouTube cookies configured (YOUTUBE_COOKIES_B64 or YOUTUBE_COOKIES not set)")
        return None

    fd, path = _tempfile.mkstemp(suffix=".txt", prefix="yt_cookies_")
    with os.fdopen(fd, "w") as f:
        f.write(cookies_content)
    _cookies_tmp = path
    print(f"[YTShorts] Cookies file written: {len(cookies_content)} chars")
    return path


def _parse_vtt(vtt_text: str) -> list[dict]:
    """Parse WebVTT subtitle file into transcript entries."""
    entries = []
    blocks = re.split(r"\n\n+", vtt_text.strip())
    time_pattern = re.compile(r"(\d+):(\d+):(\d+\.\d+)\s+-->\s+(\d+):(\d+):(\d+\.\d+)")
    for block in blocks:
        lines = block.strip().splitlines()
        time_line = next((l for l in lines if "-->" in l), None)
        if not time_line:
            continue
        m = time_pattern.search(time_line)
        if not m:
            continue
        h1, m1, s1, h2, m2, s2 = m.groups()
        start = int(h1) * 3600 + int(m1) * 60 + float(s1)
        end   = int(h2) * 3600 + int(m2) * 60 + float(s2)
        text_lines = [l for l in lines if "-->" not in l and not l.strip().isdigit() and l.strip()]
        text = " ".join(text_lines).strip()
        # Strip VTT tags like <00:00:00.000><c>text</c>
        text = re.sub(r"<[^>]+>", "", text).strip()
        if text:
            entries.append({"text": text, "start": start, "duration": max(0.0, end - start)})
    return entries


def _fetch_transcript_ytdlp(video_id: str) -> tuple[list[dict], str]:
    """Fetch transcript using yt-dlp subtitle download. Returns (entries, last_stderr)."""
    import tempfile, os, glob
    yt_dlp_bin = _yt_dlp_bin()
    cookies_file = _get_cookies_file()
    url = f"https://www.youtube.com/watch?v={video_id}"
    last_stderr = ""
    with tempfile.TemporaryDirectory() as tmpdir:
        out_template = os.path.join(tmpdir, "sub")
        files = []
        for sub_flag in ["--write-auto-subs", "--write-subs"]:
            cmd = [
                yt_dlp_bin, sub_flag, "--skip-download",
                "--sub-langs", "en,en-US,en-GB,en-IN",
                "--sub-format", "vtt",
                "-o", out_template,
            ]
            if cookies_file:
                cmd += ["--cookies", cookies_file]
            else:
                # No cookies: try android client to bypass IP restrictions
                cmd += ["--extractor-args", "youtube:player_client=android,web"]
            cmd.append(url)
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
            files = glob.glob(os.path.join(tmpdir, "*.vtt"))
            if files:
                break
            last_stderr = result.stderr
            print(f"[YTShorts] yt-dlp stderr ({sub_flag}): {result.stderr[-400:]}")

        if not files:
            print(f"[YTShorts] binary={yt_dlp_bin} cookies={'yes' if cookies_file else 'no'}")
            return [], last_stderr

        with open(files[0], "r", encoding="utf-8") as f:
            return _parse_vtt(f.read()), ""


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

        # ── 1. Fetch transcript via yt-dlp (handles cloud IP blocks better) ────
        transcript_list, ytdlp_err = await loop.run_in_executor(
            None, _fetch_transcript_ytdlp, video_id
        )
        if not transcript_list:
            detail = f" yt-dlp: {ytdlp_err[-200:]}" if ytdlp_err else ""
            raise ValueError(
                f"No transcript available for this video. "
                f"Make sure it has English captions or auto-generated subtitles enabled.{detail}"
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
        _yt_dlp = _yt_dlp_bin()
        _cookies = _get_cookies_file()
        video_title = "YouTube Video"
        try:
            _title_cmd = [_yt_dlp, "--print", "title", "--no-download", "--no-playlist"]
            if _cookies:
                _title_cmd += ["--cookies", _cookies]
            _title_cmd.append(url)
            r = await loop.run_in_executor(
                None,
                lambda: subprocess.run(_title_cmd, capture_output=True, text=True, timeout=20),
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
        """Download a clip segment via yt-dlp, crop with ffmpeg. Returns clip_id."""
        import tempfile as _tf
        loop = asyncio.get_event_loop()
        clip_id, output_path = new_clip_path("mp4")
        duration = end_seconds - start_seconds
        _ytdlp = _yt_dlp_bin()
        _ffmpeg = shutil.which("ffmpeg") or "ffmpeg"
        _cookies = _get_cookies_file()

        def _ts(secs: int) -> str:
            h, r = divmod(secs, 3600)
            m, s = divmod(r, 60)
            return f"{h:02d}:{m:02d}:{s:02d}"

        with _tf.TemporaryDirectory() as tmpdir:
            raw_path = os.path.join(tmpdir, "raw.mp4")

            # ── 1. Download clip section via yt-dlp ───────────────────────────
            dl_cmd = [
                _ytdlp,
                "--download-sections", f"*{_ts(start_seconds)}-{_ts(end_seconds)}",
                "--format", "bestvideo[ext=mp4][height<=1080]+bestaudio[ext=m4a]/best[ext=mp4]/best",
                "--merge-output-format", "mp4",
                "--no-playlist",
                "-o", raw_path,
            ]
            if _cookies:
                dl_cmd += ["--cookies", _cookies]
            dl_cmd.append(url)

            try:
                dl_result = await loop.run_in_executor(
                    None,
                    lambda: subprocess.run(dl_cmd, capture_output=True, text=True, timeout=300),
                )
            except subprocess.TimeoutExpired:
                raise Exception("Download timed out (>5 min). Try a shorter clip.")
            except FileNotFoundError:
                raise Exception("yt-dlp is not installed on this server.")

            if dl_result.returncode != 0 or not os.path.exists(raw_path):
                detail = dl_result.stderr[-400:] if dl_result.stderr else "unknown error"
                raise Exception(f"yt-dlp download failed: {detail}")

            # ── 2. Encode / crop with ffmpeg from local file ──────────────────
            ff_cmd = [_ffmpeg, "-y", "-i", raw_path, "-t", str(duration)]
            ff_cmd += [
                "-c:v", "libx264", "-preset", "fast", "-crf", "23",
                "-c:a", "aac", "-b:a", "128k",
                "-movflags", "+faststart",
            ]
            if crop_vertical:
                ff_cmd += ["-vf", "crop=ih*9/16:ih:(iw-ih*9/16)/2:0,scale=1080:1920"]
            ff_cmd.append(str(output_path))

            try:
                ff_result = await loop.run_in_executor(
                    None,
                    lambda: subprocess.run(ff_cmd, capture_output=True, text=True, timeout=180),
                )
            except subprocess.TimeoutExpired:
                raise Exception("Video encoding timed out (>3 min). Try a shorter clip.")
            except FileNotFoundError:
                raise Exception("ffmpeg is not installed on this server.")

            if ff_result.returncode != 0 or not output_path.exists():
                detail = ff_result.stderr[-400:] if ff_result.stderr else "unknown error"
                raise Exception(f"ffmpeg failed: {detail}")

        return clip_id
