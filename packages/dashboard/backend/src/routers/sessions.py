"""会话时间线 API"""

from fastapi import APIRouter
from pathlib import Path
from starlette.responses import JSONResponse
from backends import md_backend

router = APIRouter(tags=["sessions"])


@router.get("/sessions")
def list_sessions(days: int = 30):
    try:
        return {"sessions": md_backend.get_recent(days=days)}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": f"会话加载失败: {str(e)}"})


@router.get("/sessions/{date}")
def get_session(date: str):
    try:
        path = Path.cwd() / "memory" / f"{date}.md"
        if path.exists():
            return {"date": date, "content": path.read_text(encoding="utf-8")}
        return {"date": date, "content": ""}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": f"会话详情加载失败: {str(e)}"})
