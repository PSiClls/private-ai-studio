import json
import uuid
from typing import Any, Dict, List, Optional

from ..services.ollama import ollama_service
from ..services.cloud_llm import cloud_llm_service
from ..services.rag_service import rag_service
from ..config import settings


class WorkflowEngine:
    """Workflow execution engine that runs nodes in topological order."""

    async def validate(self, nodes: list, edges: list) -> dict:
        errors = []
        node_ids = {n["id"] for n in nodes}

        for edge in edges:
            source = edge.get("source")
            target = edge.get("target")
            if source not in node_ids:
                errors.append(f"Edge references unknown source node: {source}")
            if target not in node_ids:
                errors.append(f"Edge references unknown target node: {target}")

        return {"valid": len(errors) == 0, "errors": errors}

    async def _call_llm(self, model: str, prompt: str) -> str:
        service = cloud_llm_service if settings.llm_provider != "ollama" else ollama_service
        if not await service.check_available():
            return f"[Error: {settings.llm_provider} is not available]"
        response_text = ""
        async for raw in service.generate_stream(
            model=model or "llama3.2",
            messages=[{"role": "user", "content": prompt}],
        ):
            data_str = raw.replace("data: ", "", 1)
            try:
                parsed = json.loads(data_str)
                if parsed["event"] == "token":
                    response_text += parsed["data"]
                elif parsed["event"] in ("done", "error"):
                    break
            except json.JSONDecodeError:
                continue
        return response_text or "[Empty response from model]"

    async def _search_chromadb(self, query: str) -> str:
        results = await rag_service.query(
            query_text=query,
            document_ids=None,
            n_results=5,
            relevance_threshold=0.0,
        )
        if not results:
            return "[Vector search] No results found."
        formatted = rag_service.format_context(results)
        return formatted or "[Vector search] No results found."

    async def execute(self, id: str, nodes: list, edges: list) -> Dict[str, Any]:
        node_map = {n["id"]: n for n in nodes}

        adj: Dict[str, List[str]] = {n["id"]: [] for n in nodes}
        in_degree: Dict[str, int] = {n["id"]: 0 for n in nodes}

        for edge in edges:
            adj[edge["source"]].append(edge["target"])
            in_degree[edge["target"]] = in_degree.get(edge["target"], 0) + 1

        queue = [nid for nid, deg in in_degree.items() if deg == 0]
        topo_order = []

        while queue:
            nid = queue.pop(0)
            topo_order.append(nid)
            for neighbor in adj[nid]:
                in_degree[neighbor] -= 1
                if in_degree[neighbor] == 0:
                    queue.append(neighbor)

        if len(topo_order) != len(nodes):
            return {"status": "error", "error": "Workflow contains a cycle"}

        outputs: Dict[str, Any] = {}
        node_statuses: Dict[str, str] = {}

        for nid in topo_order:
            node = node_map[nid]
            node_type = node.get("data", {}).get("nodeType", "unknown")
            config = node.get("data", {})

            node_statuses[nid] = "running"

            input_values = {}
            for edge in edges:
                if edge["target"] == nid and edge["source"] in outputs:
                    input_values[edge.get("targetHandle", "input")] = outputs[edge["source"]]

            try:
                if node_type == "input":
                    outputs[nid] = config.get("text", "")

                elif node_type == "llm":
                    prompt = input_values.get("prompt", "") or config.get("prompt", "")
                    context = input_values.get("context", "")
                    full_prompt = f"{context}\n\n{prompt}" if context else prompt
                    model = config.get("model", "llama3.2")
                    outputs[nid] = await self._call_llm(model, full_prompt)

                elif node_type == "prompt":
                    template = config.get("template", "")
                    variables = config.get("variables", {})
                    for key, val in variables.items():
                        template = template.replace(f"{{{key}}}", str(val))
                    for key, val in input_values.items():
                        if isinstance(val, dict):
                            for k2, v2 in val.items():
                                template = template.replace(f"{{{k2}}}", str(v2))
                        else:
                            template = template.replace(f"{{{key}}}", str(val))
                    outputs[nid] = template

                elif node_type == "search":
                    query = input_values.get("query", "") or config.get("query", "")
                    outputs[nid] = await self._search_chromadb(query)

                elif node_type == "condition":
                    text = input_values.get("text", "") or config.get("text", "")
                    condition_type = config.get("conditionType", "contains")
                    condition_value = config.get("conditionValue", "")
                    if condition_type == "contains":
                        result = condition_value in text
                    elif condition_type == "regex":
                        import re
                        result = bool(re.search(condition_value, text))
                    elif condition_type == "equals":
                        result = text.strip() == condition_value.strip()
                    else:
                        result = False
                    outputs[nid] = str(result).lower()

                elif node_type == "output":
                    value = input_values.get("value", "")
                    outputs[nid] = value

                node_statuses[nid] = "completed"

            except Exception as e:
                node_statuses[nid] = "error"
                outputs[nid] = str(e)

        return {
            "status": "completed",
            "execution_id": uuid.uuid4().hex[:12],
            "node_statuses": node_statuses,
            "outputs": {nid: str(out) for nid, out in outputs.items() if out},
        }


workflow_engine = WorkflowEngine()
