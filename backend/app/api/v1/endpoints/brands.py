from fastapi import APIRouter, Depends, HTTPException
from app.core.auth import get_current_user_id
from app.schemas.brand import BrandCreate, BrandUpdate
from app.services.brand_service import (
    create_brand, list_brands, get_brand, update_brand, delete_brand,
    set_active_brand, get_active_brand_id,
)

router = APIRouter()


@router.post("/")
async def create(body: BrandCreate, user_id: str = Depends(get_current_user_id)):
    try:
        brand = create_brand(user_id, body.model_dump())
        # Auto-activate if this is the user's first brand
        all_brands = list_brands(user_id)
        if len(all_brands) == 1:
            set_active_brand(user_id, brand["id"])
        return brand
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/")
async def list_all(user_id: str = Depends(get_current_user_id)):
    try:
        brands = list_brands(user_id)
        active_brand_id = get_active_brand_id(user_id)
        return {"brands": brands, "active_brand_id": active_brand_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/active")
async def get_active(user_id: str = Depends(get_current_user_id)):
    """Returns the currently active brand's full data (used by agent pages for pre-fill)."""
    try:
        active_id = get_active_brand_id(user_id)
        if not active_id:
            # Fall back to first brand
            brands = list_brands(user_id)
            return brands[0] if brands else {}
        brand = get_brand(user_id, active_id)
        return brand or {}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{brand_id}")
async def update(brand_id: str, body: BrandUpdate, user_id: str = Depends(get_current_user_id)):
    try:
        updates = body.model_dump(exclude_none=True)
        brand = update_brand(user_id, brand_id, updates)
        return brand
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{brand_id}")
async def delete(brand_id: str, user_id: str = Depends(get_current_user_id)):
    try:
        delete_brand(user_id, brand_id)
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{brand_id}/activate")
async def activate(brand_id: str, user_id: str = Depends(get_current_user_id)):
    try:
        brand = get_brand(user_id, brand_id)
        if not brand:
            raise HTTPException(status_code=404, detail="Brand not found")
        set_active_brand(user_id, brand_id)
        return {"ok": True, "active_brand_id": brand_id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
