"""核心业务逻辑层 — 不依赖 MCP 协议或 CLI argv"""

import subprocess
from pathlib import Path

from agent_memory_mcp.processor import extract
from agent_memory_mcp.backends import mem0_backend, md_backend
from agent_memory_mcp.summarize import generate_summary
from agent_memory_mcp.backends.task_backend import sync_beads
import logging

logger = logging.getLogger(__name__)


def detect_project_id() -> str:
    """从 git root 目录名推断项目标识符，非 git 目录回退到 CWD 名。"""
    try:
        root = subprocess.check_output(
            ["git", "rev-parse", "--show-toplevel"],
            stderr=subprocess.DEVNULL, text=True,
        ).strip()
        return Path(root).name
    except (subprocess.CalledProcessError, FileNotFoundError):
        return Path.cwd().name


def _format_mem0_result(r: dict) -> dict:
    """格式化 mem0 搜索结果，透传 LLM 加工 metadata。"""
    item = {
        "content": r.get("memory", ""),
        "score": r.get("score", 0),
        "source": "mem0",
        "id": r.get("id", ""),
    }
    meta = r.get("metadata") or {}
    if meta.get("entities"):
        item["entities"] = meta["entities"].split(",") if isinstance(meta["entities"], str) else meta["entities"]
    if meta.get("actions"):
        item["actions"] = meta["actions"].split(",") if isinstance(meta["actions"], str) else meta["actions"]
    if meta.get("llm_summary"):
        item["llm_summary"] = meta["llm_summary"]
    if meta.get("tags"):
        item["tags"] = meta["tags"].split(",") if isinstance(meta["tags"], str) else meta["tags"]
    if "rerank_reason" in r:
        item["rerank_reason"] = r["rerank_reason"]
    return item


def remember(
    content: str,
    tags: list[str] | None = None,
    project_id: str | None = None,
    process: bool = False,
) -> dict:
    """记忆存储：可选 LLM 加工 → 向量存储。"""
    entities = actions = llm_summary = None
    if process:
        result = extract(content)
        if result:
            entities = result.get("entities")
            actions = result.get("actions")
            llm_summary = result.get("summary")
            if result.get("tags"):
                tags = list(set((tags or []) + result["tags"]))
    return mem0_backend.add(content, project_id=project_id, tags=tags,
                            entities=entities, actions=actions, llm_summary=llm_summary)


def recall(
    query: str,
    limit: int = 10,
    project_id: str | None = None,
    process: bool = False,
) -> list[dict]:
    """记忆搜索：搜索 → 可选重排序 → 格式化。"""
    results = mem0_backend.search(query, limit=limit, project_id=project_id)
    if process and results:
        from agent_memory_mcp.processor import rerank
        reranked = rerank(query, results, top_n=min(limit, 5))
        if reranked:
            results = reranked
    return [_format_mem0_result(r) for r in results]


def summarize(context: str, project_id: str | None = None) -> dict:
    """会话总结：LLM 摘要 → 持久化 → 提取事实。"""
    result = generate_summary(context)
    path = md_backend.append_summary(result["summary"])
    for fact in result.get("facts", []):
        mem0_backend.add(fact, tags=["auto-extracted"], project_id=project_id)
    sync_beads(project_id or "default")
    return {
        "summary": result["summary"],
        "file": path,
        "facts": result.get("facts", []),
        "task_completed": result.get("task_completed", False),
    }
