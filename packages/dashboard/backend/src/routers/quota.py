from fastapi import APIRouter
from agent_memory_mcp.backends import quota

router = APIRouter(tags=["quota"])


@router.get("/quota")
def get_quota():
    return quota.get_quota()


@router.post("/quota/increment")
def increment_usage():
    return quota.increment_usage()


@router.get("/install-id")
def get_install_id():
    return {"id": quota.get_install_id()}
