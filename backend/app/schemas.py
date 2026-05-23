import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class ConversationCreate(BaseModel):
    title: str = "New Conversation"
    model: str = "auto"
    system_prompt: str = ""


class ConversationUpdate(BaseModel):
    title: Optional[str] = None
    model: Optional[str] = None
    system_prompt: Optional[str] = None
    pinned: Optional[bool] = None


class ConversationOut(BaseModel):
    id: int
    title: str
    model: str
    system_prompt: str
    created_at: datetime.datetime
    updated_at: datetime.datetime
    pinned: bool
    message_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class MessageCreate(BaseModel):
    role: str
    content: str = ""
    tokens: Optional[int] = None
    parent_message_id: Optional[int] = None


class MessageOut(BaseModel):
    id: int
    conversation_id: int
    role: str
    content: str
    tokens: Optional[int] = None
    parent_message_id: Optional[int] = None
    created_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)


class ChatRequest(BaseModel):
    conversation_id: int
    message: str
    model: str = "auto"
    system_prompt: str = ""


class RAGChatRequest(BaseModel):
    conversation_id: int
    message: str
    model: str = "auto"
    system_prompt: str = ""
    document_ids: list[int] = []
    n_results: int = 5
    relevance_threshold: float = 0.3


class StreamEvent(BaseModel):
    event: str  # token, done, error, title_suggestion, source
    data: str


# ─── Documents ────────────────────────────────────────────────────

class DocumentOut(BaseModel):
    id: int
    filename: str
    file_type: str
    file_size: int
    chunk_count: int
    status: str
    created_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)


class ChunkOut(BaseModel):
    id: int
    chunk_index: int
    text_preview: str
    token_count: int

    model_config = ConfigDict(from_attributes=True)


class RAGQueryRequest(BaseModel):
    query: str
    document_ids: list[int] = []
    n_results: int = 5
    relevance_threshold: float = 0.0


class RAGResultItem(BaseModel):
    id: str
    text: str
    metadata: dict
    score: float
    document_id: int


class RAGQueryResponse(BaseModel):
    results: list[RAGResultItem]
    answer: str = ""


# ─── Prompts ───────────────────────────────────────────────────────

class PromptCreate(BaseModel):
    title: str
    content: str
    category: str = "general"
    tags: list = []


class PromptUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[list] = None


class PromptOut(BaseModel):
    id: int
    title: str
    content: str
    category: str
    tags: list
    variables: list
    created_at: datetime.datetime
    updated_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)


class TestRunRequest(BaseModel):
    prompt_id: int
    variables: dict = {}
    model: str = "auto"


# ─── Images ────────────────────────────────────────────────────────

class GenerateRequest(BaseModel):
    prompt: str
    negative_prompt: str = ""
    width: int = 512
    height: int = 512
    steps: int = 4
    guidance_scale: float = 0.0
    seed: Optional[int] = None
    batch_size: int = 1


class ImageOut(BaseModel):
    id: int
    prompt: str
    negative_prompt: str
    params: dict
    image_path: str
    seed: Optional[int]
    created_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)


# ─── Settings ──────────────────────────────────────────────────────

class SettingsOut(BaseModel):
    settings: dict


class SettingsUpdate(BaseModel):
    settings: dict


# ─── Workflows ─────────────────────────────────────────────────────

class WorkflowCreate(BaseModel):
    name: str
    description: str = ""
    nodes: list = []
    edges: list = []


class WorkflowUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    nodes: Optional[list] = None
    edges: Optional[list] = None


class WorkflowOut(BaseModel):
    id: int
    name: str
    description: str
    nodes: list
    edges: list
    created_at: datetime.datetime
    updated_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)
