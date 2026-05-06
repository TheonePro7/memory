"""Agent Scanner 抽象基类 + 19 个内置扫描器"""
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
        ...


# ─── 工具函数 ───────────────────────────────

def _check_path(*paths: str) -> Optional[str]:
    from pathlib import Path
    for p in paths:
        expanded = Path(p).expanduser()
        if expanded.exists():
            return str(expanded)
    return None


def _check_python_package(package: str) -> Optional[str]:
    import subprocess
    try:
        r = subprocess.run(
            ["pip", "list", "--format=columns"],
            capture_output=True, text=True, timeout=10,
        )
        for line in r.stdout.splitlines():
            parts = line.strip().split()
            if len(parts) >= 2 and parts[0].lower() == package.lower():
                return parts[1]
    except Exception:
        return None
    return None


# ─── AI 编码 IDE ────────────────────────────

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
        path = _check_path(
            "~/.cursor/mcp.json",
            "~/.config/cursor/mcp.json",
            "~/AppData/Roaming/Cursor/mcp.json",
        )
        return ScanResult(installed=path is not None, config_path=path)


class WindsurfScanner(AgentScanner):
    name = "windsurf"
    display_name = "Windsurf"
    category = "IDE"
    def detect(self) -> ScanResult:
        path = _check_path(
            "~/.windsurf/mcp.json",
            "~/.config/windsurf/mcp.json",
        )
        return ScanResult(installed=path is not None, config_path=path)


class TraeScanner(AgentScanner):
    name = "trae"
    display_name = "Trae"
    category = "IDE"
    def detect(self) -> ScanResult:
        path = _check_path(
            "~/.trae/mcp.json",
            "~/AppData/Local/Trae/mcp.json",
            "~/Library/Application Support/Trae/mcp.json",
        )
        return ScanResult(installed=path is not None, config_path=path)


class VSCodeScanner(AgentScanner):
    name = "vscode"
    display_name = "VS Code"
    category = "IDE"
    def detect(self) -> ScanResult:
        path = _check_path(
            "~/.vscode/mcp.json",
            "~/AppData/Roaming/Code/mcp.json",
        )
        return ScanResult(installed=path is not None, config_path=path)


class GithubCopilotScanner(AgentScanner):
    name = "github-copilot"
    display_name = "GitHub Copilot"
    category = "IDE"
    def detect(self) -> ScanResult:
        path = _check_path(
            "~/.vscode/mcp.json",
            "~/.github/copilot/mcp.json",
        )
        return ScanResult(installed=path is not None, config_path=path)


class ClineScanner(AgentScanner):
    name = "cline"
    display_name = "Cline"
    category = "IDE"
    def detect(self) -> ScanResult:
        path = _check_path(
            "~/.cline/config.json",
            "~/.config/cline/mcp.json",
        )
        return ScanResult(installed=path is not None, config_path=path)


class ContinueScanner(AgentScanner):
    name = "continue"
    display_name = "Continue.dev"
    category = "IDE"
    def detect(self) -> ScanResult:
        path = _check_path("~/.continue/config.json")
        return ScanResult(installed=path is not None, config_path=path)


# ─── 终端 AI Agent ──────────────────────────

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
        path = _check_path(
            "~/.openclaw/config.json",
            "~/.openclaw/config.yaml",
        )
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


# ─── AI 框架 ────────────────────────────────

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
        path = _check_path(
            "~/.dify/config.yaml",
            "~/.dify/config.json",
        )
        return ScanResult(installed=path is not None, config_path=path)


class MastraScanner(AgentScanner):
    name = "mastra"
    display_name = "Mastra"
    category = "framework"
    def detect(self) -> ScanResult:
        import shutil
        path = shutil.which("mastra")
        return ScanResult(installed=path is not None, config_path=path)


# ─── 注册表 ─────────────────────────────────

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
