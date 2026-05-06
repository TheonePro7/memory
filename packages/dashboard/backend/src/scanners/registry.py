"""Agent 扫描编排引擎"""
import logging

from scanners.base import BUILTIN_SCANNERS
from scanners.memory_checker import check_mcp_for_memory, check_agent_memory_dir, MemoryStatus

logger = logging.getLogger(__name__)


def scan_builtin() -> list[dict]:
    """运行所有内置扫描器，返回检测结果。"""
    results = []
    for scanner in BUILTIN_SCANNERS:
        try:
            scan = scanner.detect()
            memory_status = MemoryStatus.UNKNOWN
            if scan.installed and scan.config_path:
                memory_status = check_mcp_for_memory(scan.config_path)
                if memory_status == MemoryStatus.UNKNOWN:
                    if check_agent_memory_dir():
                        memory_status = MemoryStatus.HAS_MEMORY

            results.append({
                "name": scanner.name,
                "display_name": scanner.display_name,
                "category": scanner.category,
                "installed": scan.installed,
                "managed": False,
                "memory_status": memory_status.value,
                "version": scan.version,
                "config_path": scan.config_path,
            })
        except Exception as e:
            logger.warning("Scanner %s failed: %s", scanner.name, e)
            results.append({
                "name": scanner.name,
                "display_name": scanner.display_name,
                "category": scanner.category,
                "installed": False,
                "managed": False,
                "memory_status": MemoryStatus.UNKNOWN.value,
                "version": None,
                "config_path": None,
                "error": str(e),
            })
    return results


def scan_custom(custom_agents: list[dict]) -> list[dict]:
    """运行自定义 Agent 检测。"""
    results = []
    for agent in custom_agents:
        config_path = agent.get("mcp_config_dir")
        memory_status = MemoryStatus.UNKNOWN
        if config_path:
            memory_status = check_mcp_for_memory(config_path)

        results.append({
            "name": agent.get("name", "unknown"),
            "display_name": agent.get("name", "Unknown"),
            "category": agent.get("type", "other"),
            "installed": True,
            "managed": True,
            "memory_status": memory_status.value,
            "version": None,
            "config_path": config_path,
            "custom_id": agent.get("id"),
        })
    return results


def scan_all(custom_agents: list[dict] | None = None) -> dict:
    """扫描所有 Agent（内置 + 自定义）。"""
    return {
        "builtin": scan_builtin(),
        "custom": scan_custom(custom_agents or []),
    }
