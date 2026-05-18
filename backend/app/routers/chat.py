import asyncio
import json
from typing import AsyncGenerator, Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sse_starlette.sse import EventSourceResponse

from ..database import get_db
from ..models import Conversation, Message
from ..schemas import ChatRequest, RAGChatRequest
from ..services.ollama import ollama_service
from ..services.cloud_llm import cloud_llm_service
from ..services.rag_service import rag_service
from ..config import settings

router = APIRouter(prefix="/api", tags=["chat"])

# Track active generation tasks so /chat/cancel can abort them
_active_tasks: dict[str, asyncio.Task] = {}
_done_tasks: set[str] = set()


def _cleanup_done_tasks():
    """Remove completed/cancelled tasks from tracking."""
    for key in list(_active_tasks.keys()):
        if key in _done_tasks or _active_tasks[key].done():
            _done_tasks.add(key)
    for key in list(_done_tasks):
        _active_tasks.pop(key, None)
        _done_tasks.discard(key)


async def _generate_chat_events(
    db: AsyncSession,
    conv: Conversation,
    user_msg: Message,
    messages_for_ollama: list,
    model: str,
    system_prompt: str,
    message_text: str,
    conversation_id: int,
    is_first_message: bool,
    *,
    pre_hook: AsyncGenerator = None,
) -> AsyncGenerator[str, None]:
    full_response = ""
    total_tokens = 0

    if pre_hook:
        async for event in pre_hook:
            yield event

    try:
        service = cloud_llm_service if settings.llm_provider != "ollama" else ollama_service
        async for raw in service.generate_stream(
            model=model,
            messages=messages_for_ollama,
            system_prompt=system_prompt,
        ):
            yield raw
            data_str = raw.replace("data: ", "", 1)
            try:
                parsed = json.loads(data_str)
            except json.JSONDecodeError:
                continue
            if parsed["event"] == "token":
                full_response += parsed["data"]
            elif parsed["event"] == "done":
                total_tokens = int(parsed["data"])
            elif parsed["event"] == "error":
                yield raw
                return

        if not full_response:
            yield f"data: {json.dumps({'event': 'error', 'data': 'Empty response from model'})}\n\n"
            return

        assistant_msg = Message(
            conversation_id=conversation_id,
            role="assistant",
            content=full_response,
            tokens=total_tokens if total_tokens > 0 else None,
            parent_message_id=user_msg.id,
        )
        db.add(assistant_msg)
        conv.updated_at = func.now()
        await db.commit()
        await db.refresh(assistant_msg)
        yield f"data: {json.dumps({'event': 'message_id', 'data': str(assistant_msg.id)})}\n\n"

        if is_first_message:
            try:
                title = await service.generate_title(message_text, model=model)
                if title:
                    conv.title = title[:255]
                    await db.commit()
                    yield f"data: {json.dumps({'event': 'title_suggestion', 'data': title})}\n\n"
            except Exception:
                pass

    except Exception as e:
        yield f"data: {json.dumps({'event': 'error', 'data': str(e)})}\n\n"


async def _prepare_conversation(body, db: AsyncSession):
    result = await db.execute(
        select(Conversation).where(Conversation.id == body.conversation_id)
    )
    conv = result.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    result = await db.execute(
        select(Message)
        .where(Message.conversation_id == body.conversation_id)
        .order_by(Message.created_at)
    )
    existing_messages = result.scalars().all()

    messages_for_ollama = [{"role": m.role, "content": m.content} for m in existing_messages]
    messages_for_ollama.append({"role": "user", "content": body.message})

    user_msg = Message(
        conversation_id=body.conversation_id,
        role="user",
        content=body.message,
    )
    db.add(user_msg)
    await db.commit()
    await db.refresh(user_msg)

    return conv, existing_messages, messages_for_ollama, user_msg


@router.get("/chat/models")
async def list_models():
    service = cloud_llm_service if settings.llm_provider != "ollama" else ollama_service
    available = await service.check_available()
    if not available:
        return {"available": False, "models": [], "provider": settings.llm_provider}
    models = await service.list_models()
    return {"available": True, "models": models, "provider": settings.llm_provider}


@router.post("/chat/stream")
async def chat_stream(body: ChatRequest, db: AsyncSession = Depends(get_db)):
    conv, existing_messages, messages_for_ollama, user_msg = await _prepare_conversation(body, db)
    is_first_message = len(existing_messages) == 0

    async def event_generator():
        async for event in _generate_chat_events(
            db=db,
            conv=conv,
            user_msg=user_msg,
            messages_for_ollama=messages_for_ollama,
            model=body.model,
            system_prompt=body.system_prompt or conv.system_prompt,
            message_text=body.message,
            conversation_id=body.conversation_id,
            is_first_message=is_first_message,
        ):
            yield event

    task_id = f"stream_{body.conversation_id}_{user_msg.id}"
    _active_tasks[task_id] = asyncio.current_task()
    try:
        return EventSourceResponse(event_generator())
    finally:
        _active_tasks.pop(task_id, None)
        _cleanup_done_tasks()


@router.post("/chat/rag-stream")
async def rag_chat_stream(body: RAGChatRequest, db: AsyncSession = Depends(get_db)):
    conv, existing_messages, messages_for_ollama, user_msg = await _prepare_conversation(body, db)

    rag_results = await rag_service.query(
        query_text=body.message,
        document_ids=body.document_ids if body.document_ids else None,
        n_results=body.n_results,
        relevance_threshold=body.relevance_threshold,
    )
    context = rag_service.format_context(rag_results)

    system_prompt = body.system_prompt or conv.system_prompt
    if context:
        rag_instruction = (
            "You have access to the following document excerpts. "
            "Use them to answer the user's question. "
            "Cite sources using [Source N] notation.\n\n"
            f"Document context:\n{context}"
        )
        system_prompt = (
            f"{system_prompt}\n\n{rag_instruction}" if system_prompt else rag_instruction
        )

    is_first_message = len(existing_messages) == 0

    async def sources_hook():
        yield f"data: {json.dumps({'event': 'sources', 'data': json.dumps(rag_results)})}\n\n"

    async def event_generator():
        async for event in _generate_chat_events(
            db=db,
            conv=conv,
            user_msg=user_msg,
            messages_for_ollama=messages_for_ollama,
            model=body.model,
            system_prompt=system_prompt,
            message_text=body.message,
            conversation_id=body.conversation_id,
            is_first_message=is_first_message,
            pre_hook=sources_hook(),
        ):
            yield event

    task_id = f"rag_{body.conversation_id}_{user_msg.id}"
    _active_tasks[task_id] = asyncio.current_task()
    try:
        return EventSourceResponse(event_generator())
    finally:
        _active_tasks.pop(task_id, None)


class CancelRequest(BaseModel):
    conversation_id: Optional[int] = None


@router.post("/chat/cancel")
async def cancel_generation(body: CancelRequest = CancelRequest()):
    conversation_id = body.conversation_id
    cancelled = []
    for key, task in list(_active_tasks.items()):
        if conversation_id is None or str(conversation_id) in key:
            task.cancel()
            cancelled.append(key)
    for key in cancelled:
        _active_tasks.pop(key, None)
    return {"ok": True, "cancelled": len(cancelled)}
