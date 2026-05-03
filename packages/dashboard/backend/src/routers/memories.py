"""记忆 CRUD API"""

from fastapi import APIRouter
from backends import mem0_backend

router = APIRouter(tags=["memories"])


@router.get("/memories")
def list_memories(q: str = "", limit: int = 50):
    if q:
        results = mem0_backend.search(q, limit=limit)
    else:
        results = mem0_backend.search("", limit=limit)
    return {"results": results, "total": len(results)}


@router.delete("/memories/{memory_id}")
def delete_memory(memory_id: str):
    mem0_backend.delete(memory_id)
    return {"status": "deleted", "id": memory_id}
