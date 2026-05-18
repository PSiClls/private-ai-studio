import asyncio
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import ImageGeneration
from ..schemas import GenerateRequest, ImageOut
from ..services.image_service import image_generator, task_manager

router = APIRouter(prefix="/api/images", tags=["images"])


@router.post("/generate")
async def generate_image(body: GenerateRequest):
    if not image_generator.available:
        raise HTTPException(
            status_code=503,
            detail="Image generation unavailable. No GPU detected. Image generation requires CUDA (NVIDIA) or MPS (Apple Silicon).",
        )

    task_ids = []
    for i in range(body.batch_size):
        task_id = task_manager.create_task()
        task_ids.append(task_id)
        asyncio.create_task(
            image_generator.generate_async(
                task_id=task_id,
                prompt=body.prompt,
                negative_prompt=body.negative_prompt,
                width=body.width,
                height=body.height,
                steps=body.steps,
                guidance_scale=body.guidance_scale,
                seed=body.seed if body.batch_size == 1 else None,
            )
        )

    return {"task_ids": task_ids, "message": f"Queued {len(task_ids)} generation(s)"}


@router.get("/status/{task_id}")
async def get_task_status(task_id: str):
    task = task_manager.get(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.get("/result/{task_id}")
async def get_task_result(task_id: str):
    task = task_manager.get(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if task["status"] != "completed":
        raise HTTPException(status_code=400, detail=f"Task status: {task['status']}")
    return task


@router.get("/file/{filename}")
async def get_image_file(filename: str):
    from ..config import settings
    file_path = settings.image_output_dir / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Image not found")
    return FileResponse(str(file_path), media_type="image/png")


@router.get("/gallery", response_model=list[ImageOut])
async def get_gallery(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    offset = (page - 1) * per_page
    result = await db.execute(
        select(ImageGeneration)
        .order_by(desc(ImageGeneration.created_at))
        .offset(offset)
        .limit(per_page)
    )
    images = result.scalars().all()
    return [ImageOut.model_validate(img) for img in images]


@router.delete("/{image_id}")
async def delete_image(image_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ImageGeneration).where(ImageGeneration.id == image_id)
    )
    img = result.scalar_one_or_none()
    if not img:
        raise HTTPException(status_code=404, detail="Image not found")
    await db.delete(img)
    await db.commit()
    return {"ok": True}


@router.get("/status")
async def generation_status():
    return {
        "available": image_generator.available,
        "device": image_generator.device,
        "queue_size": len([t for t in task_manager.get_all() if t["status"] == "queued"]),
    }
