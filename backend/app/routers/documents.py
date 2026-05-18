import os
import tempfile
import logging
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import Document, DocumentChunk
from ..schemas import DocumentOut, ChunkOut, RAGQueryRequest, RAGResultItem, RAGQueryResponse
from ..services.document_service import document_processor
from ..services.rag_service import rag_service
from ..services.embeddings import embedding_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/documents", tags=["documents"])

MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB
SUPPORTED_EXTS = {".txt", ".md", ".csv", ".pdf", ".docx"}


@router.get("", response_model=list[DocumentOut])
async def list_documents(db: AsyncSession = Depends(get_db)):
    try:
        result = await db.execute(select(Document).order_by(Document.created_at.desc()))
        docs = result.scalars().all()
        return [DocumentOut.model_validate(d) for d in docs]
    except Exception as e:
        logger.error(f"Failed to list documents: {e}")
        raise HTTPException(status_code=500, detail="Failed to load document list")


@router.post("/upload", response_model=DocumentOut)
async def upload_document(
    file: UploadFile = File(...),
    chunk_size: int = Form(1000),
    chunk_overlap: int = Form(200),
    db: AsyncSession = Depends(get_db),
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file selected")

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in SUPPORTED_EXTS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Supported: {', '.join(SUPPORTED_EXTS)}",
        )

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"File too large ({len(content) / 1024 / 1024:.1f} MB). Maximum: {MAX_FILE_SIZE / 1024 / 1024:.0f} MB",
        )

    emb_available = await embedding_service.is_available()
    if not emb_available:
        raise HTTPException(
            status_code=503,
            detail="Embedding model is not loaded. The sentence-transformers model may still be downloading. Try again shortly.",
        )

    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=ext)
    try:
        tmp.write(content)
        tmp.close()

        doc = await document_processor.process_file(
            file_path=tmp.name,
            filename=file.filename,
            db=db,
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
        )
        return DocumentOut.model_validate(doc)

    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Document processing error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Document processing failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to process document: {str(e)[:200]}")
    finally:
        if os.path.exists(tmp.name):
            os.unlink(tmp.name)


@router.get("/{document_id}", response_model=DocumentOut)
async def get_document(document_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Document).where(Document.id == document_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return DocumentOut.model_validate(doc)


@router.get("/{document_id}/chunks", response_model=list[ChunkOut])
async def get_document_chunks(document_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(DocumentChunk)
        .where(DocumentChunk.document_id == document_id)
        .order_by(DocumentChunk.chunk_index)
    )
    return [ChunkOut.model_validate(c) for c in result.scalars().all()]


@router.delete("/{document_id}")
async def delete_document(document_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Document).where(Document.id == document_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    try:
        await document_processor.delete_document(doc, db)
        return {"ok": True}
    except Exception as e:
        logger.error(f"Failed to delete document {document_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete document")


@router.post("/query", response_model=RAGQueryResponse)
async def query_documents(body: RAGQueryRequest):
    if not body.document_ids:
        return RAGQueryResponse(results=[])

    try:
        results = await rag_service.query(
            query_text=body.query,
            document_ids=body.document_ids,
            n_results=body.n_results,
            relevance_threshold=body.relevance_threshold,
        )
        items = [RAGResultItem(**r) for r in results]
        return RAGQueryResponse(results=items)
    except Exception as e:
        logger.error(f"RAG query failed: {e}")
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)[:200]}")
