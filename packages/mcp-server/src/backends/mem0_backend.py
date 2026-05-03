"""mem0 记忆后端"""

import os
from pathlib import Path
from mem0 import Memory


_MEMORY: Memory | None = None


def _get_memory_dir() -> Path:
    return Path.cwd() / ".memory" / "chroma"


def _embedder_config() -> dict:
    """始终使用 fastembed 本地嵌入，无需 API key。"""
    return {
        "provider": "fastembed",
        "config": {"model": "BAAI/bge-small-en-v1.5"},
    }


def get_memory() -> Memory:
    global _MEMORY
    if _MEMORY is None:
        config = {
            "vector_store": {
                "provider": "chroma",
                "config": {"path": str(_get_memory_dir())},
            },
            "embedder": _embedder_config(),
        }
        _MEMORY = Memory.from_config(config)
    return _MEMORY


def add(
    content: str,
    user_id: str = "default",
    project_id: str | None = None,
    tags: list[str] | None = None,
) -> dict:
    try:
        mem = get_memory()
        metadata = {}
        if project_id:
            metadata["project_id"] = project_id
        if tags:
            metadata["tags"] = ",".join(tags)
        result = mem.add(content, user_id=user_id, metadata=metadata)
        return result
    except Exception as e:
        return {"error": str(e), "status": "storage_unavailable"}


def search(
    query: str,
    user_id: str = "default",
    project_id: str | None = None,
    limit: int = 10,
) -> list[dict]:
    try:
        mem = get_memory()
        filters = {"user_id": user_id}
        if project_id:
            filters["project_id"] = project_id
        results = mem.search(query, filters=filters)
        return results.get("results", [])
    except Exception as e:
        return [{"error": str(e), "source": "mem0"}]


def delete(memory_id: str, user_id: str = "default") -> bool:
    try:
        mem = get_memory()
        mem.delete(memory_id)
        return True
    except Exception:
        return False


def stats(user_id: str = "default") -> dict:
    try:
        mem = get_memory()
        all_memories = mem.get_all(filters={"user_id": user_id})
        return {"total": len(all_memories), "user_id": user_id}
    except Exception as e:
        return {"total": 0, "user_id": user_id, "error": str(e)}


def list_all(user_id: str = "default", limit: int = 50) -> list[dict]:
    try:
        mem = get_memory()
        all_results = mem.get_all(filters={"user_id": user_id})
        return all_results[:limit] if isinstance(all_results, list) else []
    except Exception as e:
        return [{"error": str(e)}]
