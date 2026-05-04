"""记忆 CRUD API"""

from fastapi import APIRouter
from backends import mem0_backend

router = APIRouter(tags=["memories"])


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


@router.delete("/memories/{memory_id}")
def delete_memory(memory_id: str):
    mem0_backend.delete(memory_id)
    return {"status": "deleted", "id": memory_id}
