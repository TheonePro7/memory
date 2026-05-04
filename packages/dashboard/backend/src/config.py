"""Dashboard 配置"""

from pathlib import Path
import sys

# 共享 MCP 服务的 mem0 配置
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent.parent / "mcp-server" / "src"))

CONFIG_PATH = Path.home() / ".agent-memory" / "config.yaml"


def load_config() -> dict:
    if CONFIG_PATH.exists():
        import yaml
        return yaml.safe_load(CONFIG_PATH.read_text()) or {}
    return {
        "user_id": "default",
        "memory_dir": str(Path.cwd() / "memory"),
        "chroma_dir": str(Path.cwd() / ".memory" / "chroma"),
    }
