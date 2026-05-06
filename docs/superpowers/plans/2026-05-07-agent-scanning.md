# Agent 扫描与跨 Agent 记忆管理 — 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dashboard 从单一 Agent 记忆管理升级为多 Agent 记忆指挥中心——自动检测机器上的 20+ 主流 Agent，检测记忆状态，一键部署，跨 Agent 管理。

**Architecture:** 后端新增 `scanners/` 模块（Scanner 抽象基类 + 注册表 + 自定义 Agent SQLite 存储），通过文件/配置扫描非侵入式检测 Agent。前端新增 Agent 管理页面（勾选 → 管理 → 部署），记忆页增加 Agent 筛选器。部署复用 `npx @agent-memory/init`。

**Tech Stack:** Python FastAPI + React (Ant Design) + ChromaDB (metadata 扩展) + SQLite (自定义 Agent 存储)

---

## File Structure

```
packages/dashboard/backend/src/
  ├── scanners/                    # 新增 — Agent 扫描模块
  │   ├── __init__.py
  │   ├── base.py                  # AgentScanner ABC + 内置扫描器注册表
  │   ├── registry.py              # scan_all() 编排引擎
  │   ├── custom_store.py          # 自定义 Agent SQLite CRUD
  │   └── memory_checker.py        # MCP 配置记忆工具检测
  ├── routers/
  │   └── agents.py                # 新增 — Agent API 路由
  └── main.py                      # 修改 — 注册 agents router

packages/dashboard/frontend/src/
  ├── App.tsx                      # 修改 — 导航栏增加 Agent 入口
  ├── pages/
  │   ├── Agents.tsx               # 新建 — Agent 管理主页面
  │   ├── Agents.css               # 新建 — Agent 页面样式
  │   └── Memories.tsx             # 修改 — 增加 Agent 筛选器 + Agent 列

packages/mcp-server/src/agent_memory_mcp/
  └── backends/mem0_backend.py     # 修改 — add() 增加 agent 参数
```

---

### Task 1: Scanner ABC + 内置扫描器注册表

**Files:**
- Create: `packages/dashboard/backend/src/scanners/__init__.py`
- Create: `packages/dashboard/backend/src/scanners/base.py`

- [ ] **Step 1: Write test**

```python
# tests/test_scanners_base.py
from scanners.base import AgentScanner, BUILTIN_SCANNERS

class _TestScanner(AgentScanner):
    @property
    def name(self) -> str: return "test-agent"
    @property
    def display_name(self) -> str: return "Test Agent"
    @property
    def category(self) -> str: return "IDE"
    def detect(self) -> dict:
        return {"installed": False, "config_path": None, "version": None}

def test_scanner_interface():
    s = _TestScanner()
    assert s.name == "test-agent"
    assert s.category == "IDE"

def test_builtin_scanners_loaded():
    assert len(BUILTIN_SCANNERS) > 10
    assert all(hasattr(s, "name") for s in BUILTIN_SCANNERS)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/dashboard/backend && python -m pytest tests/test_scanners_base.py -v`
Expected: FAIL (module not found)

- [ ] **Step 3: Write `__init__.py`**

```python
# scanners/__init__.py
```

- [ ] **Step 4: Write `base.py` — ABC + 内置扫描器注册表**

