"""Agent 管理 API"""
import logging
import time as _time
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional

from scanners.registry import scan_all
from scanners.custom_store import CustomAgentStore

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/agents", tags=["agents"])
store = CustomAgentStore()

# 模块级扫描缓存 — 5 分钟 TTL
_scan_cache: dict | None = None
_scan_cache_time: float = 0.0
_SCAN_CACHE_TTL = 300


class CustomAgentCreate(BaseModel):
    name: str
    type: str = "other"
    mcp_config_dir: Optional[str] = None
    project_dir: Optional[str] = None
    detect_command: Optional[str] = None


class CustomAgentUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    mcp_config_dir: Optional[str] = None
    project_dir: Optional[str] = None
    detect_command: Optional[str] = None


@router.get("/scan")
def scan_agents(refresh: bool = Query(False, description="强制重新扫描，不使用缓存")):
    """扫描所有已安装 Agent（内置 + 自定义）。

    结果默认缓存 5 分钟，传 ?refresh=true 强制重新扫描。
    """
    global _scan_cache, _scan_cache_time
    now = _time.time()
    if refresh or _scan_cache is None or (now - _scan_cache_time) > _SCAN_CACHE_TTL:
        custom = store.list_all()
        _scan_cache = scan_all(custom)
        _scan_cache_time = now
    return _scan_cache


@router.get("")
def list_agents():
    """获取所有已管理 Agent。"""
    return {"agents": store.list_all()}


@router.post("/custom")
def add_custom_agent(agent: CustomAgentCreate):
    """添加自定义 Agent。"""
    result = store.add(
        name=agent.name,
        type=agent.type,
        mcp_config_dir=agent.mcp_config_dir,
        project_dir=agent.project_dir,
        detect_command=agent.detect_command,
    )
    return result


@router.put("/custom/{agent_id}")
def update_custom_agent(agent_id: str, update: CustomAgentUpdate):
    """编辑自定义 Agent。"""
    result = store.update(agent_id, **update.model_dump(exclude_none=True))
    if not result:
        raise HTTPException(status_code=404, detail="Custom agent not found")
    return result


@router.delete("/custom/{agent_id}")
def delete_custom_agent(agent_id: str):
    """删除自定义 Agent。"""
    ok = store.delete(agent_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Custom agent not found")
    return {"status": "deleted", "id": agent_id}


@router.post("/manage")
def manage_agents(names: list[str]):
    """确认管理选中的 Agent。"""
    return {"managed": names, "count": len(names)}
