import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_workflow(client: AsyncClient):
    resp = await client.post("/api/workflows", json={
        "name": "Test Workflow",
        "nodes": [
            {"id": "1", "data": {"nodeType": "input", "text": "hello"}},
            {"id": "2", "data": {"nodeType": "output"}},
        ],
        "edges": [{"source": "1", "target": "2"}],
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["name"] == "Test Workflow"
    assert data["id"] > 0


@pytest.mark.asyncio
async def test_workflow_execution_cycle_detected(client: AsyncClient):
    resp = await client.post("/api/workflows", json={
        "name": "Cyclic Workflow",
        "nodes": [
            {"id": "1", "data": {"nodeType": "input", "text": "x"}},
            {"id": "2", "data": {"nodeType": "output"}},
        ],
        "edges": [
            {"source": "1", "target": "2"},
            {"source": "2", "target": "1"},
        ],
    })
    wf_id = resp.json()["id"]

    resp = await client.post(f"/api/workflows/{wf_id}/execute")
    assert resp.status_code == 200
    assert resp.json()["status"] == "error"


@pytest.mark.asyncio
async def test_workflow_execution_persisted(client: AsyncClient):
    resp = await client.post("/api/workflows", json={
        "name": "Persist Test",
        "nodes": [
            {"id": "1", "data": {"nodeType": "input", "text": "world"}},
            {"id": "2", "data": {"nodeType": "output"}},
        ],
        "edges": [{"source": "1", "target": "2"}],
    })
    wf_id = resp.json()["id"]

    resp = await client.post(f"/api/workflows/{wf_id}/execute")
    assert resp.status_code == 200
    exec_id = resp.json()["execution_id"]

    resp = await client.get(f"/api/workflows/executions/{exec_id}")
    assert resp.status_code == 200
    assert resp.json()["status"] == "completed"
