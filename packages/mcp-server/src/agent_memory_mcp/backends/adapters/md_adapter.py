"""Basic Memory 适配器 — 读取 Markdown 记忆文件。"""

from pathlib import Path
from datetime import datetime
from agent_memory_mcp.backends.adapters.base import MemoryAdapter


class BasicMemoryAdapter(MemoryAdapter):
    """读取 Basic Memory 的 Markdown 文件。"""

    @property
    def name(self) -> str:
        return "basic_memory"

    def _get_basic_memory_dir(self) -> Path | None:
        """检测 Basic Memory 数据目录。"""
        candidates = [
            Path.home() / ".basic-memory",
            Path.home() / "basic-memory",
        ]
        for p in candidates:
            if p.exists() and list(p.glob("*.md")):
                return p
        return None

    def list_all(self, limit: int = 50) -> list[dict]:
        """列出 Basic Memory 的记忆 — 读取 Markdown 文件中的记忆块。"""
        base_dir = self._get_basic_memory_dir()
        if not base_dir:
            return []

        results = []
        for md_file in sorted(base_dir.glob("*.md"), reverse=True)[:50]:
            content = md_file.read_text(encoding="utf-8")
            blocks = content.split("\n---\n") if "---" in content else [content]
            for block in blocks:
                block = block.strip()
                if not block:
                    continue
                results.append({
                    "id": f"bm_{md_file.stem}_{hash(block) % 10000000:07d}",
                    "memory": block[:500],
                    "metadata": {
                        "source_file": str(md_file),
                        "created_at": datetime.fromtimestamp(md_file.stat().st_mtime).isoformat(),
                    },
                    "source": "basic_memory",
                    "score": 1.0,
                })
                if len(results) >= limit:
                    break
            if len(results) >= limit:
                break

        return results[:limit]

    def get(self, memory_id: str) -> dict | None:
        """获取单条 Basic Memory 记忆。"""
        base_dir = self._get_basic_memory_dir()
        if not base_dir:
            return None
        parts = memory_id.split("_", 2)
        if len(parts) >= 2:
            md_file = base_dir / f"{parts[1]}.md"
            if md_file.exists():
                content = md_file.read_text(encoding="utf-8")
                return {
                    "id": memory_id,
                    "memory": content[:500],
                    "metadata": {"source_file": str(md_file)},
                    "source": "basic_memory",
                }
        return None
