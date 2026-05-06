"""MCP 配置中的记忆工具检测"""
import json
import logging
from enum import Enum
from pathlib import Path

logger = logging.getLogger(__name__)


class MemoryStatus(str, Enum):
    HAS_MEMORY = "has_memory"
    NO_MEMORY = "no_memory"
    UNKNOWN = "unknown"


MEMORY_KEYWORDS = [
    "memory", "mem0", "chroma", "mem", "agent-memory",
    "memory-server", "mcp-memory", "super-memory",
]


def _try_read_json(path: str) -> dict | None:
    try:
        data = Path(path).expanduser().read_text(encoding="utf-8")
        return json.loads(data)
    except (FileNotFoundError, json.JSONDecodeError, OSError):
        return None


def check_mcp_for_memory(config_path: str | None) -> MemoryStatus:
    """读取 MCP 配置，检测是否有已知记忆工具。"""
    if not config_path:
        return MemoryStatus.UNKNOWN

    data = _try_read_json(config_path)
    if data is None:
        return MemoryStatus.UNKNOWN

    servers = data.get("mcpServers", {}) if isinstance(data, dict) else {}
    if not servers:
        servers = data.get("globalConfig", {}).get("mcpServers", {})

    if not servers:
        return MemoryStatus.UNKNOWN

    for name, cfg in servers.items():
        name_lower = name.lower()
        if any(kw in name_lower for kw in MEMORY_KEYWORDS):
            return MemoryStatus.HAS_MEMORY

        cmd = ""
        if isinstance(cfg, dict):
            cmd = " ".join(cfg.get("args", [])) if cfg.get("args") else ""
            cmd += " " + cfg.get("command", "")
        cmd_lower = cmd.lower()
        if any(kw in cmd_lower for kw in MEMORY_KEYWORDS):
            return MemoryStatus.HAS_MEMORY

    return MemoryStatus.NO_MEMORY


def check_agent_memory_dir() -> bool:
    """检查 ~/.agent-memory/ 目录是否存在。"""
    return Path.home().joinpath(".agent-memory").exists()
