import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_prompt(client: AsyncClient):
    resp = await client.post("/api/prompts", json={
        "title": "Test Prompt",
        "content": "Hello {name}, how are you?",
        "category": "general",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["title"] == "Test Prompt"
    assert "name" in data["variables"]


@pytest.mark.asyncio
async def test_list_prompts_with_filters(client: AsyncClient):
    await client.post("/api/prompts", json={"title": "A", "content": "x", "category": "coding"})
    await client.post("/api/prompts", json={"title": "B", "content": "y", "category": "writing"})

    resp = await client.get("/api/prompts?category=coding")
    assert resp.status_code == 200
    assert all(p["category"] == "coding" for p in resp.json())
