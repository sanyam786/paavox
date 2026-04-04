import time
import uuid
from pathlib import Path

# Persistent directory inside the backend folder — survives server restarts
CLIPS_DIR = Path(__file__).resolve().parent.parent.parent / "clips_data"
CLIPS_DIR.mkdir(parents=True, exist_ok=True)

CLIP_TTL_SECONDS = 10 * 24 * 3600  # 10 days

# clip_id → (absolute Path, created_at timestamp)
_store: dict[str, tuple[Path, float]] = {}


def _load_existing_clips() -> None:
    """Rebuild in-memory registry from disk on startup."""
    now = time.time()
    for f in CLIPS_DIR.glob("*.mp4"):
        created = f.stat().st_mtime
        if now - created < CLIP_TTL_SECONDS:
            _store[f.stem] = (f, created)
        else:
            f.unlink(missing_ok=True)


_load_existing_clips()


def new_clip_path(extension: str = "mp4") -> tuple[str, Path]:
    """Reserve a new clip ID and return (clip_id, output_path)."""
    _purge_old_clips()
    clip_id = str(uuid.uuid4())
    path = CLIPS_DIR / f"{clip_id}.{extension}"
    _store[clip_id] = (path, time.time())
    return clip_id, path


def get_clip_path(clip_id: str) -> Path | None:
    entry = _store.get(clip_id)
    if entry:
        return entry[0]
    # Fallback: check disk directly (handles post-restart lookups)
    path = CLIPS_DIR / f"{clip_id}.mp4"
    return path if path.exists() else None


def delete_clip(clip_id: str) -> None:
    entry = _store.pop(clip_id, None)
    path = entry[0] if entry else CLIPS_DIR / f"{clip_id}.mp4"
    path.unlink(missing_ok=True)


def _purge_old_clips() -> None:
    """Remove clips older than 10 days."""
    cutoff = time.time() - CLIP_TTL_SECONDS
    stale = [cid for cid, (_, created) in list(_store.items()) if created < cutoff]
    for cid in stale:
        delete_clip(cid)
