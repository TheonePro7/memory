"""统计 API"""

from fastapi import APIRouter
from backends import mem0_backend, md_backend

router = APIRouter(tags=["stats"])


@router.get("/stats")
def get_stats(project_id: str | None = None):
    m = mem0_backend.stats(project_id=project_id)
    sessions = md_backend.get_recent(days=90)
    return {
        "total_memories": m["total"],
        "total_sessions": len(sessions),
        "recent_sessions": [s["date"] for s in sessions[:7]],
    }
