from fastapi import APIRouter
from agent_memory_mcp.backends import quota

router = APIRouter(tags=["quota"])


@router.get("/quota")
def get_quota():
    """查询当前配额使用情况。"""
    return quota.get_quota()


@router.get("/install-id")
def get_install_id():
    """获取安装 ID（邀请码）。"""
    return {"id": quota.get_install_id()}
