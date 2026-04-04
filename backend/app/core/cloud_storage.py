"""
Cloud storage abstraction for YouTube Shorts clips.

Behaviour:
- If CLOUDINARY_CLOUD_NAME / API_KEY / API_SECRET are all set  →  use Cloudinary CDN
- Otherwise  →  fall back to local filesystem (dev / single-server setups)

Usage:
    from app.core.cloud_storage import is_cloudinary_enabled, upload_clip, delete_clip_from_cloud
"""
import re
from pathlib import Path


def is_cloudinary_enabled() -> bool:
    from app.core.config import settings
    return bool(
        settings.CLOUDINARY_CLOUD_NAME
        and settings.CLOUDINARY_API_KEY
        and settings.CLOUDINARY_API_SECRET
    )


def _configure_cloudinary() -> None:
    import cloudinary
    from app.core.config import settings
    cloudinary.config(
        cloud_name=settings.CLOUDINARY_CLOUD_NAME,
        api_key=settings.CLOUDINARY_API_KEY,
        api_secret=settings.CLOUDINARY_API_SECRET,
        secure=True,
    )


def upload_clip(local_path: Path, clip_id: str) -> str:
    """Upload a local MP4 to Cloudinary and return the secure CDN URL."""
    import cloudinary.uploader
    _configure_cloudinary()
    result = cloudinary.uploader.upload(
        str(local_path),
        resource_type="video",
        public_id=f"contiq-shorts/{clip_id}",
        overwrite=True,
        invalidate=True,
    )
    return result["secure_url"]


def delete_clip_from_cloud(public_url: str) -> None:
    """Delete a Cloudinary clip by its public URL. Silently ignores errors."""
    import cloudinary.uploader
    _configure_cloudinary()
    try:
        # URL format: .../video/upload/.../contiq-shorts/{clip_id}.mp4
        m = re.search(r"contiq-shorts/([^./]+)", public_url)
        if m:
            cloudinary.uploader.destroy(
                f"contiq-shorts/{m.group(1)}",
                resource_type="video",
                invalidate=True,
            )
    except Exception as e:
        print(f"[CloudStorage] delete failed (non-fatal): {e}")
