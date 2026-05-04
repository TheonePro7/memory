"""Agent 记忆系统 MCP 服务入口"""

import sys
from pathlib import Path

# 支持作为脚本直接运行: python src/server.py
sys.path.insert(0, str(Path(__file__).resolve().parent))

from fastmcp import FastMCP

from router import route
from backends import mem0_backend, md_backend
from summarize import generate_summary
import audit
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")

mcp = FastMCP("agent-memory")


@mcp.tool()
def remember(
    content: str,
    tags: list[str] = [],
    importance: int = 5,
    auto_verify: bool = False,
    project_id: str | None = None,
    process: bool = False,
) -> dict:
    """记住一条信息。

    Args:
        content: 要记住的内容
        tags: 分类标签，如 ["coding-style", "preference"]
        importance: 重要度 1-10
        auto_verify: 后台 LLM 去噪（Hook 自动提取时启用）
        project_id: 项目隔离
        process: 是否用 LLM 提取实体和摘要
    """
    entities = actions = llm_summary = None
    if process:
        from processor import extract
        result = extract(content)
        if result:
            entities = result.get("entities")
            actions = result.get("actions")
            llm_summary = result.get("summary")
            if result.get("tags"):
                tags = list(set(tags + result["tags"]))

    result = mem0_backend.add(content, project_id=project_id, tags=tags,
                               entities=entities, actions=actions, llm_summary=llm_summary)
    audit.log("remember", content_summary=content[:50], backend="mem0", tags=tags, process=process)
    return {"id": result.get("id"), "backend": "mem0", "status": "stored"}


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
    target = route(query)
    results = []

    if target == "markdown":
        md_results = md_backend.grep(query)
        results.extend({
            "content": r["content"],
            "date": r["date"],
            "source": "markdown",
            "relevance": 0.8,
        } for r in md_results[:limit])
        mem_results = mem0_backend.search(query, limit=limit // 2)
        results.extend({
            "content": r.get("memory", ""),
            "score": r.get("score", 0),
            "source": "mem0",
        } for r in mem_results)
    else:
        mem_results = mem0_backend.search(query, limit=limit)
        if process and mem_results:
            from processor import rerank
            reranked = rerank(query, mem_results, top_n=min(limit, 5))
            if reranked:
                mem_results = reranked
        results.extend({
            "content": r.get("memory", ""),
            "score": r.get("score", 0),
            "source": "mem0",
        } for r in mem_results)

    audit.log("recall", query_summary=query[:50], backend=target, process=process)
    return results[:limit]


@mcp.tool()
def summarize(context: str) -> dict:
    """生成会话摘要并持久化。自动调用 LLM，写入 Markdown 并提取事实。

    Args:
        context: 当前会话文本
    """
    result = generate_summary(context)
    path = md_backend.append_summary(result["summary"])
    for fact in result.get("facts", []):
        mem0_backend.add(fact, tags=["auto-extracted"])
    audit.log("summarize", summary_len=len(result["summary"]), facts_count=len(result.get("facts", [])))
    return {"summary": result["summary"], "file": path, "facts": result.get("facts", [])}


@mcp.tool()
def forget(pattern: str, backend: str | None = None) -> dict:
    """删除匹配的记忆。

    Args:
        pattern: 内容关键词
        backend: "mem0" | "markdown" | None（全部）
    """
    audit.log("forget", pattern=pattern)
    return {"deleted": 0, "status": "not_implemented", "message": "Forget is not yet implemented. Memory data is preserved."}


@mcp.tool()
def memory_stats() -> dict:
    """获取记忆统计"""
    return mem0_backend.stats()


@mcp.tool()
def audit_log(days: int = 7) -> list[dict]:
    """查询操作审计日志"""
    return audit.query(days=days)


if __name__ == "__main__":
    mcp.run()
