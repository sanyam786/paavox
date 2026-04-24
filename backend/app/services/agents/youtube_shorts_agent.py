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


_BROWSER_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/124.0.0.0 Safari/537.36"
)

# (client_info, extra_context) — extra_context is merged into the "context" dict
_INNERTUBE_CLIENTS: list[tuple[dict, dict]] = [
    (
        {"clientName": "ANDROID_TESTSUITE", "clientVersion": "1.9", "hl": "en", "gl": "US"},
        {},
    ),
    (
        {"clientName": "MWEB", "clientVersion": "2.20231219.01.00", "hl": "en", "gl": "US"},
        {},
    ),
    (
        {"clientName": "WEB_EMBEDDED_PLAYER", "clientVersion": "2.20231121.08.00", "hl": "en", "gl": "US"},
        {"thirdParty": {"embedUrl": "https://www.youtube.com/"}},
    ),
    (
        {"clientName": "WEB", "clientVersion": "2.20240726.00.00", "hl": "en", "gl": "US"},
        {},
    ),
]


def _parse_json3_events(data: dict) -> list[dict]:
    entries = []
    for event in data.get("events", []):
        if "segs" not in event:
            continue
        text = "".join(s.get("utf8", "") for s in event["segs"]).strip()
        if not text or text == "\n":
            continue
        start_ms = event.get("tStartMs", 0)
        dur_ms = event.get("dDurationMs", 0)
        entries.append({"text": text, "start": start_ms / 1000, "duration": dur_ms / 1000})
    return entries


def _pick_en_track(tracks: list[dict]) -> dict | None:
    return next(
        (t for t in tracks if t.get("languageCode", "").startswith("en") and t.get("kind") == "asr"),
        next((t for t in tracks if t.get("languageCode", "").startswith("en")), None),
    )