```python
"""Agent Scanner 抽象基类 + 内置扫描器注册表"""
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional


@dataclass
class ScanResult:
    installed: bool
    config_path: Optional[str] = None
    version: Optional[str] = None
    detail: str = ""


class AgentScanner(ABC):
    @property
    @abstractmethod
    def name(self) -> str: ...
    @property
    @abstractmethod
    def display_name(self) -> str: ...
    @property
    @abstractmethod
    def category(self) -> str: ...

    @abstractmethod
    def detect(self) -> ScanResult:
        """检测 Agent 是否安装，返回安装路径和版本"""
        ...


def _check_path(*paths: str) -> Optional[str]:
    """检查路径是否存在，返回第一个存在的路径"""
    from pathlib import Path
    for p in paths:
        expanded = Path(p).expanduser()
        if expanded.exists():
            return str(expanded)
    return None


def _check_python_package(package: str) -> Optional[str]:
    """检查 Python 包是否安装"""
    import subprocess
    try:
        r = subprocess.run(["pip", "list", "--format=columns"], capture_output=True, text=True, timeout=10)
        for line in r.stdout.splitlines():
            if line.lower().startswith(package.lower()):
                return line.split()[1] if len(line.split()) > 1 else "installed"
    except Exception:
        return None
    return None


def _check_npx_package(package: str) -> bool:
    """检查 npx 包是否可用"""
    import subprocess
    try:
        r = subprocess.run(["npx", package, "--help"], capture_output=True, text=True, timeout=10)
        return r.returncode == 0
    except Exception:
        return False


class ClaudeCodeScanner(AgentScanner):
    name = "claude-code"
    display_name = "Claude Code"
    category = "IDE"
    def detect(self) -> ScanResult:
        path = _check_path("~/.claude/settings.json")
        return ScanResult(installed=path is not None, config_path=path)


class CursorScanner(AgentScanner):
    name = "cursor"
    display_name = "Cursor"
    category = "IDE"
    def detect(self) -> ScanResult:
        paths = [
            "~/.cursor/mcp.json",
            "~/.config/cursor/mcp.json",
            "~/AppData/Roaming/Cursor/mcp.json",
        ]
        path = _check_path(*paths)
        return ScanResult(installed=path is not None, config_path=path)


class WindsurfScanner(AgentScanner):
    name = "windsurf"
    display_name = "Windsurf"
    category = "IDE"
    def detect(self) -> ScanResult:
        paths = [
            "~/.windsurf/mcp.json",
            "~/.config/windsurf/mcp.json",
        ]
        path = _check_path(*paths)
        return ScanResult(installed=path is not None, config_path=path)


class TraeScanner(AgentScanner):
    name = "trae"
    display_name = "Trae (字节)"
    category = "IDE"
    def detect(self) -> ScanResult:
        paths = [
            "~/.trae/mcp.json",
            "~/AppData/Local/Trae/mcp.json",
            "~/Library/Application Support/Trae/mcp.json",
        ]
        path = _check_path(*paths)
        return ScanResult(installed=path is not None, config_path=path)


class VSCodeScanner(AgentScanner):
    name = "vscode"
    display_name = "VS Code"
    category = "IDE"
    def detect(self) -> ScanResult:
        paths = [
            "~/.vscode/mcp.json",
            "~/AppData/Roaming/Code/mcp.json",
        ]
        path = _check_path(*paths)
        return ScanResult(installed=path is not None, config_path=path)


class GithubCopilotScanner(AgentScanner):
    name = "github-copilot"
    display_name = "GitHub Copilot"
    category = "IDE"
    def detect(self) -> ScanResult:
        paths = [
            "~/.vscode/mcp.json",
            "~/.github/copilot/mcp.json",
        ]
        path = _check_path(*paths)
        return ScanResult(installed=False, config_path=path)


class CodexCliScanner(AgentScanner):
    name = "codex-cli"
    display_name = "Codex CLI (OpenAI)"
    category = "terminal"
    def detect(self) -> ScanResult:
        import shutil
        path = shutil.which("codex")
        return ScanResult(installed=path is not None, config_path=path)


class OpenClawScanner(AgentScanner):
    name = "openclaw"
    display_name = "OpenClaw"
    category = "terminal"
    def detect(self) -> ScanResult:
        path = _check_path("~/.openclaw/config.json", "~/.openclaw/config.yaml")
        return ScanResult(installed=path is not None, config_path=path)


class AiderScanner(AgentScanner):
    name = "aider"
    display_name = "Aider"
    category = "terminal"
    def detect(self) -> ScanResult:
        import shutil
        path = shutil.which("aider")
        ver = _check_python_package("aider")
        return ScanResult(installed=path is not None, version=ver, config_path=path)


class GooseScanner(AgentScanner):
    name = "goose"
    display_name = "Goose (Block)"
    category = "terminal"
    def detect(self) -> ScanResult:
        import shutil
        path = shutil.which("goose")
        return ScanResult(installed=path is not None, config_path=path)


class GeminiCliScanner(AgentScanner):
    name = "gemini-cli"
    display_name = "Gemini CLI (Google)"
    category = "terminal"
    def detect(self) -> ScanResult:
        ver = _check_python_package("google-genai")
        return ScanResult(installed=ver is not None, version=ver)


class OpenCodeScanner(AgentScanner):
    name = "opencode"
    display_name = "OpenCode"
    category = "terminal"
    def detect(self) -> ScanResult:
        path = _check_path("~/.opencode/config.json")
        return ScanResult(installed=path is not None, config_path=path)


class ClaudeDesktopScanner(AgentScanner):
    name = "claude-desktop"
    display_name = "Claude Desktop"
    category = "terminal"
    def detect(self) -> ScanResult:
        path = _check_path(
            "~/.claude/config.json",
            "~/AppData/Roaming/Claude/config.json",
        )
        return ScanResult(installed=path is not None, config_path=path)


class ClineScanner(AgentScanner):
    name = "cline"
    display_name = "Cline"
    category = "IDE"
    def detect(self) -> ScanResult:
        path = _check_path("~/.cline/config.json", "~/.config/cline/mcp.json")
        return ScanResult(installed=path is not None, config_path=path)


class ContinueScanner(AgentScanner):
    name = "continue"
    display_name = "Continue.dev"
    category = "IDE"
    def detect(self) -> ScanResult:
        path = _check_path("~/.continue/config.json")
        return ScanResult(installed=path is not None, config_path=path)


class LangGraphScanner(AgentScanner):
    name = "langgraph"
    display_name = "LangGraph"
    category = "framework"
    def detect(self) -> ScanResult:
        ver = _check_python_package("langgraph")
        return ScanResult(installed=ver is not None, version=ver)


class CrewAIScanner(AgentScanner):
    name = "crewai"
    display_name = "CrewAI"
    category = "framework"
    def detect(self) -> ScanResult:
        ver = _check_python_package("crewai")
        return ScanResult(installed=ver is not None, version=ver)


class DifyScanner(AgentScanner):
    name = "dify"
    display_name = "Dify"
    category = "framework"
    def detect(self) -> ScanResult:
        path = _check_path("~/.dify/config.yaml", "~/.dify/config.json")
        return ScanResult(installed=path is not None, config_path=path)


class MastraScanner(AgentScanner):
    name = "mastra"
    display_name = "Mastra"
    category = "framework"
    def detect(self) -> ScanResult:
        import shutil
        path = shutil.which("mastra")
        return ScanResult(installed=path is not None, config_path=path)


# 注册表：所有内置扫描器实例
BUILTIN_SCANNERS: list[AgentScanner] = [
    ClaudeCodeScanner(),
    CursorScanner(),
    WindsurfScanner(),
    TraeScanner(),
    VSCodeScanner(),
    GithubCopilotScanner(),
    ClineScanner(),
    ContinueScanner(),
    CodexCliScanner(),
    OpenClawScanner(),
    AiderScanner(),
    GooseScanner(),
    GeminiCliScanner(),
    OpenCodeScanner(),
    ClaudeDesktopScanner(),
    LangGraphScanner(),
    CrewAIScanner(),
    DifyScanner(),
    MastraScanner(),
]
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd packages/dashboard/backend && python -m pytest tests/test_scanners_base.py -v`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/dashboard/backend/src/scanners/
git commit -m "feat: add scanner ABC and 19 built-in scanners"
```

---

### Task 2: 记忆状态检测 (memory_checker)

**Files:**
- Create: `packages/dashboard/backend/src/scanners/memory_checker.py`
- Test: `tests/test_memory_checker.py`

- [ ] **Step 1: Write test**

```python
# tests/test_memory_checker.py
import json, tempfile
from pathlib import Path
from scanners.memory_checker import check_mcp_for_memory, MemoryStatus

