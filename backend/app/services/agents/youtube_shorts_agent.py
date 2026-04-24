import asyncio
import json
import os
import re
import shutil
import subprocess
import tempfile as _tempfile

from app.core.clips_store import new_clip_path
from app.services.agents.base import BaseAgent


def _yt_dlp_bin() -> str:
    import sys
    found = shutil.which("yt-dlp")
    if found:
        return found
    candidate = os.path.join(os.path.dirname(sys.executable), "yt-dlp")
    return candidate if os.path.isfile(candidate) else "yt-dlp"


_cookies_tmp: str | None = None


def _get_cookies_file() -> str | None:
    """Write YOUTUBE_COOKIES_B64 / YOUTUBE_COOKIES env var to a temp file once."""
    global _cookies_tmp
    if _cookies_tmp and os.path.exists(_cookies_tmp):
        return _cookies_tmp

    import base64
    b64 = os.environ.get("YOUTUBE_COOKIES_B64", "").strip()
    if b64:
        try:
            content = base64.b64decode(b64).decode("utf-8")
        except Exception:
            content = ""
    else:
        content = os.environ.get("YOUTUBE_COOKIES", "").strip()

    if not content:
        return None

    fd, path = _tempfile.mkstemp(suffix=".txt", prefix="yt_cookies_")
    with os.fdopen(fd, "w") as f:
        f.write(content)
    _cookies_tmp = path
    print(f"[YTShorts] Cookies file ready ({len(content)} chars)")
    return path


