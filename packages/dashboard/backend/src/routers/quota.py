from fastapi import APIRouter
from starlette.responses import JSONResponse
from agent_memory_mcp.backends import quota

router = APIRouter(tags=["quota"])


@router.get("/quota")
def get_quota():
    """查询当前配额使用情况。"""
    try:
        return quota.get_quota()
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": f"配额查询失败: {str(e)}"})


@router.get("/install-id")
def get_install_id():
    """获取安装 ID（邀请码）。"""
    try:
        return {"id": quota.get_install_id()}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": f"安装 ID 获取失败: {str(e)}"})
