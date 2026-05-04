"""会话时间线 API"""

from fastapi import APIRouter
from pathlib import Path
from backends import md_backend

router = APIRouter(tags=["sessions"])


@router.get("/sessions")
def list_sessions(days: int = 30):
    return {"sessions": md_backend.get_recent(days=days)}


@router.get("/sessions/{date}")
def get_session(date: str):
    path = Path.cwd() / "memory" / f"{date}.md"
    if path.exists():
        return {"date": date, "content": path.read_text(encoding="utf-8")}
    return {"date": date, "content": ""}
