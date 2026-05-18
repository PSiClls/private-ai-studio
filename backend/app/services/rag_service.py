from typing import List, Optional
from .embeddings import embedding_service, vector_store


class RAGService:
    async def query(
        self,
        query_text: str,
        document_ids: Optional[List[int]] = None,
        n_results: int = 5,
        relevance_threshold: float = 0.0,
    ) -> List[dict]:
        query_emb = await embedding_service.embed_query(query_text)

        results = await vector_store.search(
            query_embedding=query_emb,
            doc_ids=document_ids,
            n_results=n_results,
        )

        if relevance_threshold > 0:
            results = [r for r in results if r["score"] >= relevance_threshold]

        return results

    def format_context(self, results: List[dict]) -> str:
        parts = []
        seen_texts = set()
        for i, r in enumerate(results):
            text = r["text"]
            if text in seen_texts:
                continue
            seen_texts.add(text)
            filename = r["metadata"].get("filename", "unknown")
            page = r["metadata"].get("page_number")
            page_str = f" (page {page})" if page else ""
            parts.append(f"[Source {i+1}] from {filename}{page_str}:\n{text}")
        return "\n\n".join(parts)


rag_service = RAGService()
