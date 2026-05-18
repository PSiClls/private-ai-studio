from fastapi import APIRouter
from ..services.image_service import image_generator

router = APIRouter(prefix="/api/system", tags=["system"])


@router.get("/gpu")
async def gpu_status():
    device = image_generator.device
    return {
        "available": image_generator.available,
        "device": device,
        "cuda": device == "cuda",
        "mps": device == "mps",
        "cpu": device == "cpu",
    }
