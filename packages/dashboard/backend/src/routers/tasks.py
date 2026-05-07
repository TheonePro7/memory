"""任务 API"""

import os

from fastapi import APIRouter
from starlette.responses import JSONResponse
from backends import task_backend

router = APIRouter(tags=["tasks"])


def _make_error(status: int, message: str) -> JSONResponse:
    return JSONResponse(status_code=status, content={"error": message})


@router.get("/tasks")
def list_tasks(project_id: str = "default", status: str | None = None):
    try:
        tasks = task_backend.list_tasks(project_id=project_id, status=status)
        return {"tasks": tasks, "total": len(tasks)}
    except Exception as e:
        return _make_error(500, f"任务列表加载失败: {str(e)}")


@router.get("/tasks/active")
def get_active_tasks(project_id: str = "default"):
    try:
        tasks = task_backend.get_active_tasks(project_id=project_id)
        return {"tasks": tasks, "total": len(tasks)}
    except Exception as e:
        return _make_error(500, f"活跃任务加载失败: {str(e)}")


@router.get("/tasks/{task_id}")
def get_task(task_id: str):
    try:
        t = task_backend.get_task(task_id)
        if not t:
            return _make_error(404, "任务不存在")
        return t
    except Exception as e:
        return _make_error(500, f"任务详情加载失败: {str(e)}")


@router.post("/tasks")
def create_task(title: str, project_id: str = "default", priority: str = "medium"):
    try:
        t = task_backend.create_task(title=title, project_id=project_id, priority=priority)
        return t
    except Exception as e:
        return _make_error(500, f"任务创建失败: {str(e)}")


@router.post("/tasks/{task_id}/status")
def update_task_status(task_id: str, status: str):
    try:
        t = task_backend.update_status(task_id, status)
        if not t:
            return _make_error(404, "任务不存在")
        return t
    except Exception as e:
        return _make_error(500, f"状态更新失败: {str(e)}")


@router.post("/tasks/{task_id}/events")
def add_task_event(task_id: str, event_type: str, content: str):
    try:
        t = task_backend.add_event(task_id, event_type, content)
        if not t:
            return _make_error(404, "任务不存在")
        return t
    except Exception as e:
        return _make_error(500, f"事件添加失败: {str(e)}")


@router.post("/tasks/sync-beads")
def sync_beads(project_id: str = "default"):
    try:
        result = task_backend.sync_beads(project_id, project_path=os.getcwd())
        return result
    except Exception as e:
        return _make_error(500, f"同步失败: {str(e)}")
