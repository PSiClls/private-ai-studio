import json
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import Workflow, WorkflowExecution
from ..schemas import WorkflowCreate, WorkflowUpdate, WorkflowOut
from ..services.workflow_service import workflow_engine

router = APIRouter(prefix="/api/workflows", tags=["workflows"])


@router.get("", response_model=list[WorkflowOut])
async def list_workflows(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Workflow).order_by(desc(Workflow.updated_at)))
    return [WorkflowOut.model_validate(w) for w in result.scalars().all()]


@router.post("", response_model=WorkflowOut)
async def create_workflow(body: WorkflowCreate, db: AsyncSession = Depends(get_db)):
    wf = Workflow(name=body.name, description=body.description, nodes=body.nodes, edges=body.edges)
    db.add(wf)
    await db.commit()
    await db.refresh(wf)
    return WorkflowOut.model_validate(wf)


@router.get("/{workflow_id}", response_model=WorkflowOut)
async def get_workflow(workflow_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Workflow).where(Workflow.id == workflow_id))
    wf = result.scalar_one_or_none()
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return WorkflowOut.model_validate(wf)


@router.put("/{workflow_id}", response_model=WorkflowOut)
async def update_workflow(workflow_id: int, body: WorkflowUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Workflow).where(Workflow.id == workflow_id))
    wf = result.scalar_one_or_none()
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found")
    update_data = body.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(wf, key, value)
    await db.commit()
    await db.refresh(wf)
    return WorkflowOut.model_validate(wf)


@router.delete("/{workflow_id}")
async def delete_workflow(workflow_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Workflow).where(Workflow.id == workflow_id))
    wf = result.scalar_one_or_none()
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found")
    await db.delete(wf)
    await db.commit()
    return {"ok": True}


@router.post("/{workflow_id}/validate")
async def validate_workflow(workflow_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Workflow).where(Workflow.id == workflow_id))
    wf = result.scalar_one_or_none()
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return await workflow_engine.validate(wf.nodes, wf.edges)


@router.post("/{workflow_id}/execute")
async def execute_workflow(workflow_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Workflow).where(Workflow.id == workflow_id))
    wf = result.scalar_one_or_none()
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found")

    validation = await workflow_engine.validate(wf.nodes, wf.edges)
    if not validation["valid"]:
        raise HTTPException(status_code=400, detail=json.dumps(validation))

    exec_result = await workflow_engine.execute(str(workflow_id), wf.nodes, wf.edges)

    execution = WorkflowExecution(
        workflow_id=workflow_id,
        status=exec_result["status"],
        node_statuses=exec_result.get("node_statuses", {}),
        outputs=exec_result.get("outputs", {}),
        error=exec_result.get("error"),
        completed_at=datetime.now(timezone.utc).replace(tzinfo=None),
    )
    db.add(execution)
    await db.commit()
    await db.refresh(execution)

    return {
        "execution_id": execution.id,
        "status": exec_result["status"],
        "node_statuses": exec_result.get("node_statuses", {}),
    }


@router.get("/executions/{execution_id}")
async def get_execution(execution_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(WorkflowExecution).where(WorkflowExecution.id == execution_id))
    execution = result.scalar_one_or_none()
    if not execution:
        raise HTTPException(status_code=404, detail="Execution not found")
    return {
        "execution_id": execution.id,
        "workflow_id": execution.workflow_id,
        "status": execution.status,
        "node_statuses": execution.node_statuses,
        "outputs": execution.outputs,
        "error": execution.error,
        "created_at": execution.created_at.isoformat(),
        "completed_at": execution.completed_at.isoformat() if execution.completed_at else None,
    }
