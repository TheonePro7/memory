"""会话时间线 API"""

from fastapi import APIRouter, Query
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


@router.get("/sessions/search")
def search_sessions(q: str = Query(..., min_length=1), days: int = 90):
    """搜索会话内容。"""
    try:
        return {"results": md_backend.grep(q, days=days)}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": f"会话搜索失败: {str(e)}"})


@router.get("/sessions/{date}")
def get_session(date: str):
    try:
        path = Path.cwd() / "memory" / f"{date}.md"
        if path.exists():
            return {"date": date, "content": path.read_text(encoding="utf-8")}
        return {"date": date, "content": ""}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": f"会话详情加载失败: {str(e)}"})


@router.delete("/sessions/{date}")
def delete_session(date: str):
    """删除指定日期的会话记录。"""
    try:
        ok = md_backend.delete_session(date)
        if not ok:
            return JSONResponse(status_code=404, content={"error": "会话不存在"})
        return {"status": "deleted", "date": date}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": f"会话删除失败: {str(e)}"})
