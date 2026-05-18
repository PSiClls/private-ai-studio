import json
from typing import AsyncGenerator, Optional
import httpx
from ..config import settings


class CloudLLMService:
    def __init__(self):
        self.provider = settings.llm_provider.lower()
        self.base_url = self._get_base_url()
        self.api_key = self._get_api_key()
        self.model = self._get_model()
        self._client: Optional[httpx.AsyncClient] = None

    def _get_base_url(self) -> str:
        urls = {
            "openai": "https://api.openai.com/v1",
            "openrouter": "https://openrouter.ai/api/v1",
            "groq": "https://api.groq.com/openai/v1",
            "together": "https://api.together.xyz/v1",
            "any": settings.openai_api_base,
        }
        return urls.get(self.provider, settings.openai_api_base)

    def _get_api_key(self) -> str:
        keys = {
            "openai": settings.openai_api_key,
            "openrouter": settings.openrouter_api_key,
            "groq": settings.groq_api_key,
            "together": settings.together_api_key,
            "any": settings.openai_api_key,
        }
        return keys.get(self.provider, "")

    def _get_model(self) -> str:
        models = {
            "openai": settings.openai_model,
            "openrouter": settings.openrouter_model,
            "groq": settings.groq_model,
            "together": settings.together_model,
            "any": settings.openai_model,
        }
        return models.get(self.provider, "gpt-4o-mini")

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None:
            self._client = httpx.AsyncClient(
                base_url=self.base_url,
                timeout=120.0,
                headers={"Authorization": f"Bearer {self.api_key}"},
            )
        return self._client

    async def check_available(self) -> bool:
        if not self.api_key:
            return False
        try:
            client = await self._get_client()
            resp = await client.get("/models", timeout=5.0)
            return resp.status_code == 200
        except (httpx.ConnectError, httpx.TimeoutException):
            return False

    async def list_models(self) -> list[dict]:
        if not self.api_key:
            return []
        try:
            client = await self._get_client()
            resp = await client.get("/models")
            if resp.status_code == 200:
                data = resp.json().get("data", [])
                return [{"id": m.get("id", ""), "name": m.get("id", "")} for m in data[:20]]
        except Exception:
            return []
        return [{"id": self.model, "name": self.model}]

    async def generate_stream(
        self,
        model: str,
        messages: list[dict],
        system_prompt: str = "",
    ) -> AsyncGenerator[str, None]:
        if not self.api_key:
            yield f"data: {json.dumps({'event': 'error', 'data': 'No API key configured for cloud LLM provider'})}\n\n"
            return

        client = await self._get_client()
        active_model = model or self.model

        formatted_messages = messages.copy()
        if system_prompt:
            formatted_messages.insert(0, {"role": "system", "content": system_prompt})

        payload = {
            "model": active_model,
            "messages": formatted_messages,
            "stream": True,
            "max_tokens": 4096,
            "temperature": 0.7,
        }

        if self.provider == "openrouter":
            payload["provider"] = {"order": ["Together", "DeepInfra", "Fireworks"]}

        try:
            async with client.stream("POST", "/chat/completions", json=payload) as response:
                if response.status_code != 200:
                    error_body = await response.aread()
                    err_msg = f"LLM API error: {response.status_code} - {error_body.decode()}"
                    yield f"data: {json.dumps({'event': 'error', 'data': err_msg})}\n\n"
                    return

                async for line in response.aiter_lines():
                    if line.strip():
                        line = line.lstrip("data: ")
                        if line == "[DONE]":
                            yield f"data: {json.dumps({'event': 'done', 'data': '0'})}\n\n"
                            return
                        try:
                            chunk = json.loads(line)
                            delta = chunk.get("choices", [{}])[0].get("delta", {})
                            content = delta.get("content", "")
                            if content:
                                yield f"data: {json.dumps({'event': 'token', 'data': content})}\n\n"
                        except json.JSONDecodeError:
                            continue
        except httpx.ConnectError:
            yield f"data: {json.dumps({'event': 'error', 'data': f'Cannot connect to {self.provider} API'})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'event': 'error', 'data': str(e)})}\n\n"

    async def generate_title(self, message: str, model: str = "") -> str:
        if not self.api_key:
            return ""
        try:
            client = await self._get_client()
            active_model = model or self.model

            resp = await client.post(
                "/chat/completions",
                json={
                    "model": active_model,
                    "messages": [
                        {
                            "role": "user",
                            "content": f"Generate a short 3-5 word title for this conversation: {message[:200]}",
                        }
                    ],
                    "max_tokens": 30,
                    "temperature": 0.3,
                },
                timeout=30.0,
            )
            if resp.status_code == 200:
                data = resp.json()
                content = data.get("choices", [{}])[0].get("message", {}).get("content", "").strip()
                if content:
                    return content.strip('"').strip("'")[:50]
            return ""
        except Exception:
            return ""

    async def close(self):
        if self._client:
            await self._client.aclose()
            self._client = None


cloud_llm_service = CloudLLMService()
