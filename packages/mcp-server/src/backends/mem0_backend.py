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
    mem = get_memory()
    metadata = {}
    if project_id:
        metadata["project_id"] = project_id
    if tags:
        metadata["tags"] = ",".join(tags)
    result = mem.add(content, user_id=user_id, metadata=metadata)
    return result


def search(
    query: str,
    user_id: str = "default",
    project_id: str | None = None,
    limit: int = 10,
) -> list[dict]:
    mem = get_memory()
    filters = {"user_id": user_id}
    if project_id:
        filters["project_id"] = project_id
    results = mem.search(query, filters=filters)
    return results.get("results", [])


def delete(memory_id: str, user_id: str = "default") -> bool:
    mem = get_memory()
    mem.delete(memory_id)
    return True


def stats(user_id: str = "default") -> dict:
    mem = get_memory()
    all_memories = mem.get_all(filters={"user_id": user_id})
    return {"total": len(all_memories), "user_id": user_id}