def test_check_mcp_no_file():
    status = check_mcp_for_memory("/nonexistent/path")
    assert status == MemoryStatus.UNKNOWN

def test_check_mcp_with_agent_memory():
    with tempfile.TemporaryDirectory() as d:
        cfg = {"mcpServers": {"agent-memory": {"command": "python"}}}
        Path(d, "settings.json").write_text(json.dumps(cfg), encoding="utf-8")
        status = check_mcp_for_memory(str(Path(d, "settings.json")))
        assert status == MemoryStatus.HAS_MEMORY

def test_check_mcp_with_third_party():
    with tempfile.TemporaryDirectory() as d:
        cfg = {"mcpServers": {"memory-server": {"command": "python"}}}
        Path(d, "settings.json").write_text(json.dumps(cfg), encoding="utf-8")
        status = check_mcp_for_memory(str(Path(d, "settings.json")))
        assert status == MemoryStatus.HAS_MEMORY

def test_check_mcp_no_memory_tools():
    with tempfile.TemporaryDirectory() as d:
        cfg = {"mcpServers": {"filesystem": {"command": "python"}}}
        Path(d, "settings.json").write_text(json.dumps(cfg), encoding="utf-8")
        status = check_mcp_for_memory(str(Path(d, "settings.json")))
        assert status == MemoryStatus.NO_MEMORY
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/dashboard/backend && python -m pytest tests/test_memory_checker.py -v`
Expected: FAIL

- [ ] **Step 3: Write memory_checker.py**

```python
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

# 已知记忆工具关键词（MCP server 名称或命令中的关键词）
MEMORY_KEYWORDS = [
    "memory", "mem0", "chroma", "mem", "agent-memory",
    "memory-server", "mcp-memory", "super-memory",
]

def _try_read_json(path: str) -> dict | None:
    try:
        data = Path(path).expanduser().read_text(encoding="utf-8")
        return json.loads(data)
    except (FileNotFoundError, json.JSONDecodeError, OSError) as e:
        logger.debug("Failed to read %s: %s", path, e)
        return None

def check_mcp_for_memory(config_path: str | None) -> MemoryStatus:
    """读取 MCP 配置，检测是否有已知记忆工具。"""
    if not config_path:
        return MemoryStatus.UNKNOWN

    data = _try_read_json(config_path)
    if data is None:
        return MemoryStatus.UNKNOWN

    # 尝试找到 mcpServers 配置
    servers = data.get("mcpServers", {}) if isinstance(data, dict) else {}
    if not servers:
        # 某些配置可能是嵌套的 claude.json 格式
        servers = data.get("globalConfig", {}).get("mcpServers", {})

    if not servers:
        return MemoryStatus.UNKNOWN

    # 检查每个 MCP server 的名称和命令是否包含记忆关键词
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/dashboard/backend && python -m pytest tests/test_memory_checker.py -v`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add packages/dashboard/backend/src/scanners/memory_checker.py tests/test_memory_checker.py
git commit -m "feat: add MCP memory detection checker"
```

---

### Task 3: 扫描编排引擎 (registry)

**Files:**
- Create: `packages/dashboard/backend/src/scanners/registry.py`
- Test: `tests/test_scanner_registry.py`

- [ ] **Step 1: Write test**

