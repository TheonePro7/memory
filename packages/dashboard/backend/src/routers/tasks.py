"""任务 API"""

from pathlib import Path
from pydantic import BaseModel
from fastapi import APIRouter
from starlette.responses import JSONResponse
from backends import task_backend

router = APIRouter(tags=["tasks"])


class TaskCreate(BaseModel):
    title: str
    project_id: str = "default"
    priority: str = "medium"
    agent: str = ""


class TaskUpdate(BaseModel):
    title: str | None = None
    priority: str | None = None
    tags: list[str] | None = None
    agent: str | None = None


def _make_error(status: int, message: str) -> JSONResponse:
    return JSONResponse(status_code=status, content={"error": message})


@router.get("/tasks")
def list_tasks(project_id: str = "default", status: str | None = None, agent: str | None = None):
    try:
        tasks = task_backend.list_tasks(project_id=project_id, status=status, agent=agent)
        # 过滤掉 devflow 内部 state 任务，不展示给用户
        tasks = [t for t in tasks if not t["title"].startswith("state:")]
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


@router.get("/tasks/agents")
def list_task_agents(project_id: str = "default"):
    """返回 tasks 表中所有不重复的 agent。"""
    try:
        agents = task_backend.list_agents_from_tasks(project_id=project_id)
        return {"agents": agents}
    except Exception as e:
        return _make_error(500, f"任务 agent 列表加载失败: {str(e)}")


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
def create_task(body: TaskCreate):
    try:
        t = task_backend.create_task(title=body.title, project_id=body.project_id, priority=body.priority, agent=body.agent)
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
        # 项目根目录 = packages/dashboard/backend/src/routers/tasks.py 向上 6 层到项目根
        root = Path(__file__).resolve().parent.parent.parent.parent.parent.parent
        result = task_backend.sync_beads(project_id, project_path=str(root))
        return result
    except Exception as e:
        return _make_error(500, f"同步失败: {str(e)}")


@router.delete("/tasks/{task_id}")
def delete_task(task_id: str):
    try:
        ok = task_backend.delete_task(task_id)
        if not ok:
            return _make_error(404, "任务不存在")
        return {"status": "deleted", "id": task_id}
    except Exception as e:
        return _make_error(500, f"任务删除失败: {str(e)}")


@router.put("/tasks/{task_id}")
def update_task(task_id: str, update: TaskUpdate):
    try:
        t = task_backend.update_task(
            task_id,
            title=update.title,
            priority=update.priority,
            tags=update.tags,
            agent=update.agent,
        )
        if not t:
            return _make_error(404, "任务不存在")
        return t
    except Exception as e:
        return _make_error(500, f"任务更新失败: {str(e)}")


@router.post("/tasks/seed")
def seed_tasks():
    """创建一组示例任务。"""
    try:
        samples = [
            ("搭建 CLI 项目骨架", "medium", "todo", "devflow"),
            ("设计记忆存储接口", "medium", "in_progress", "devflow"),
            ("实现 MCP 服务端集成", "high", "done", "devflow"),
            ("编写单元测试覆盖", "medium", "done", "devflow"),
            ("优化搜索性能", "low", "todo", "devflow"),
        ]
        count = 0
        for title, priority, status, agent in samples:
            t = task_backend.create_task(title=title, priority=priority, agent=agent)
            if status != "todo":
                task_backend.update_status(t["id"], status)
            count += 1
        return {"seeded": count, "status": "ok"}
    except Exception as e:
        return _make_error(500, f"示例任务创建失败: {str(e)}")


@router.post("/tasks/clean")
def clean_agent_memory_tasks(project_id: str = "default"):
    """删除所有 source=agent-memory 的任务（清理 seed/旧数据），仅保留 beads 同步数据。"""
    try:
        count = task_backend.clean_non_beads(project_id=project_id)
        return {"deleted": count, "status": "ok"}
    except Exception as e:
        return _make_error(500, f"清理失败: {str(e)}")


@router.get("/tasks/{task_id}/memories")
def get_task_memories(task_id: str):
    """返回指定任务关联的记忆 ID 列表。"""
    try:
        links = task_backend.get_memories_for_task(task_id)
        return {"task_id": task_id, "links": links, "total": len(links)}
    except Exception as e:
        return _make_error(500, f"任务记忆关联加载失败: {str(e)}")


@router.post("/tasks/{task_id}/memories")
def link_task_memory(task_id: str, memory_id: str, relationship: str = "context"):
    """关联一条记忆到指定任务。"""
    try:
        result = task_backend.link_memory_to_task(task_id, memory_id, relationship)
        return result
    except Exception as e:
        return _make_error(500, f"记忆关联失败: {str(e)}")
