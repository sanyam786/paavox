import uuid
import httpx
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from app.core.auth import get_current_user_id
from app.core.config import settings

router = APIRouter()

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_SIZE = 10 * 1024 * 1024  # 10 MB
BUCKET = "post-media"


@router.post("/image")
async def upload_image(
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user_id),
):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(400, detail="Only JPEG, PNG, WebP, or GIF images are allowed.")

    data = await file.read()
    if len(data) > MAX_SIZE:
        raise HTTPException(400, detail="File size must be under 10 MB.")

    ext = file.filename.rsplit(".", 1)[-1] if file.filename and "." in file.filename else "jpg"
    path = f"{user_id}/{uuid.uuid4()}.{ext}"

    storage_url = f"{settings.SUPABASE_URL}/storage/v1/object/{BUCKET}/{path}"

    async with httpx.AsyncClient() as client:
        r = await client.post(
            storage_url,
            content=data,
            headers={
                "Authorization": f"Bearer {settings.SUPABASE_SERVICE_KEY}",
                "Content-Type": file.content_type,
            },
        )
        if r.status_code not in (200, 201):
            raise HTTPException(500, detail=f"Upload failed: {r.text}")

    public_url = f"{settings.SUPABASE_URL}/storage/v1/object/public/{BUCKET}/{path}"
    return {"url": public_url}