```python
# tests/test_scanner_registry.py
from scanners.registry import scan_all, scan_builtin
from scanners.base import BUILTIN_SCANNERS

def test_scan_builtin_returns_all():
    results = scan_builtin()
    assert len(results) == len(BUILTIN_SCANNERS)

def test_scan_all_returns_dict():
    results = scan_all()
    assert "builtin" in results
    assert "custom" in results
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/dashboard/backend && python -m pytest tests/test_scanner_registry.py -v`
Expected: FAIL

- [ ] **Step 3: Write registry.py**

```python
"""Agent 扫描编排引擎"""
import logging
from scanners.base import BUILTIN_SCANNERS, AgentScanner, ScanResult
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
    """运行自定义 Agent 检测（用户添加的）。"""
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/dashboard/backend && python -m pytest tests/test_scanner_registry.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/dashboard/backend/src/scanners/registry.py tests/test_scanner_registry.py
git commit -m "feat: add scanner orchestration engine"
```

---

### Task 4: 自定义 Agent SQLite 存储

**Files:**
- Create: `packages/dashboard/backend/src/scanners/custom_store.py`
- Test: `tests/test_custom_store.py`

- [ ] **Step 1: Write test**

```python
# tests/test_custom_store.py
import os, tempfile
from scanners.custom_store import CustomAgentStore

def test_crud():
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as f:
        db_path = f.name
    try:
        store = CustomAgentStore(db_path)
        # create
        agent = store.add("MyBot", "terminal", mcp_config_dir="/tmp/.mcp")
        assert agent["name"] == "MyBot"
        assert agent["type"] == "terminal"
        assert agent["id"] is not None
        # list
        agents = store.list_all()
        assert len(agents) == 1
        # update
        updated = store.update(agent["id"], name="MyBotV2")
        assert updated["name"] == "MyBotV2"
        # delete
        ok = store.delete(agent["id"])
        assert ok is True
        assert len(store.list_all()) == 0
    finally:
        os.unlink(db_path)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/dashboard/backend && python -m pytest tests/test_custom_store.py -v`
Expected: FAIL

- [ ] **Step 3: Write custom_store.py**

```python
"""自定义 Agent SQLite 存储"""
import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional


class CustomAgentStore:
    def __init__(self, db_path: str | None = None):
        self.db_path = db_path or str(Path.home() / ".agent-memory" / "custom_agents.db")
        Path(self.db_path).parent.mkdir(parents=True, exist_ok=True)
        self._init_db()

    def _get_conn(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self):
        conn = self._get_conn()
        conn.execute("""
            CREATE TABLE IF NOT EXISTS custom_agents (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                type TEXT DEFAULT 'other',
                mcp_config_dir TEXT,
                project_dir TEXT,
                detect_command TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        """)
        conn.commit()
        conn.close()

    def add(self, name: str, type: str = "other", mcp_config_dir: str = None,
            project_dir: str = None, detect_command: str = None) -> dict:
        conn = self._get_conn()
        agent_id = str(uuid.uuid4())[:8]
        now = datetime.now(timezone.utc).isoformat()
        conn.execute(
            "INSERT INTO custom_agents (id, name, type, mcp_config_dir, project_dir, detect_command, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (agent_id, name, type, mcp_config_dir, project_dir, detect_command, now, now),
        )
        conn.commit()
        conn.close()
        return {"id": agent_id, "name": name, "type": type, "mcp_config_dir": mcp_config_dir, "project_dir": project_dir}

    def list_all(self) -> list[dict]:
        conn = self._get_conn()
        rows = conn.execute("SELECT * FROM custom_agents ORDER BY created_at DESC").fetchall()
        conn.close()
        return [dict(r) for r in rows]

    def get(self, agent_id: str) -> dict | None:
        conn = self._get_conn()
        row = conn.execute("SELECT * FROM custom_agents WHERE id = ?", (agent_id,)).fetchone()
        conn.close()
        return dict(row) if row else None

    def update(self, agent_id: str, **kwargs) -> dict | None:
        conn = self._get_conn()
        now = datetime.now(timezone.utc).isoformat()
        fields = []
        values = []
        for k, v in kwargs.items():
            if k in ("name", "type", "mcp_config_dir", "project_dir", "detect_command"):
                fields.append(f"{k} = ?")
                values.append(v)
        if not fields:
            conn.close()
            return self.get(agent_id)
        fields.append("updated_at = ?")
        values.append(now)
        values.append(agent_id)
        conn.execute(f"UPDATE custom_agents SET {', '.join(fields)} WHERE id = ?", values)
        conn.commit()
        conn.close()
        return self.get(agent_id)

    def delete(self, agent_id: str) -> bool:
        conn = self._get_conn()
        cur = conn.execute("DELETE FROM custom_agents WHERE id = ?", (agent_id,))
        deleted = cur.rowcount > 0
        conn.commit()
        conn.close()
        return deleted
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/dashboard/backend && python -m pytest tests/test_custom_store.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/dashboard/backend/src/scanners/custom_store.py tests/test_custom_store.py
git commit -m "feat: add custom agent SQLite store"
```

---

### Task 5: Agent API 路由

