from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import Conversation, Message
from ..schemas import ConversationCreate, ConversationUpdate, ConversationOut, MessageCreate, MessageOut

router = APIRouter(prefix="/api/conversations", tags=["conversations"])


@router.get("", response_model=list[ConversationOut])
async def list_conversations(
    search: Optional[str] = Query(None),
    sort: str = Query("updated"),
    db: AsyncSession = Depends(get_db),
):
    query = select(Conversation)

    if search:
        query = query.where(Conversation.title.ilike(f"%{search}%"))

    if sort == "created":
        query = query.order_by(Conversation.created_at.desc())
    else:
        query = query.order_by(Conversation.updated_at.desc())

    result = await db.execute(query)
    conversations = result.scalars().all()

    if conversations:
        conv_ids = [c.id for c in conversations]
        count_result = await db.execute(
            select(Message.conversation_id, func.count(Message.id).label("count"))
            .where(Message.conversation_id.in_(conv_ids))
            .group_by(Message.conversation_id)
        )
        counts = {row[0]: row[1] for row in count_result.all()}
    else:
        counts = {}

    out = []
    for c in conversations:
        conv_out = ConversationOut.model_validate(c)
        conv_out.message_count = counts.get(c.id, 0)
        out.append(conv_out)
    return out


@router.post("", response_model=ConversationOut)
async def create_conversation(body: ConversationCreate, db: AsyncSession = Depends(get_db)):
    conv = Conversation(
        title=body.title,
        model=body.model,
        system_prompt=body.system_prompt,
    )
    db.add(conv)
    await db.commit()
    await db.refresh(conv)
    out = ConversationOut.model_validate(conv)
    out.message_count = 0
    return out


@router.get("/{conversation_id}", response_model=ConversationOut)
async def get_conversation(conversation_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Conversation).where(Conversation.id == conversation_id))
    conv = result.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    count_result = await db.execute(
        select(func.count(Message.id)).where(Message.conversation_id == conversation_id)
    )
    out = ConversationOut.model_validate(conv)
    out.message_count = count_result.scalar() or 0
    return out


@router.patch("/{conversation_id}", response_model=ConversationOut)
async def update_conversation(conversation_id: int, body: ConversationUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Conversation).where(Conversation.id == conversation_id))
    conv = result.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    update_data = body.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(conv, key, value)

    await db.commit()
    await db.refresh(conv)

    count_result = await db.execute(
        select(func.count(Message.id)).where(Message.conversation_id == conversation_id)
    )
    out = ConversationOut.model_validate(conv)
    out.message_count = count_result.scalar() or 0
    return out


@router.delete("/{conversation_id}")
async def delete_conversation(conversation_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Conversation).where(Conversation.id == conversation_id))
    conv = result.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    await db.delete(conv)
    await db.commit()
    return {"ok": True}


@router.get("/{conversation_id}/messages", response_model=list[MessageOut])
async def get_messages(conversation_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Conversation).where(Conversation.id == conversation_id).options(selectinload(Conversation.messages))
    )
    conv = result.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    return [MessageOut.model_validate(m) for m in conv.messages]


@router.post("/{conversation_id}/messages", response_model=MessageOut)
async def add_message(
    conversation_id: int,
    body: MessageCreate,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Conversation).where(Conversation.id == conversation_id))
    conv = result.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    msg = Message(
        conversation_id=conversation_id,
        role=body.role,
        content=body.content,
        tokens=body.tokens,
        parent_message_id=body.parent_message_id,
    )
    db.add(msg)
    conv.updated_at = func.now()
    await db.commit()
    await db.refresh(msg)
    return MessageOut.model_validate(msg)
