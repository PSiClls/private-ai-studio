import json
import asyncio
from typing import AsyncGenerator, Optional
import httpx
from ..config import settings


class OllamaService:
    def __init__(self):
        self.base_url = settings.ollama_base_url
        self._client: Optional[httpx.AsyncClient] = None

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None:
            self._client = httpx.AsyncClient(base_url=self.base_url, timeout=120.0)
        return self._client

    async def check_available(self) -> bool:
        try:
            client = await self._get_client()
            resp = await client.get("/api/tags", timeout=5.0)
            return resp.status_code == 200
        except (httpx.ConnectError, httpx.TimeoutException):
            return False

    async def list_models(self) -> list[dict]:
        try:
            client = await self._get_client()
            resp = await client.get("/api/tags")
            if resp.status_code == 200:
                return resp.json().get("models", [])
        except Exception:
            return []
        return []

    async def generate_stream(
        self,
        model: str,
        messages: list[dict],
        system_prompt: str = "",
    ) -> AsyncGenerator[str, None]:
        client = await self._get_client()
        payload = {
            "model": model,
            "messages": messages,
            "stream": True,
            "options": {
                "num_predict": 4096,
                "temperature": 0.7,
            },
        }
        if system_prompt:
            payload["system"] = system_prompt

        try:
            async with client.stream("POST", "/api/chat", json=payload) as response:
                if response.status_code != 200:
                    error_body = await response.aread()
                    err_msg = f"Ollama error: {response.status_code} - {error_body.decode()}"
                    yield f"data: {json.dumps({'event': 'error', 'data': err_msg})}\n\n"
                    return

                async for line in response.aiter_lines():
                    if line.strip():
                        try:
                            chunk = json.loads(line)
                            if "message" in chunk and "content" in chunk["message"]:
                                token = chunk["message"]["content"]
                                yield f"data: {json.dumps({'event': 'token', 'data': token})}\n\n"
                            if chunk.get("done"):
                                total_tokens = chunk.get("eval_count", 0)
                                yield f"data: {json.dumps({'event': 'done', 'data': str(total_tokens)})}\n\n"
                        except json.JSONDecodeError:
                            continue
        except httpx.ConnectError:
            yield f"data: {json.dumps({'event': 'error', 'data': 'Cannot connect to Ollama. Make sure it is running on port 11434. To install: https://ollama.com/download'})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'event': 'error', 'data': str(e)})}\n\n"

    async def generate_title(self, message: str, model: str = "llama3.2") -> str:
        try:
            client = await self._get_client()
            available_models = await self.list_models()
            available_names = [m.get("name", "") for m in available_models]

            title_model = None
            for candidate in ["phi3:mini", "llama3.2", "llama3.2:latest", "gemma:2b", "tinyllama"]:
                if candidate in available_names:
                    title_model = candidate
                    break

            if title_model is None or title_model == model:
                if available_names:
                    title_model = available_names[0]
                else:
                    return ""

            payload = {
                "model": title_model,
                "messages": [
                    {
                        "role": "user",
                        "content": f"Generate a short 3-5 word title for this conversation: {message[:200]}",
                    }
                ],
                "stream": False,
                "options": {"num_predict": 30, "temperature": 0.3},
            }
            resp = await client.post("/api/chat", json=payload, timeout=30.0)
            if resp.status_code == 200:
                data = resp.json()
                content = data.get("message", {}).get("content", "").strip().strip('"').strip("'")
                if content:
                    words = content.split()
                    return " ".join(words[:8])
            return ""
        except Exception:
            return ""

    async def close(self):
        if self._client:
            await self._client.aclose()
            self._client = None


ollama_service = OllamaService()