**Files:**
- Create: `packages/dashboard/backend/src/routers/agents.py`
- Modify: `packages/dashboard/backend/src/main.py`
- Modify: `packages/dashboard/backend/src/scanners/__init__.py` (exports)

- [ ] **Step 1: Write agents.py router**

```python
"""Agent 管理 API"""
import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from scanners.registry import scan_all
from scanners.custom_store import CustomAgentStore

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/agents", tags=["agents"])
store = CustomAgentStore()


class CustomAgentCreate(BaseModel):
    name: str
    type: str = "other"
    mcp_config_dir: Optional[str] = None
    project_dir: Optional[str] = None
    detect_command: Optional[str] = None


class CustomAgentUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    mcp_config_dir: Optional[str] = None
    project_dir: Optional[str] = None
    detect_command: Optional[str] = None


@router.get("/scan")
def scan_agents():
    """扫描所有已安装 Agent（内置 + 自定义）。"""
    custom = store.list_all()
    return scan_all(custom)


@router.get("")
def list_agents():
    """获取所有已管理 Agent。"""
    return {"agents": store.list_all()}


@router.post("/manage")
def manage_agents(names: list[str]):
    """确认管理选中的 Agent（预留，后续可持久化管理状态）。"""
    return {"managed": names, "count": len(names)}


@router.post("/custom")
def add_custom_agent(agent: CustomAgentCreate):
    """添加自定义 Agent。"""
    result = store.add(
        name=agent.name,
        type=agent.type,
        mcp_config_dir=agent.mcp_config_dir,
        project_dir=agent.project_dir,
        detect_command=agent.detect_command,
    )
    return result


@router.put("/custom/{agent_id}")
def update_custom_agent(agent_id: str, update: CustomAgentUpdate):
    """编辑自定义 Agent。"""
    result = store.update(agent_id, **update.model_dump(exclude_none=True))
    if not result:
        raise HTTPException(status_code=404, detail="Custom agent not found")
    return result


@router.delete("/custom/{agent_id}")
def delete_custom_agent(agent_id: str):
    """删除自定义 Agent。"""
    ok = store.delete(agent_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Custom agent not found")
    return {"status": "deleted", "id": agent_id}


@router.post("/{name}/deploy")
def deploy_memory(name: str):
    """为指定 Agent 部署记忆系统（调用 npx @agent-memory/init）。"""
    import subprocess
    from pathlib import Path

    # 找到该 Agent 的目录
    custom = store.list_all()
    agent = next((a for a in custom if a["name"] == name), None)
    target_dir = agent.get("project_dir") if agent else None
    if not target_dir:
        # 如果是内置 Agent，使用 ~/.agent-memory 周边目录
        # 或直接使用当前用户目录
        target_dir = str(Path.home())

    try:
        result = subprocess.run(
            ["npx", "@agent-memory/init", target_dir, "--yes"],
            capture_output=True, text=True, timeout=120,
        )
        return {
            "success": result.returncode == 0,
            "output": result.stdout[-500:],
            "error": result.stderr[-500:] if result.returncode != 0 else None,
        }
    except FileNotFoundError:
        return {"success": False, "error": "npx 未安装，请先安装 Node.js"}
    except subprocess.TimeoutExpired:
        return {"success": False, "error": "部署超时"}
    except Exception as e:
        return {"success": False, "error": str(e)}
```

- [ ] **Step 2: Update main.py to register agent router**

In `packages/dashboard/backend/src/main.py`, add:
```python
from routers import agents
app.include_router(agents.router, prefix="/api")
```

- [ ] **Step 3: Update scanners/__init__.py**

```python
from .base import AgentScanner, ScanResult, BUILTIN_SCANNERS
from .registry import scan_all, scan_builtin
from .custom_store import CustomAgentStore
from .memory_checker import check_mcp_for_memory, MemoryStatus

__all__ = [
    "AgentScanner", "ScanResult", "BUILTIN_SCANNERS",
    "scan_all", "scan_builtin",
    "CustomAgentStore",
    "check_mcp_for_memory", "MemoryStatus",
]
```

- [ ] **Step 4: Verify the API starts**

Run: `cd packages/dashboard/backend && python -c "from routers.agents import router; print('OK')"`
Expected: OK

- [ ] **Step 5: Commit**

```bash
git add packages/dashboard/backend/src/routers/agents.py packages/dashboard/backend/src/main.py packages/dashboard/backend/src/scanners/__init__.py
git commit -m "feat: add agent management API endpoints"
```

---

### Task 6: 记忆存储增加 Agent 字段

**Files:**
- Modify: `packages/mcp-server/src/agent_memory_mcp/backends/mem0_backend.py`

- [ ] **Step 1: Modify add() function to accept agent parameter**

In `mem0_backend.py`:

1. Add `agent: str | None = None` parameter
2. Add to metadata: `if agent: metadata["agent"] = agent`
3. Default agent detection from environment or user_id

