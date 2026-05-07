"""记忆 CRUD API"""

from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from backends import mem0_backend
from agent_memory_mcp.backends import quota
from agent_memory_mcp.core import get_adapters

router = APIRouter(tags=["memories"])


class MemoryUpdate(BaseModel):
    content: str


class ImportPayload(BaseModel):
    version: str = "1.0"
    memories: list[dict] = []


@router.post("/memories/import")
def import_memories(payload: ImportPayload):
    """导入记忆（JSON 格式）。"""
    count = 0
    errors = 0
    for mem in payload.memories:
        content = mem.get("memory") or mem.get("content", "")
        if not content.strip():
            errors += 1
            continue
        meta = mem.get("metadata") or {}
        result = mem0_backend.add(content, project_id=meta.get("project_id"), agent=meta.get("agent", "default"))
        if result.get("status") == "stored":
            count += 1
        else:
            errors += 1
    return {"imported": count, "errors": errors, "total": len(payload.memories)}


@router.put("/memories/{memory_id}")
def update_memory(memory_id: str, update: MemoryUpdate):
    """编辑记忆内容。自动校验配额并计数。"""
    if not quota.can_edit():
        raise HTTPException(status_code=403, detail="本月编辑配额已用完")
    ok = mem0_backend.update(memory_id, update.content)
    if not ok:
        raise HTTPException(status_code=404, detail="Memory not found")
    quota.increment_usage()
    return {"status": "updated", "id": memory_id}


@router.get("/memories")
def list_memories(q: str = "", project_id: str | None = None, agent: str | None = None, process: bool = False, limit: int = 50):
    if q:
        results = mem0_backend.search(q, project_id=project_id, limit=limit)
        if process and results:
            from processor import rerank
            reranked = rerank(q, results, top_n=limit)
            if reranked:
                results = reranked
    else:
        results = mem0_backend.list_all(project_id=project_id, limit=limit)
        # 合并第三方适配器数据
        for adapter in get_adapters():
            try:
                adapter_results = adapter.list_all(limit=limit)
                results.extend(adapter_results)
            except Exception:
                pass
    if agent and results:
        results = [r for r in results if r.get("metadata", {}).get("agent") == agent]
    return {"results": results, "total": len(results)}


@router.get("/memories/export")
def export_memories(project_id: str | None = None):
    """导出全部记忆为 JSON。"""
    mems = mem0_backend.list_all(project_id=project_id, limit=100000)
    return {
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "version": "1.0",
        "count": len(mems),
        "memories": mems,
    }


@router.delete("/memories/{memory_id}")
def delete_memory(memory_id: str):
    """删除记忆。自动校验配额并计数。"""
    if not quota.can_edit():
        raise HTTPException(status_code=403, detail="本月编辑配额已用完")
    ok = mem0_backend.delete(memory_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Memory not found")
    quota.increment_usage()
    return {"status": "deleted", "id": memory_id}
