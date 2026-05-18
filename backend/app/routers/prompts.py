import json
import re
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, desc, func
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import Prompt
from ..schemas import PromptCreate, PromptUpdate, PromptOut, TestRunRequest
from ..services.ollama import ollama_service
from ..services.cloud_llm import cloud_llm_service
from ..config import settings

router = APIRouter(prefix="/api/prompts", tags=["prompts"])


def detect_variables(content: str) -> list:
    return list(set(re.findall(r"\{(\w+)\}", content)))


@router.get("/categories/list")
async def list_categories(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Prompt.category, func.count(Prompt.id).label("count"))
        .group_by(Prompt.category)
        .order_by(func.count(Prompt.id).desc())
    )
    rows = result.all()
    return [{"category": row[0], "count": row[1]} for row in rows]


@router.get("/export/all")
async def export_prompts(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Prompt).order_by(Prompt.created_at))
    prompts = result.scalars().all()
    data = []
    for p in prompts:
        data.append({
            "title": p.title,
            "content": p.content,
            "category": p.category,
            "tags": p.tags,
        })
    return {"prompts": data}


@router.get("", response_model=list[PromptOut])
async def list_prompts(
    category: Optional[str] = None,
    search: Optional[str] = None,
    sort: str = "updated",
    db: AsyncSession = Depends(get_db),
):
    query = select(Prompt)
    if category:
        query = query.where(Prompt.category == category)
    if search:
        query = query.where(
            Prompt.title.ilike(f"%{search}%") | Prompt.content.ilike(f"%{search}%")
        )
    sort_map = {
        "updated": desc(Prompt.updated_at),
        "created": desc(Prompt.created_at),
        "alpha": Prompt.title.asc(),
    }
    query = query.order_by(sort_map.get(sort, desc(Prompt.updated_at)))

    result = await db.execute(query)
    prompts = result.scalars().all()
    out = []
    for p in prompts:
        po = PromptOut.model_validate(p)
        po.variables = detect_variables(p.content)
        out.append(po)
    return out


@router.post("", response_model=PromptOut)
async def create_prompt(body: PromptCreate, db: AsyncSession = Depends(get_db)):
    prompt = Prompt(
        title=body.title,
        content=body.content,
        category=body.category,
        tags=body.tags or [],
        variables=detect_variables(body.content),
    )
    db.add(prompt)
    await db.commit()
    await db.refresh(prompt)
    po = PromptOut.model_validate(prompt)
    po.variables = detect_variables(prompt.content)
    return po


@router.get("/{prompt_id}", response_model=PromptOut)
async def get_prompt(prompt_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Prompt).where(Prompt.id == prompt_id))
    prompt = result.scalar_one_or_none()
    if not prompt:
        raise HTTPException(status_code=404, detail="Prompt not found")
    po = PromptOut.model_validate(prompt)
    po.variables = detect_variables(prompt.content)
    return po


@router.put("/{prompt_id}", response_model=PromptOut)
async def update_prompt(prompt_id: int, body: PromptUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Prompt).where(Prompt.id == prompt_id))
    prompt = result.scalar_one_or_none()
    if not prompt:
        raise HTTPException(status_code=404, detail="Prompt not found")
    update_data = body.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(prompt, key, value)
    if "content" in update_data:
        prompt.variables = detect_variables(update_data["content"])
    await db.commit()
    await db.refresh(prompt)
    po = PromptOut.model_validate(prompt)
    po.variables = detect_variables(prompt.content)
    return po


@router.delete("/{prompt_id}")
async def delete_prompt(prompt_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Prompt).where(Prompt.id == prompt_id))
    prompt = result.scalar_one_or_none()
    if not prompt:
        raise HTTPException(status_code=404, detail="Prompt not found")
    await db.delete(prompt)
    await db.commit()
    return {"ok": True}


@router.post("/{prompt_id}/test")
async def test_prompt(prompt_id: int, body: TestRunRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Prompt).where(Prompt.id == prompt_id))
    prompt = result.scalar_one_or_none()
    if not prompt:
        raise HTTPException(status_code=404, detail="Prompt not found")

    content = prompt.content
    for key, val in body.variables.items():
        content = content.replace(f"{{{key}}}", str(val))

    service = cloud_llm_service if settings.llm_provider != "ollama" else ollama_service
    if not await service.check_available():
        raise HTTPException(status_code=503, detail=f"{settings.llm_provider} is not available")

    response_text = ""
    async for raw in service.generate_stream(
        model=body.model,
        messages=[{"role": "user", "content": content}],
    ):
        data_str = raw.replace("data: ", "", 1)
        try:
            parsed = json.loads(data_str)
            if parsed["event"] == "token":
                response_text += parsed["data"]
            elif parsed["event"] in ("done", "error"):
                break
        except json.JSONDecodeError:
            continue

    return {"response": response_text}


@router.post("/import")
async def import_prompts(body: dict, db: AsyncSession = Depends(get_db)):
    prompts_data = body.get("prompts", [])
    count = 0
    for pd in prompts_data:
        prompt = Prompt(
            title=pd.get("title", "Imported Prompt"),
            content=pd.get("content", ""),
            category=pd.get("category", "general"),
            tags=pd.get("tags", []),
            variables=detect_variables(pd.get("content", "")),
        )
        db.add(prompt)
        count += 1
    await db.commit()
    return {"imported": count}