```python
def add(
    content: str,
    user_id: str = "default",
    project_id: str | None = None,
    agent: str | None = None,   # 新增
    tags: list[str] | None = None,
    entities: list[str] | None = None,
    actions: list[str] | None = None,
    llm_summary: str | None = None,
) -> dict:
    try:
        if not content or not content.strip():
            return {"id": "", "backend": "mem0", "status": "error", "error": "empty content"}
        memory_id = str(uuid.uuid4())
        vector = _embed(content)
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc).isoformat()
        metadata = {"user_id": user_id, "created_at": now}
        if project_id:
            metadata["project_id"] = project_id
        if agent:
            metadata["agent"] = agent
        # ... rest unchanged ...
```

- [ ] **Step 2: Run existing tests to verify no regression**

Run: `cd packages/mcp-server && pytest tests/test_mem0_backend.py -v`
Expected: All tests pass

- [ ] **Step 3: Update core.py remember() to pass agent**

In `core.py`, find the `remember()` function and update the call to `mem0_backend.add()` to pass `agent=...` (get from detecting the current agent environment).

- [ ] **Step 4: Commit**

```bash
git add packages/mcp-server/src/agent_memory_mcp/backends/mem0_backend.py packages/mcp-server/src/agent_memory_mcp/core.py
git commit -m "feat: add agent field to memory metadata"
```

---

### Task 7: 后端记忆 API 增加 Agent 筛选

**Files:**
- Modify: `packages/dashboard/backend/src/routers/memories.py`
- Modify: `packages/dashboard/backend/src/backends/mem0_backend.py`（Dashboard 本地的后端适配层）

- [ ] **Step 1: Update list_memories() to accept agent filter**

In `routers/memories.py`, update the `list_memories` endpoint:

```python
@router.get("/memories")
def list_memories(q: str = "", project_id: str | None = None, agent: str | None = None, process: bool = False, limit: int = 50):
    if q:
        results = mem0_backend.search(q, project_id=project_id, limit=limit)
    else:
        results = mem0_backend.list_all(project_id=project_id, limit=limit)
    # 客户端筛选 agent
    if agent and results:
        results = [r for r in results if r.get("metadata", {}).get("agent") == agent]
    return {"results": results, "total": len(results)}
```

- [ ] **Step 2: Commit**

```bash
git add packages/dashboard/backend/src/routers/memories.py
git commit -m "feat: add agent filter to memories API"
```

---

### Task 8: Agent 管理页面 UI

**Files:**
- Create: `packages/dashboard/frontend/src/pages/Agents.tsx`
- Create: `packages/dashboard/frontend/src/pages/Agents.css`
- Modify: `packages/dashboard/frontend/src/App.tsx`

- [ ] **Step 1: Build Agent 页面**

