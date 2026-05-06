"""Basic Memory 适配器 — 读取 Markdown 记忆文件。"""

import logging
from pathlib import Path
from datetime import datetime
from agent_memory_mcp.backends.adapters.base import MemoryAdapter

logger = logging.getLogger(__name__)


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
            try:
                if p.exists() and list(p.glob("*.md")):
                    return p
            except PermissionError:
                logger.warning("Permission denied: %s", p)
            except OSError as e:
                logger.warning("Error accessing %s: %s", p, e)
        return None

    def list_all(self, limit: int = 50) -> list[dict]:
        """列出 Basic Memory 的记忆 — 读取 Markdown 文件中的记忆块。"""
        base_dir = self._get_basic_memory_dir()
        if not base_dir:
            return []

        results = []
        try:
            for md_file in sorted(base_dir.glob("*.md"), reverse=True)[:50]:
                try:
                    content = md_file.read_text(encoding="utf-8")
                except (OSError, UnicodeDecodeError) as e:
                    logger.warning("Skipping %s: %s", md_file, e)
                    continue
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
        except OSError as e:
            logger.error("BasicMemoryAdapter.list_all error: %s", e)

        return results[:limit]

    def get(self, memory_id: str) -> dict | None:
        """获取单条 Basic Memory 记忆。"""
        base_dir = self._get_basic_memory_dir()
        if not base_dir:
            return None
        parts = memory_id.split("_", 2)
        if len(parts) >= 2:
            resolved = (base_dir / f"{parts[1]}.md").resolve()
            # 防止路径遍历攻击
            if not str(resolved).startswith(str(base_dir.resolve())):
                return None
            try:
                if resolved.exists():
                    content = resolved.read_text(encoding="utf-8")
                    return {
                        "id": memory_id,
                        "memory": content[:500],
                        "metadata": {"source_file": str(resolved)},
                        "source": "basic_memory",
                    }
            except (OSError, UnicodeDecodeError) as e:
                logger.warning("BasicMemoryAdapter.get(%s) error: %s", memory_id, e)
        return None
