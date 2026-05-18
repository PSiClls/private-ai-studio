import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_and_list_conversations(client: AsyncClient):
    resp = await client.post("/api/conversations", json={"title": "Test Chat"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["title"] == "Test Chat"
    conv_id = data["id"]

    resp = await client.get("/api/conversations")
    assert resp.status_code == 200
    convs = resp.json()
    assert any(c["id"] == conv_id for c in convs)


@pytest.mark.asyncio
async def test_get_conversation(client: AsyncClient):
    resp = await client.post("/api/conversations", json={"title": "Get Test"})
    conv_id = resp.json()["id"]

    resp = await client.get(f"/api/conversations/{conv_id}")
    assert resp.status_code == 200
    assert resp.json()["title"] == "Get Test"


@pytest.mark.asyncio
async def test_update_conversation(client: AsyncClient):
    resp = await client.post("/api/conversations", json={"title": "Old Title"})
    conv_id = resp.json()["id"]

    resp = await client.patch(f"/api/conversations/{conv_id}", json={"title": "New Title"})
    assert resp.status_code == 200
    assert resp.json()["title"] == "New Title"


@pytest.mark.asyncio
async def test_delete_conversation(client: AsyncClient):
    resp = await client.post("/api/conversations", json={"title": "Delete Me"})
    conv_id = resp.json()["id"]

    resp = await client.delete(f"/api/conversations/{conv_id}")
    assert resp.status_code == 200

    resp = await client.get(f"/api/conversations/{conv_id}")
    assert resp.status_code == 404