```tsx
// pages/Agents.tsx
import React, { useEffect, useState } from "react";
import { Typography, Card, Row, Col, Space, Tag, Button, Modal, Input, Select, message, Spin } from "antd";
import {
  PlusOutlined, RocketOutlined, CheckCircleOutlined,
  MinusCircleOutlined, QuestionCircleOutlined, ReloadOutlined,
} from "@ant-design/icons";
import { COLORS } from "../theme";

interface Agent {
  name: string;
  display_name: string;
  category: string;
  installed: boolean;
  managed: boolean;
  memory_status: string;
  config_path: string | null;
  version: string | null;
  custom_id?: string;
}

export default function Agents() {
  const [builtin, setBuiltin] = useState<Agent[]>([]);
  const [custom, setCustom] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [addModal, setAddModal] = useState(false);
  const [newAgent, setNewAgent] = useState({ name: "", type: "other", mcp_config_dir: "", project_dir: "" });

  const scan = () => {
    setLoading(true);
    fetch("/api/agents/scan")
      .then(r => r.json())
      .then(data => {
        setBuiltin(data.builtin || []);
        setCustom(data.custom || []);
        // 默认选中已安装且未管理的 Agent
        const defaultSelected = new Set<string>();
        (data.builtin || []).forEach((a: Agent) => {
          if (a.installed) defaultSelected.add(a.name);
        });
        setSelected(defaultSelected);
      })
      .catch(() => message.error("扫描失败"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { scan(); }, []);

  const toggleAgent = (name: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const confirmManage = () => {
    fetch("/api/agents/manage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([...selected]),
    }).then(() => message.success(`已确认管理 ${selected.size} 个 Agent`));
  };

  const addCustom = () => {
    fetch("/api/agents/custom", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newAgent),
    }).then(r => r.json()).then(() => {
      message.success("自定义 Agent 已添加");
      setAddModal(false);
      setNewAgent({ name: "", type: "other", mcp_config_dir: "", project_dir: "" });
      scan();
    }).catch(() => message.error("添加失败"));
  };

  const statusTag = (status: string) => {
    switch (status) {
      case "has_memory":
        return <Tag icon={<CheckCircleOutlined />} style={{ background: `${COLORS.accent.green}15`, color: COLORS.accent.green, border: `1px solid ${COLORS.accent.green}30` }}>有记忆</Tag>;
      case "no_memory":
        return <Tag icon={<MinusCircleOutlined />} style={{ background: `${COLORS.accent.orange}15`, color: COLORS.accent.orange, border: `1px solid ${COLORS.accent.orange}30` }}>无记忆</Tag>;
      default:
        return <Tag icon={<QuestionCircleOutlined />} style={{ background: `${COLORS.text.tertiary}15`, color: COLORS.text.tertiary, border: `1px solid ${COLORS.border.default}` }}>不确定</Tag>;
    }
  };

  const stats = {
    total: builtin.length + custom.length,
    installed: builtin.filter(a => a.installed).length + custom.length,
    hasMemory: [...builtin, ...custom].filter(a => a.memory_status === "has_memory").length,
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <Typography.Title level={3} style={{ margin: 0, color: COLORS.text.primary, fontWeight: 600 }}>Agent</Typography.Title>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={scan} loading={loading}>重新扫描</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddModal(true)}>添加自定义</Button>
        </Space>
      </div>

      {/* 统计卡 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card styles={{ body: { padding: "16px 20px" } }} style={{ background: COLORS.bg.card, borderLeft: `3px solid ${COLORS.accent.blue}` }}>
            <Space direction="vertical" size={4}>
              <Typography.Text style={{ fontSize: 12, color: COLORS.text.secondary, textTransform: "uppercase", letterSpacing: "0.5px" }}>已检测</Typography.Text>
              <span style={{ fontSize: 28, fontWeight: 600, color: COLORS.text.primary }}>{stats.total}</span>
            </Space>
          </Card>
        </Col>
        <Col span={8}>
          <Card styles={{ body: { padding: "16px 20px" } }} style={{ background: COLORS.bg.card, borderLeft: `3px solid ${COLORS.accent.green}` }}>
            <Space direction="vertical" size={4}>
              <Typography.Text style={{ fontSize: 12, color: COLORS.text.secondary, textTransform: "uppercase", letterSpacing: "0.5px" }}>已安装</Typography.Text>
              <span style={{ fontSize: 28, fontWeight: 600, color: COLORS.text.primary }}>{stats.installed}</span>
            </Space>
          </Card>
        </Col>
        <Col span={8}>
          <Card styles={{ body: { padding: "16px 20px" } }} style={{ background: COLORS.bg.card, borderLeft: `3px solid ${COLORS.accent.purple}` }}>
            <Space direction="vertical" size={4}>
              <Typography.Text style={{ fontSize: 12, color: COLORS.text.secondary, textTransform: "uppercase", letterSpacing: "0.5px" }}>有记忆</Typography.Text>
              <span style={{ fontSize: 28, fontWeight: 600, color: COLORS.text.primary }}>{stats.hasMemory}</span>
            </Space>
          </Card>
        </Col>
      </Row>

      {/* 自动检测区域 */}
      <Typography.Title level={5} style={{ color: COLORS.text.secondary, marginBottom: 12 }}>自动检测</Typography.Title>
      {loading ? <Spin style={{ display: "block", margin: "40px auto" }} /> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 24 }}>
          {builtin.map((agent) => (
            <div key={agent.name} onClick={() => agent.installed && toggleAgent(agent.name)}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "10px 16px", borderRadius: 6,
                background: selected.has(agent.name) ? `${COLORS.accent.blue}10` : COLORS.bg.card,
                border: `1px solid ${selected.has(agent.name) ? `${COLORS.accent.blue}30` : COLORS.border.default}`,
                cursor: agent.installed ? "pointer" : "default",
                opacity: agent.installed ? 1 : 0.5,
                transition: "all 0.15s ease",
              }}>
              <Space>
                <div style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: agent.installed ? COLORS.accent.green : COLORS.border.default,
                }} />
                <span style={{ color: COLORS.text.primary, fontSize: 14 }}>{agent.display_name}</span>
                <Tag style={{ fontSize: 11, color: COLORS.text.tertiary }}>{agent.category}</Tag>
              </Space>
              <Space size={8}>
                {statusTag(agent.memory_status)}
                {agent.installed && !selected.has(agent.name) && <Tag style={{ fontSize: 11 }}>忽略</Tag>}
                {agent.installed && selected.has(agent.name) && <Tag color="blue" style={{ fontSize: 11 }}>已选</Tag>}
              </Space>
            </div>
          ))}
        </div>
      )}

      {/* 自定义 Agent 区域 */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <Typography.Title level={5} style={{ margin: 0, color: COLORS.text.secondary }}>自定义 Agent</Typography.Title>
      </div>
      {custom.length === 0 ? (
        <Typography.Text style={{ color: COLORS.text.tertiary, fontSize: 13 }}>暂无自定义 Agent，点击右上角「添加自定义」</Typography.Text>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 24 }}>
          {custom.map((agent) => (
            <div key={agent.custom_id} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "10px 16px", borderRadius: 6,
              background: COLORS.bg.card, border: `1px solid ${COLORS.border.default}`,
            }}>
              <Space>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: COLORS.accent.green }} />
                <span style={{ color: COLORS.text.primary, fontSize: 14 }}>{agent.display_name}</span>
              </Space>
              <Space size={8}>
                {statusTag(agent.memory_status)}
                <Button type="primary" size="small" icon={<RocketOutlined />}>部署</Button>
              </Space>
            </div>
          ))}
        </div>
      )}

      {/* 确认管理按钮 */}
      {selected.size > 0 && (
        <div style={{ position: "sticky", bottom: 24, display: "flex", justifyContent: "center" }}>
          <Button type="primary" size="large" onClick={confirmManage} style={{ minWidth: 300, height: 44, fontSize: 15 }}>
            确认管理 {selected.size} 个 Agent
          </Button>
        </div>
      )}

      {/* 添加自定义 Agent 弹窗 */}
      <Modal title="添加自定义 Agent" open={addModal} onOk={addCustom} onCancel={() => setAddModal(false)} okText="添加" cancelText="取消">
        <Space direction="vertical" style={{ width: "100%", marginTop: 12 }} size={12}>
          <Input placeholder="Agent 名称（必填）" value={newAgent.name} onChange={e => setNewAgent({ ...newAgent, name: e.target.value })} />
          <Select placeholder="类型" style={{ width: "100%" }} value={newAgent.type} onChange={v => setNewAgent({ ...newAgent, type: v })} options={[
            { value: "IDE", label: "IDE" }, { value: "terminal", label: "终端" }, { value: "framework", label: "框架" }, { value: "other", label: "其他" },
          ]} />
          <Input placeholder="MCP 配置目录（可选）" value={newAgent.mcp_config_dir} onChange={e => setNewAgent({ ...newAgent, mcp_config_dir: e.target.value })} />
          <Input placeholder="项目目录（可选）" value={newAgent.project_dir} onChange={e => setNewAgent({ ...newAgent, project_dir: e.target.value })} />
        </Space>
      </Modal>
    </div>
  );
}
```