def _fetch_transcript(video_id: str) -> tuple[list[dict], str]:
    """Fetch transcript via youtube-transcript-api, using YOUTUBE_PROXY if set."""
    from youtube_transcript_api import (
        YouTubeTranscriptApi,
        NoTranscriptFound,
        TranscriptsDisabled,
    )

    proxy = os.environ.get("YOUTUBE_PROXY", "").strip()
    proxies = {"https": proxy, "http": proxy} if proxy else None
    langs = ["en", "en-US", "en-GB", "en-IN"]
    print(f"[YTShorts] Fetching transcript for {video_id} (proxy={'yes' if proxy else 'no'})")

    def _to_entries(raw) -> list[dict]:
        entries = []
        for e in raw:
            if isinstance(e, dict):
                entries.append({"text": e["text"], "start": e["start"], "duration": e["duration"]})
            else:
                entries.append({"text": e.text, "start": e.start, "duration": e.duration})
        return entries

    errors: list[str] = []

    try:
        # Build API instance — try proxy_config (new API, 0.6.x+) then proxies kwarg (old API)
        api = None
        if proxies:
            try:
                from youtube_transcript_api.proxies import GenericProxyConfig
                api = YouTubeTranscriptApi(
                    proxy_config=GenericProxyConfig(
                        http_url=proxy, https_url=proxy
                    )
                )
                print(f"[YTShorts] Using proxy via GenericProxyConfig")
            except (ImportError, Exception) as e:
                print(f"[YTShorts] GenericProxyConfig failed ({e}), trying proxies kwarg")

            if api is None:
                try:
                    api = YouTubeTranscriptApi(proxies=proxies)
                    print(f"[YTShorts] Using proxy via proxies kwarg")
                except TypeError:
                    print(f"[YTShorts] proxies kwarg not supported — proxy NOT applied!")

        if api is None:
            api = YouTubeTranscriptApi()

        # ── Strategy 1: instance .fetch(languages=…) — newest API ────────────
        if hasattr(api, "fetch"):
            try:
                raw = list(api.fetch(video_id, languages=langs))
                entries = _to_entries(raw)
                print(f"[YTShorts] Transcript via fetch(languages): {len(entries)} entries")
                return entries, ""
            except (TranscriptsDisabled, NoTranscriptFound):
                raise
            except TypeError:
                pass  # languages kwarg not supported, try without
            except Exception as e:
                errors.append(f"fetch(languages): {e}")
                print(f"[YTShorts] fetch(languages) failed: {e}")

            # Strategy 1b: fetch without languages kwarg
            try:
                raw = list(api.fetch(video_id))
                entries = _to_entries(raw)
                print(f"[YTShorts] Transcript via fetch(): {len(entries)} entries")
                return entries, ""
            except (TranscriptsDisabled, NoTranscriptFound):
                raise
            except Exception as e:
                errors.append(f"fetch(): {e}")
                print(f"[YTShorts] fetch() failed: {e}")

        # ── Strategy 2: api.list() → find_transcript() → fetch() ─────────────
        if hasattr(api, "list"):
            try:
                tlist = api.list(video_id)
                transcript = tlist.find_transcript(langs)
                raw = list(transcript.fetch())
                entries = _to_entries(raw)
                print(f"[YTShorts] Transcript via list().find().fetch(): {len(entries)} entries")
                return entries, ""
            except (TranscriptsDisabled, NoTranscriptFound):
                raise
            except Exception as e:
                errors.append(f"list().find().fetch(): {e}")
                print(f"[YTShorts] list().find().fetch() failed: {e}")

        # ── Strategy 3: instance .get_transcript() — older API ───────────────
        if hasattr(api, "get_transcript"):
            try:
                raw = api.get_transcript(video_id, languages=langs)
                entries = _to_entries(raw)
                print(f"[YTShorts] Transcript via instance.get_transcript(): {len(entries)} entries")
                return entries, ""
            except (TranscriptsDisabled, NoTranscriptFound):
                raise
            except Exception as e:
                errors.append(f"instance.get_transcript(): {e}")
                print(f"[YTShorts] instance.get_transcript() failed: {e}")

        summary = "; ".join(errors) if errors else "no compatible API method found"
        raise Exception(summary)

    except TranscriptsDisabled:
        return [], "Captions are disabled for this video"
    except NoTranscriptFound:
        return [], "No English transcript found for this video"
    except Exception as e:
        return [], str(e)


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

    async def analyze(self, url: str, user_id: str | None = None) -> dict:
        loop = asyncio.get_event_loop()
        video_id = _extract_video_id(url)

        # ── 1. Fetch transcript ───────────────────────────────────────────────
        transcript_list, err = await loop.run_in_executor(
            None, _fetch_transcript, video_id
        )
        if not transcript_list:
            proxy_set = bool(os.environ.get("YOUTUBE_PROXY", "").strip())
            hint = (
                f" ({err})"
                if proxy_set
                else (
                    f" ({err}) — On production servers YouTube blocks direct requests. "
                    "Set the YOUTUBE_PROXY environment variable to a residential proxy "
                    "(e.g. free tier at webshare.io) to fix this."
                )
            )
            raise ValueError(
                f"No transcript available for this video. "
                f"Make sure it has English captions or auto-generated subtitles enabled.{hint}"
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
            _yt_dlp = _yt_dlp_bin()
            r = await loop.run_in_executor(
                None,
                lambda: subprocess.run(
                    [_yt_dlp, "--print", "title", "--no-download", "--no-playlist", url],
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

        user_prompt = f"""Video: "{video_title}"
Total duration: {int(total_duration // 60)}:{int(total_duration % 60):02d}

Transcript (format: [MM:SS / Nseconds] text):
{full_transcript}

Find the 3-5 best moments to clip as YouTube Shorts."""

        raw = self._chat(system, user_prompt, max_tokens=1500)

        try:
            json_match = re.search(r"\{.*\}", raw, re.DOTALL)
            data = json.loads(json_match.group() if json_match else raw)
        except (json.JSONDecodeError, AttributeError):
            data = {"moments": []}

        moments = []
        for i, m in enumerate(data.get("moments", [])[:5]):
            start = int(float(m.get("start_seconds", 0)))
            end   = int(float(m.get("end_seconds", start + 45)))
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
        """Download clip via yt-dlp --download-sections, encode with ffmpeg."""
        import tempfile as _tf
        loop = asyncio.get_event_loop()
        clip_id, output_path = new_clip_path("mp4")
        duration = end_seconds - start_seconds
        _ytdlp = _yt_dlp_bin()
        _ffmpeg = shutil.which("ffmpeg") or "ffmpeg"

        def _ts(secs: int) -> str:
            h, r = divmod(secs, 3600)
            m, s = divmod(r, 60)
            return f"{h:02d}:{m:02d}:{s:02d}"

        cookies = _get_cookies_file()

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
            if cookies:
                dl_cmd += ["--cookies", cookies]
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

            raw_size = os.path.getsize(raw_path)
            if raw_size < 10_000:
                detail = dl_result.stderr[-400:] if dl_result.stderr else "no details"
                raise Exception(
                    f"yt-dlp downloaded an empty/invalid file ({raw_size} bytes). "
                    f"This usually means YouTube blocked the request — ensure YOUTUBE_COOKIES_B64 is set and valid. {detail}"
                )

            # ── 2. Encode / crop with ffmpeg ──────────────────────────────────
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
