import asyncio
import functools
from typing import List, Optional
from ..config import settings


class EmbeddingService:
    def __init__(self):
        self._model = None
        self._model_name = settings.embedding_model

    async def _load_model(self):
        if self._model is not None:
            return
        loop = asyncio.get_event_loop()
        self._model = await loop.run_in_executor(None, self._load_model_sync)

    def _load_model_sync(self):
        try:
            from sentence_transformers import SentenceTransformer
            return SentenceTransformer(self._model_name)
        except ImportError:
            raise RuntimeError("sentence-transformers not installed. Install with: pip install sentence-transformers")

    async def embed(self, texts: List[str]) -> List[List[float]]:
        await self._load_model()
        loop = asyncio.get_event_loop()
        embeddings = await loop.run_in_executor(None, self._model.encode, texts)
        return [emb.tolist() for emb in embeddings]

    async def embed_query(self, text: str) -> List[float]:
        result = await self.embed([text])
        return result[0]

    async def is_available(self) -> bool:
        try:
            await self._load_model()
            return True
        except ImportError:
            return False
        except Exception:
            return False


embedding_service = EmbeddingService()


class VectorStore:
    def __init__(self):
        self._client = None
        self._collection_cache: dict[str, any] = {}

    async def _get_client(self):
        if self._client is not None:
            return self._client
        import chromadb
        loop = asyncio.get_event_loop()
        self._client = await loop.run_in_executor(
            None,
            lambda: chromadb.PersistentClient(path=settings.chroma_persist_dir),
        )
        return self._client

    def _collection_name(self, doc_id: int) -> str:
        return f"doc_{doc_id}"

    async def get_or_create_collection(self, doc_id: int):
        cache_key = self._collection_name(doc_id)
        if cache_key in self._collection_cache:
            return self._collection_cache[cache_key]

        client = await self._get_client()
        loop = asyncio.get_event_loop()
        collection = await loop.run_in_executor(
            None,
            lambda: client.get_or_create_collection(
                name=cache_key,
                metadata={"hnsw:space": "cosine"},
            ),
        )
        self._collection_cache[cache_key] = collection
        return collection

    async def add_chunks(
        self,
        doc_id: int,
        chunk_ids: List[str],
        embeddings: List[List[float]],
        metadatas: List[dict],
        texts: List[str],
    ):
        collection = await self.get_or_create_collection(doc_id)
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(
            None,
            lambda: collection.add(
                ids=chunk_ids,
                embeddings=embeddings,
                metadatas=metadatas,
                documents=texts,
            ),
        )

    async def search(
        self,
        query_embedding: List[float],
        doc_ids: Optional[List[int]] = None,
        n_results: int = 5,
    ) -> List[dict]:
        all_results = []
        if doc_ids:
            for did in doc_ids:
                try:
                    collection = await self.get_or_create_collection(did)
                    loop = asyncio.get_event_loop()
                    results = await loop.run_in_executor(
                        None,
                        lambda: collection.query(
                            query_embeddings=[query_embedding],
                            n_results=n_results,
                        ),
                    )
                    for i in range(len(results["ids"][0])):
                        all_results.append({
                            "id": results["ids"][0][i],
                            "text": results["documents"][0][i],
                            "metadata": results["metadatas"][0][i],
                            "score": 1 - results["distances"][0][i],
                            "document_id": did,
                        })
                except Exception:
                    continue
        else:
            client = await self._get_client()
            loop = asyncio.get_event_loop()
            collections = await loop.run_in_executor(None, lambda: client.list_collections())
            for col in collections:
                if col.name.startswith("doc_"):
                    try:
                        query_fn = functools.partial(
                            col.query,
                            query_embeddings=[query_embedding],
                            n_results=n_results,
                        )
                        results = await loop.run_in_executor(None, query_fn)
                        doc_id = int(col.name.replace("doc_", ""))
                        for i in range(len(results["ids"][0])):
                            all_results.append({
                                "id": results["ids"][0][i],
                                "text": results["documents"][0][i],
                                "metadata": results["metadatas"][0][i],
                                "score": 1 - results["distances"][0][i],
                                "document_id": doc_id,
                            })
                    except Exception:
                        continue

        all_results.sort(key=lambda x: x["score"], reverse=True)
        return all_results[:n_results]

    async def delete_collection(self, doc_id: int):
        client = await self._get_client()
        cache_key = self._collection_name(doc_id)
        self._collection_cache.pop(cache_key, None)
        loop = asyncio.get_event_loop()
        try:
            await loop.run_in_executor(
                None,
                lambda: client.delete_collection(cache_key),
            )
        except Exception:
            pass


vector_store = VectorStore()
