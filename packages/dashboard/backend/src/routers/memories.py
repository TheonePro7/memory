"""记忆 CRUD API"""

from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from backends import mem0_backend

router = APIRouter(tags=["memories"])


class MemoryUpdate(BaseModel):
    content: str


@router.put("/memories/{memory_id}")
def update_memory(memory_id: str, update: MemoryUpdate):
    """编辑记忆内容。"""
    ok = mem0_backend.update(memory_id, update.content)
    if not ok:
        raise HTTPException(status_code=404, detail="Memory not found")
    return {"status": "updated", "id": memory_id}


@router.get("/memories")
def list_memories(q: str = "", project_id: str | None = None, process: bool = False, limit: int = 50):
    if q:
        results = mem0_backend.search(q, project_id=project_id, limit=limit)
        if process and results:
            from processor import rerank
            reranked = rerank(q, results, top_n=limit)
            if reranked:
                results = reranked
    else:
        results = mem0_backend.list_all(project_id=project_id, limit=limit)
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
    mem0_backend.delete(memory_id)
    return {"status": "deleted", "id": memory_id}
