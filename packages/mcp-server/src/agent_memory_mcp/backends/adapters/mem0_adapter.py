"""Mem0 适配器 — 读取 Mem0 的 Qdrant 存储数据。"""

from pathlib import Path
from agent_memory_mcp.backends.adapters.base import MemoryAdapter


class Mem0Adapter(MemoryAdapter):
    """读取 Mem0 的本地 Qdrant 存储。"""

    @property
    def name(self) -> str:
        return "mem0"

    def _get_mem0_dir(self) -> Path | None:
        """检测 Mem0 数据目录。"""
        candidates = [
            Path.home() / ".mem0" / "qdrant",
            Path.home() / ".mem0",
        ]
        for p in candidates:
            if p.exists():
                return p
        return None

    def list_all(self, limit: int = 50) -> list[dict]:
        """列出 Mem0 的记忆。V1.0 读取本地 Qdrant 的 collections。"""
        mem0_dir = self._get_mem0_dir()
        if not mem0_dir:
            return []

        results = []
        try:
            from qdrant_client import QdrantClient
            client = QdrantClient(path=str(mem0_dir))
            collections = client.get_collections().collections
            for col in collections:
                points = client.scroll(
                    collection_name=col.name,
                    limit=min(limit, 100),
                    with_payload=True,
                    with_vectors=False,
                )
                for point in points[0]:
                    results.append({
                        "id": str(point.id),
                        "memory": point.payload.get("text", "") or point.payload.get("data", ""),
                        "metadata": point.payload,
                        "source": "mem0",
                        "score": 1.0,
                    })
        except ImportError:
            pass
        except Exception:
            pass

        return results[:limit]

    def get(self, memory_id: str) -> dict | None:
        """获取单条 Mem0 记忆。"""
        try:
            from qdrant_client import QdrantClient
            mem0_dir = self._get_mem0_dir()
            if not mem0_dir:
                return None
            client = QdrantClient(path=str(mem0_dir))
            collections = client.get_collections().collections
            for col in collections:
                points = client.scroll(
                    collection_name=col.name,
                    limit=1,
                    with_payload=True,
                    with_vectors=False,
                )
                for point in points[0]:
                    if str(point.id) == memory_id:
                        return {
                            "id": str(point.id),
                            "memory": point.payload.get("text", ""),
                            "metadata": point.payload,
                            "source": "mem0",
                        }
        except Exception:
            pass
        return None
