"""Agent 记忆系统 MCP 服务入口"""

from fastmcp import FastMCP

from agent_memory_mcp.backends import mem0_backend
from agent_memory_mcp.core import remember as core_remember, recall as core_recall, summarize as core_summarize, detect_project_id, append_session_log
from agent_memory_mcp import audit
import logging
from pathlib import Path

logger = logging.getLogger(__name__)


logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")

mcp = FastMCP("agent-memory")


@mcp.tool()
def remember(
    content: str,
    tags: list[str] = [],
    project_id: str | None = None,
    process: bool = False,
) -> dict:
    """记住一条信息。

    Args:
        content: 要记住的内容
        tags: 分类标签，如 ["coding-style", "preference"]
        project_id: 项目隔离
        process: 是否用 LLM 提取实体和摘要
    """
    try:
        result = core_remember(content, tags=tags, project_id=project_id, process=process)
        append_session_log(content)
        audit.log("remember", content_summary=content[:50], backend="mem0", tags=tags, process=process)
        return {"id": result.get("id"), "backend": "mem0", "status": "stored"}
    except Exception as e:
        logger.error("remember failed: %s", e)
        return {"backend": "mem0", "status": "error", "error": str(e)}


@mcp.tool()
def recall(
    query: str,
    limit: int = 10,
    project_id: str | None = None,
    process: bool = False,
) -> list[dict]:
    """搜索相关记忆。自动路由到最合适的后端，融合排序后返回。

    Args:
        query: 自然语言查询
        limit: 返回条数
        project_id: 项目隔离
        process: 是否用 LLM 重排序
    """
    try:
        result = core_recall(query, limit=limit, project_id=project_id, process=process)
        audit.log("recall", query_summary=query[:50], backend="mem0", process=process)
        return result[:limit]
    except Exception as e:
        logger.error("recall failed: %s", e)
        return []


@mcp.tool()
def summarize(context: str) -> dict:
    """生成会话摘要并持久化。自动调用 LLM，写入 Markdown 并提取事实。

    Args:
        context: 当前会话文本
    """
    try:
        result = core_summarize(context)
        audit.log("summarize", summary_len=len(result["summary"]), facts_count=len(result.get("facts", [])))
        return result
    except Exception as e:
        logger.error("summarize failed: %s", e)
        return {"summary": f"summarize failed: {e}", "facts": [], "task_completed": False, "file": ""}


@mcp.tool()
def forget(memory_id: str) -> dict:
    """通过 ID 删除一条记忆。

    Args:
        memory_id: 要删除的记忆 ID
    """
    try:
        ok = mem0_backend.delete(memory_id)
        audit.log("forget", memory_id=memory_id, success=ok)
        return {"deleted": 1 if ok else 0, "status": "deleted" if ok else "not_found"}
    except Exception as e:
        logger.error("forget failed: %s", e)
        return {"deleted": 0, "status": "error", "error": str(e)}


@mcp.tool()
def memory_stats() -> dict:
    """获取记忆统计"""
    try:
        return mem0_backend.stats()
    except Exception as e:
        logger.error("memory_stats failed: %s", e)
        return {"total": 0, "error": str(e)}


@mcp.tool()
def audit_log(days: int = 7) -> list[dict]:
    """查询操作审计日志"""
    try:
        return audit.query(days=days)
    except Exception as e:
        logger.error("audit_log failed: %s", e)
        return []


@mcp.tool()
def task_context(project_id: str | None = None) -> dict:
    """返回当前项目的任务概览（活跃任务 + 最近完成）。

    Args:
        project_id: 项目标识符，不传则自动检测
    """
    try:
        from agent_memory_mcp.backends.task_backend import get_active_tasks, list_tasks, sync_beads

        pid = project_id or detect_project_id()
        sync_beads(pid)
        active = get_active_tasks(project_id=pid)
        recent = list_tasks(project_id=pid, limit=5)
        return {
            "active_tasks": active,
            "recent_tasks": recent,
            "total": len(recent),
        }
    except Exception as e:
        logger.error("task_context failed: %s", e)
        return {"active_tasks": [], "recent_tasks": [], "total": 0, "error": str(e)}


if __name__ == "__main__":
    mcp.run()
