"""任务 API"""

import os

from fastapi import APIRouter
from backends import task_backend

router = APIRouter(tags=["tasks"])


@router.get("/tasks")
def list_tasks(project_id: str = "default", status: str | None = None):
    tasks = task_backend.list_tasks(project_id=project_id, status=status)
    return {"tasks": tasks, "total": len(tasks)}


@router.get("/tasks/active")
def get_active_tasks(project_id: str = "default"):
    tasks = task_backend.get_active_tasks(project_id=project_id)
    return {"tasks": tasks, "total": len(tasks)}


@router.get("/tasks/{task_id}")
def get_task(task_id: str):
    t = task_backend.get_task(task_id)
    if not t:
        return {"error": "not found"}, 404
    return t


@router.post("/tasks")
def create_task(title: str, project_id: str = "default", priority: str = "medium"):
    t = task_backend.create_task(title=title, project_id=project_id, priority=priority)
    return t


@router.post("/tasks/{task_id}/status")
def update_task_status(task_id: str, status: str):
    t = task_backend.update_status(task_id, status)
    if not t:
        return {"error": "not found"}, 404
    return t


@router.post("/tasks/{task_id}/events")
def add_task_event(task_id: str, event_type: str, content: str):
    t = task_backend.add_event(task_id, event_type, content)
    if not t:
        return {"error": "not found"}, 404
    return t


@router.post("/tasks/sync-beads")
def sync_beads(project_id: str = "default"):
    result = task_backend.sync_beads(project_id, project_path=os.getcwd())
    return result