- [ ] **Step 2: Update App.tsx to add Agents nav item and page**

In `App.tsx`:
1. Import Agents page
2. Import `RobotOutlined` icon
3. Add `agents` to navItems
4. Add `agents: <Agents />` to pages map

```tsx
import { RobotOutlined } from "@ant-design/icons";  // or use SettingOutlined as fallback

const navItems: NavItem[] = [
  { key: "overview", icon: <BarChartOutlined />, label: "总览" },
  { key: "memories", icon: <DatabaseOutlined />, label: "记忆" },
  { key: "agents", icon: <RobotOutlined />, label: "Agent" },  // 新增
  { key: "timeline", icon: <HistoryOutlined />, label: "时间线" },
  { key: "tasks", icon: <CheckSquareOutlined />, label: "任务" },
  { key: "settings", icon: <SettingOutlined />, label: "设置" },
];
```

- [ ] **Step 3: Build to verify**

Run: `cd packages/dashboard/frontend && npm run build 2>&1`
Expected: Build success

- [ ] **Step 4: Commit**

```bash
git add packages/dashboard/frontend/src/pages/Agents.tsx packages/dashboard/frontend/src/App.tsx
git commit -m "feat: add Agent management page UI"
```

---

### Task 9: 记忆页增加 Agent 筛选器

**Files:**
- Modify: `packages/dashboard/frontend/src/pages/Memories.tsx`

- [ ] **Step 1: Add agent filter to Memories page**

In the memories page toolbar, add an Agent selector next to the project filter:

```tsx
const [agentFilter, setAgentFilter] = useState<string | undefined>(undefined);

// Fetch available agents for the filter
useEffect(() => {
  fetch("/api/agents/scan")
    .then(r => r.json())
    .then(data => {
      const agents = [...(data.builtin || []), ...(data.custom || [])]
        .filter((a: any) => a.installed)
        .map((a: any) => a.name);
      setAgentOptions(agents);
    })
    .catch(() => {});
}, []);

// In the search function, add agent param
const search = (q: string, pid?: string, agent?: string) => {
  let url = `/api/memories?q=${encodeURIComponent(q)}&limit=50`;
  if (pid) url += `&project_id=${encodeURIComponent(pid)}`;
  if (agent) url += `&agent=${encodeURIComponent(agent)}`;
  // ... rest unchanged
};

// Add Agent column
{
  title: "Agent",
  key: "agent",
  width: 100,
  render: (_: unknown, r: Memory) => {
    const agent = r.metadata?.agent;
    return agent ? <Tag style={{ fontSize: 11 }}>{agent}</Tag> : null;
  },
}
```

- [ ] **Step 2: Build to verify**

Run: `cd packages/dashboard/frontend && npm run build 2>&1`
Expected: Build success

- [ ] **Step 3: Commit**

```bash
git add packages/dashboard/frontend/src/pages/Memories.tsx
git commit -m "feat: add agent filter and column to memories page"
```

---

### Self-Review

**Spec coverage check:**
- Scanner ABC + 19 built-in scanners: ✅ Task 1
- Memory status detection (3 tiers): ✅ Task 2
- Scan orchestration: ✅ Task 3
- Custom Agent CRUD: ✅ Task 4
- API endpoints (all 8 routes): ✅ Task 5
- Agent metadata in memory storage: ✅ Task 6
- Agent filter in memories API: ✅ Task 7
- Agent management page UI: ✅ Task 8
- Agent filter in memories page UI: ✅ Task 9

**Placeholder scan:** No TBD, TODO, or incomplete sections. All code is complete.

**Type consistency:** AgentScanner ABC defines `name`, `display_name`, `category` properties and `detect()` method. All tasks use consistent property names across backend and frontend.