def _fetch_transcript(video_id: str) -> tuple[list[dict], str]:
    """
    Fetch transcript via yt-dlp --dump-json (gets signed caption URL) then fetch that URL.
    Falls back to direct InnerTube API calls if yt-dlp fails.
    """
    import httpx

    proxy = os.environ.get("YOUTUBE_PROXY", "").strip().rstrip("/") or None
    cookies_path = _get_cookies_file()
    url = f"https://www.youtube.com/watch?v={video_id}"
    print(f"[YTShorts] Fetching transcript for {video_id} (proxy={'yes' if proxy else 'no'}, cookies={'yes' if cookies_path else 'no'})")

    # ── Strategy 1: yt-dlp --dump-json → extract caption URL → fetch ─────────
    # yt-dlp handles YouTube auth/token complexity. Caption URLs are pre-signed
    # public URLs so we fetch them directly (no proxy needed for the fetch).
    print("[YTShorts] Trying yt-dlp dump-json...")
    try:
        cmd = [
            _yt_dlp_bin(),
            "--skip-download", "--dump-json", "--no-playlist", "-q",
            "--extractor-args", "youtube:player_client=mweb,web,android",
        ]
        if proxy:
            cmd += ["--proxy", proxy]
        if cookies_path:
            cmd += ["--cookies", cookies_path]
        cmd.append(url)

        r = subprocess.run(cmd, capture_output=True, text=True, timeout=90)
        print(f"[YTShorts] yt-dlp dump-json rc={r.returncode}, stdout_len={len(r.stdout)}")
        if r.returncode == 0 and r.stdout.strip():
            info = json.loads(r.stdout)
            auto_caps = info.get("automatic_captions", {})
            subs = info.get("subtitles", {})

            en_formats: list[dict] = []
            for key in ("en", "en-US", "en-GB", "en-IN"):
                en_formats = auto_caps.get(key) or subs.get(key) or []
                if en_formats:
                    break
            if not en_formats:
                for key in list(auto_caps) + list(subs):
                    if key.startswith("en"):
                        en_formats = auto_caps.get(key) or subs.get(key) or []
                        break

            print(f"[YTShorts] yt-dlp dump-json: {len(en_formats)} English caption formats found")
            if en_formats:
                cap_url = next(
                    (f["url"] for f in en_formats if f.get("ext") == "json3"),
                    en_formats[0].get("url"),
                )
                if cap_url:
                    # Caption URLs are pre-signed; fetch directly (no proxy needed)
                    with httpx.Client(timeout=30, headers={"User-Agent": _BROWSER_UA}) as hc:
                        cap_resp = hc.get(f"{cap_url}&fmt=json3")
                        print(f"[YTShorts] Caption URL fetch HTTP {cap_resp.status_code}")
                        if cap_resp.is_success:
                            entries = _parse_json3_events(cap_resp.json())
                            if entries:
                                print(f"[YTShorts] Transcript via yt-dlp dump-json: {len(entries)} entries")
                                return entries, ""
            else:
                avail = list(auto_caps) + list(subs)
                print(f"[YTShorts] yt-dlp dump-json: no English captions. Available langs: {avail}")
        else:
            stderr = (r.stderr or "")[-400:].strip()
            print(f"[YTShorts] yt-dlp dump-json failed: {stderr}")
    except subprocess.TimeoutExpired:
        print("[YTShorts] yt-dlp dump-json timed out (>90s)")
    except Exception as e:
        print(f"[YTShorts] yt-dlp dump-json error: {type(e).__name__}: {e!r}")

    # ── Strategy 2: InnerTube player API directly via httpx ──────────────────
    print("[YTShorts] Falling back to InnerTube API...")
    cookies_dict: dict[str, str] = {}
    if cookies_path:
        try:
            import http.cookiejar
            jar = http.cookiejar.MozillaCookieJar()
            jar.load(cookies_path, ignore_discard=True, ignore_expires=True)
            cookies_dict = {c.name: c.value for c in jar if "youtube.com" in (c.domain or "")}
        except Exception:
            pass

    with httpx.Client(proxy=proxy, timeout=30, cookies=cookies_dict, headers={"User-Agent": _BROWSER_UA}) as client:
        for client_info, extra_ctx in _INNERTUBE_CLIENTS:
            try:
                ctx = {"client": client_info, **extra_ctx}
                resp = client.post(
                    "https://www.youtube.com/youtubei/v1/player?prettyPrint=false",
                    json={"videoId": video_id, "context": ctx},
                    headers={"Content-Type": "application/json"},
                )
                if not resp.is_success:
                    print(f"[YTShorts] InnerTube {client_info['clientName']} HTTP {resp.status_code}")
                    continue

                data = resp.json()
                status = data.get("playabilityStatus", {}).get("status", "")
                if status in ("LOGIN_REQUIRED", "ERROR"):
                    reason = data.get("playabilityStatus", {}).get("reason", "")
                    print(f"[YTShorts] InnerTube {client_info['clientName']} {status}: {reason}")
                    continue

                tracks = (
                    data.get("captions", {})
                    .get("playerCaptionsTracklistRenderer", {})
                    .get("captionTracks", [])
                )
                if not tracks:
                    print(f"[YTShorts] InnerTube {client_info['clientName']} no caption tracks")
                    continue

                en_track = _pick_en_track(tracks)
                if not en_track:
                    langs = [t.get("languageCode") for t in tracks]
                    return [], f"No English captions available. Tracks: {langs}"

                cap_resp = client.get(f"{en_track['baseUrl']}&fmt=json3")
                if not cap_resp.is_success:
                    print(f"[YTShorts] Caption fetch HTTP {cap_resp.status_code}")
                    continue

                entries = _parse_json3_events(cap_resp.json())
                if entries:
                    print(f"[YTShorts] Transcript via InnerTube/{client_info['clientName']}: {len(entries)} entries")
                    return entries, ""
                print(f"[YTShorts] InnerTube {client_info['clientName']} empty transcript")

            except Exception as e:
                print(f"[YTShorts] InnerTube {client_info['clientName']}: {type(e).__name__}: {e!r}")

    # ── Strategy 3: Groq Whisper — download audio and transcribe ─────────────
    print("[YTShorts] Falling back to Groq Whisper audio transcription...")
    import tempfile as _tf2
    groq_key = os.environ.get("GROQ_API_KEY", "").strip()
    if groq_key:
        try:
            from groq import Groq as _Groq
            with _tf2.TemporaryDirectory() as tmpdir:
                audio_path = os.path.join(tmpdir, "audio.mp3")
                dl_cmd = [
                    _yt_dlp_bin(),
                    "-x", "--audio-format", "mp3", "--audio-quality", "5",
                    "--no-playlist", "-q",
                    # Limit to 10 min to stay under Groq's 25MB file limit
                    "--download-sections", "*0:00-0:10:00",
                    "-o", audio_path,
                ]
                if proxy:
                    dl_cmd += ["--proxy", proxy]
                if cookies_path:
                    dl_cmd += ["--cookies", cookies_path]
                dl_cmd.append(url)

                dl = subprocess.run(dl_cmd, capture_output=True, text=True, timeout=180)
                if dl.returncode == 0 and os.path.exists(audio_path):
                    size_mb = os.path.getsize(audio_path) / 1_048_576
                    print(f"[YTShorts] Audio downloaded: {size_mb:.1f} MB — sending to Groq Whisper")
                    with open(audio_path, "rb") as af:
                        resp = _Groq(api_key=groq_key).audio.transcriptions.create(
                            file=("audio.mp3", af),
                            model="whisper-large-v3",
                            response_format="verbose_json",
                            timestamp_granularities=["segment"],
                            language="en",
                        )
                    entries = [
                        {"text": seg.text.strip(), "start": seg.start, "duration": seg.end - seg.start}
                        for seg in (resp.segments or [])
                        if seg.text.strip()
                    ]
                    if entries:
                        print(f"[YTShorts] Transcript via Groq Whisper: {len(entries)} segments")
                        return entries, ""
                    print("[YTShorts] Groq Whisper returned empty transcript")
                else:
                    print(f"[YTShorts] Audio download failed (rc={dl.returncode}): {dl.stderr[-300:]}")
        except subprocess.TimeoutExpired:
            print("[YTShorts] Audio download timed out")
        except Exception as e:
            print(f"[YTShorts] Groq Whisper error: {type(e).__name__}: {e!r}")
    else:
        print("[YTShorts] GROQ_API_KEY not set — skipping Whisper fallback")

    return [], "Could not fetch transcript — all methods failed. Check Railway logs for details."


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
            _proxy = os.environ.get("YOUTUBE_PROXY", "").strip().rstrip("/")
            title_cmd = [_yt_dlp, "--print", "title", "--no-download", "--no-playlist"]
            if _proxy:
                title_cmd += ["--proxy", _proxy]
            title_cmd.append(url)
            r = await loop.run_in_executor(
                None,
                lambda: subprocess.run(title_cmd, capture_output=True, text=True, timeout=20),
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
        proxy = os.environ.get("YOUTUBE_PROXY", "").strip().rstrip("/") or None

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
            if proxy:
                dl_cmd += ["--proxy", proxy]
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
