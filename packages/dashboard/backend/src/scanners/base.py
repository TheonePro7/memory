"""Agent Scanner 抽象基类 + 23 个内置扫描器

检测策略（按优先级）：
1. 二进制/可执行文件检测 (shutil.which) — 最确信
2. 安装目录/用户配置目录检测 — 较确信
3. MCP 配置文件检测 — 辅助判断
"""
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


def _check_binary(name: str) -> Optional[str]:
    import shutil
    path = shutil.which(name)
    return path


def _check_npm_package(name: str) -> Optional[str]:
    import subprocess
    try:
        r = subprocess.run(
            ["npm", "list", "-g", "--depth=0"],
            capture_output=True, text=True, timeout=10,
        )
        for line in r.stdout.splitlines():
            parts = line.strip().split()
            if len(parts) >= 2 and parts[0] == name:
                return parts[1].strip("()")
            if name in line:
                return "installed"
    except Exception:
        return None
    return None


def _check_dir_exists(*paths: str) -> Optional[str]:
    from pathlib import Path
    for p in paths:
        expanded = Path(p).expanduser()
        if expanded.is_dir():
            return str(expanded)
    return None


# ─── AI 编码 IDE ────────────────────────────

class CursorScanner(AgentScanner):
    name = "cursor"
    display_name = "Cursor"
    category = "IDE"
    def detect(self) -> ScanResult:
        # ① 可执行文件
        binary = _check_binary("cursor") or _check_binary("cursor.cmd")
        # ② 安装目录
        install_dir = _check_dir_exists(
            "~/AppData/Local/Programs/Cursor",
            "~/scoop/apps/cursor/current",
        )
        # ③ 用户配置目录
        config_dir = _check_dir_exists("~/AppData/Roaming/Cursor")
        # ④ MCP 配置
        mcp_path = _check_path(
            "~/AppData/Roaming/Cursor/mcp.json",
            "~/.cursor/mcp.json",
            "~/.config/cursor/mcp.json",
        )
        # ⑤ 项目级 MCP 配置（Cursor 特有的项目级 MCP 目录）
        project_mcp = _check_dir_exists("~/.cursor/projects")

        installed = bool(binary or install_dir or config_dir)
        detail_parts = []
        if binary: detail_parts.append(f"binary={binary}")
        if install_dir: detail_parts.append(f"dir={install_dir}")
        if config_dir: detail_parts.append("user_config_found")
        if mcp_path: detail_parts.append(f"mcp={mcp_path}")
        if project_mcp: detail_parts.append("project_mcps_found")

        return ScanResult(
            installed=installed,
            config_path=mcp_path or install_dir or binary,
            detail="; ".join(detail_parts) if detail_parts else "",
        )


class WindsurfScanner(AgentScanner):
    name = "windsurf"
    display_name = "Windsurf"
    category = "IDE"
    def detect(self) -> ScanResult:
        binary = _check_binary("windsurf") or _check_binary("windsurf.cmd")
        install_dir = _check_dir_exists(
            "~/AppData/Local/Programs/Windsurf",
            "~/scoop/apps/windsurf/current",
        )
        config_dir = _check_dir_exists("~/AppData/Roaming/Windsurf")
        codeium_dir = _check_dir_exists("~/.codeium/windsurf")
        mcp_path = _check_path("~/.windsurf/mcp.json", "~/.config/windsurf/mcp.json")
        windsurf_dir = _check_dir_exists("~/.windsurf")

        installed = bool(binary or install_dir or config_dir or codeium_dir)
        detail_parts = []
        if binary: detail_parts.append(f"binary={binary}")
        if install_dir: detail_parts.append(f"dir={install_dir}")
        if config_dir: detail_parts.append("user_config_found")
        if codeium_dir: detail_parts.append("codeium_data_found")
        if mcp_path: detail_parts.append(f"mcp={mcp_path}")
        if windsurf_dir: detail_parts.append("windsurf_dir_found")

        return ScanResult(
            installed=installed,
            config_path=mcp_path or str(codeium_dir or config_dir or ""),
            detail="; ".join(detail_parts) if detail_parts else "",
        )


class TraeScanner(AgentScanner):
    name = "trae"
    display_name = "Trae"
    category = "IDE"
    def detect(self) -> ScanResult:
        binary = _check_binary("trae") or _check_binary("trae.cmd")
        install_dir = _check_dir_exists(
            "~/AppData/Local/Trae",
            "~/AppData/Local/Programs/Trae",
        )
        config_dir = _check_dir_exists("~/AppData/Roaming/Trae")
        trae_dir = _check_dir_exists("~/.trae")
        mcp_path = _check_path(
            "~/AppData/Local/Trae/mcp.json",
            "~/AppData/Roaming/Trae/mcp.json",
        )
        # Trae 扩展级 MCP 配置
        ext_mcp = _check_path("~/.trae/extensions/*/.codemaker/mcp_settings.json")

        installed = bool(binary or install_dir or config_dir or trae_dir)
        detail_parts = []
        if binary: detail_parts.append(f"binary={binary}")
        if install_dir: detail_parts.append(f"dir={install_dir}")
        if config_dir: detail_parts.append("user_config_found")
        if trae_dir: detail_parts.append("trae_dir_found")
        if mcp_path: detail_parts.append(f"mcp={mcp_path}")
        if ext_mcp: detail_parts.append("ext_mcp_found")

        return ScanResult(
            installed=installed,
            config_path=mcp_path or str(trae_dir or config_dir or ""),
            detail="; ".join(detail_parts) if detail_parts else "",
        )


class VSCodeScanner(AgentScanner):
    name = "vscode"
    display_name = "VS Code"
    category = "IDE"
    def detect(self) -> ScanResult:
        binary = _check_binary("code") or _check_binary("code.cmd")
        install_dir = _check_dir_exists(
            "~/AppData/Local/Programs/Microsoft VS Code",
            "${ProgramFiles}/Microsoft VS Code",
            "${ProgramFiles(x86)}/Microsoft VS Code",
        )
        config_dir = _check_dir_exists("~/AppData/Roaming/Code")
        mcp_path = _check_path(
            "~/.vscode/mcp.json",
            "~/AppData/Roaming/Code/mcp.json",
        )

        installed = bool(binary or install_dir or config_dir)
        detail_parts = []
        if binary: detail_parts.append(f"binary={binary}")
        if install_dir: detail_parts.append(f"dir={install_dir}")
        if config_dir: detail_parts.append("user_config_found")
        if mcp_path: detail_parts.append(f"mcp={mcp_path}")

        return ScanResult(
            installed=installed,
            config_path=mcp_path or str(config_dir or install_dir or binary or ""),
            detail="; ".join(detail_parts) if detail_parts else "",
        )


class ClaudeCodeScanner(AgentScanner):
    name = "claude-code"
    display_name = "Claude Code"
    category = "IDE"
    def detect(self) -> ScanResult:
        binary = _check_binary("claude") or _check_binary("claude.exe")
        path = _check_path("~/.claude/settings.json")
        config_dir = _check_dir_exists("~/.claude")
        installed = bool(binary or path or config_dir)
        detail_parts = []
        if binary: detail_parts.append(f"binary={binary}")
        if path: detail_parts.append(f"config={path}")
        if config_dir: detail_parts.append("config_dir_found")
        return ScanResult(
            installed=installed,
            config_path=path or str(config_dir or ""),
            detail="; ".join(detail_parts) if detail_parts else "",
        )


class GithubCopilotScanner(AgentScanner):
    name = "github-copilot"
    display_name = "GitHub Copilot"
    category = "IDE"
    def detect(self) -> ScanResult:
        # Copilot 通常是 VS Code 扩展，检测扩展数据
        ext_dir = _check_dir_exists(
            "~/AppData/Roaming/Code/User/globalStorage/github.copilot-chat",
            "~/.vscode/extensions/github.copilot*",
            "~/.cursor/extensions/github.copilot*",
        )
        mcp_path = _check_path("~/.github/copilot/mcp.json")
        installed = bool(ext_dir or mcp_path)
        return ScanResult(
            installed=installed,
            config_path=mcp_path or str(ext_dir or ""),
            detail="copilot_extension_found" if ext_dir else ("mcp_found" if mcp_path else ""),
        )


class ClineScanner(AgentScanner):
    name = "cline"
    display_name = "Cline"
    category = "IDE"
    def detect(self) -> ScanResult:
        # Cline 是 VS Code/Cursor/Trae 扩展
        ext_dirs = _check_dir_exists(
            "~/.cursor/extensions/claude-dev*",
            "~/.cursor/extensions/saoudrizwan.claude-dev*",
            "~/AppData/Roaming/Code/User/globalStorage/saoudrizwan.claude-dev*",
            "~/.trae/extensions/saoudrizwan.claude-dev*",
            "~/.trae/extensions/claude-dev*",
        )
        mcp_path = _check_path(
            "~/.cline/config.json",
            "~/.config/cline/mcp.json",
        )
        installed = bool(ext_dirs or mcp_path)
        return ScanResult(
            installed=installed,
            config_path=mcp_path or str(ext_dirs or ""),
            detail="cline_extension_found" if ext_dirs else ("mcp_found" if mcp_path else ""),
        )


class RooCodeScanner(AgentScanner):
    name = "roo-code"
    display_name = "Roo Code"
    category = "IDE"
    def detect(self) -> ScanResult:
        ext_dirs = _check_dir_exists(
            "~/.cursor/extensions/rooveterinaryinc.roo-cline*",
            "~/.cursor/extensions/roo-cline*",
        )
        mcp_path = _check_path(
            "~/.roo/mcp.json",
            "~/.config/roo/mcp.json",
        )
        installed = bool(ext_dirs or mcp_path)
        return ScanResult(
            installed=installed,
            config_path=mcp_path or str(ext_dirs or ""),
            detail="roo_extension_found" if ext_dirs else ("mcp_found" if mcp_path else ""),
        )


class ContinueScanner(AgentScanner):
    name = "continue"
    display_name = "Continue.dev"
    category = "IDE"
    def detect(self) -> ScanResult:
        ext_dirs = _check_dir_exists(
            "~/AppData/Roaming/Code/User/globalStorage/continue.continue",
            "~/.continue",
        )
        mcp_path = _check_path("~/.continue/config.json")
        installed = bool(ext_dirs or mcp_path)
        return ScanResult(
            installed=installed,
            config_path=mcp_path or str(ext_dirs or ""),
            detail="continue_extension_found" if ext_dirs else ("mcp_found" if mcp_path else ""),
        )


# ─── 终端 AI Agent ──────────────────────────

class CodexCliScanner(AgentScanner):
    name = "codex-cli"
    display_name = "Codex CLI (OpenAI)"
    category = "terminal"
    def detect(self) -> ScanResult:
        binary = _check_binary("codex") or _check_binary("codex.exe")
        npm_pkg = _check_npm_package("@openai/codex")
        installed = bool(binary or npm_pkg)
        return ScanResult(
            installed=installed,
            config_path=binary,
            detail=f"binary={binary}" if binary else ("npm_installed" if npm_pkg else ""),
        )


class OpenClawScanner(AgentScanner):
    name = "openclaw"
    display_name = "OpenClaw"
    category = "terminal"
    def detect(self) -> ScanResult:
        binary = _check_binary("openclaw") or _check_binary("openclaw.cmd")
        config_path = _check_path(
            "~/.openclaw/openclaw.json",
            "~/.openclaw/config.json",
            "~/.openclaw/config.yaml",
        )
        config_dir = _check_dir_exists("~/.openclaw")
        installed = bool(binary or config_path or config_dir)
        detail_parts = []
        if binary: detail_parts.append(f"binary={binary}")
        if config_path: detail_parts.append(f"config={config_path}")
        if config_dir: detail_parts.append("config_dir_found")
        return ScanResult(
            installed=installed,
            config_path=config_path or binary,
            detail="; ".join(detail_parts) if detail_parts else "",
        )


class AiderScanner(AgentScanner):
    name = "aider"
    display_name = "Aider"
    category = "terminal"
    def detect(self) -> ScanResult:
        binary = _check_binary("aider") or _check_binary("aider.exe")
        ver = _check_python_package("aider-chat") or _check_python_package("aider")
        installed = bool(binary or ver)
        return ScanResult(
            installed=installed,
            version=ver or "",
            config_path=binary,
            detail=f"binary={binary}" if binary else (f"pip={ver}" if ver else ""),
        )


class GooseScanner(AgentScanner):
    name = "goose"
    display_name = "Goose (Block)"
    category = "terminal"
    def detect(self) -> ScanResult:
        binary = _check_binary("goose") or _check_binary("goose.exe")
        installed = binary is not None
        return ScanResult(installed=installed, config_path=binary)


class GeminiCliScanner(AgentScanner):
    name = "gemini-cli"
    display_name = "Gemini CLI (Google)"
    category = "terminal"
    def detect(self) -> ScanResult:
        ver = _check_python_package("google-genai")
        binary = _check_binary("gemini") or _check_binary("gemini.exe")
        installed = bool(binary or ver)
        return ScanResult(
            installed=installed,
            version=ver or "",
            config_path=binary,
            detail=f"binary={binary}" if binary else (f"pip={ver}" if ver else ""),
        )


class OpenCodeScanner(AgentScanner):
    name = "opencode"
    display_name = "OpenCode"
    category = "terminal"
    def detect(self) -> ScanResult:
        binary = _check_binary("opencode") or _check_binary("opencode.exe")
        mcp_path = _check_path("~/.opencode/config.json", "~/.opencode/mcp.json")
        config_dir = _check_dir_exists("~/.opencode")
        installed = bool(binary or mcp_path or config_dir)
        return ScanResult(
            installed=installed,
            config_path=mcp_path or binary or str(config_dir or ""),
            detail="binary_found" if binary else ("config_found" if mcp_path else ""),
        )


class ClaudeDesktopScanner(AgentScanner):
    name = "claude-desktop"
    display_name = "Claude Desktop"
    category = "terminal"
    def detect(self) -> ScanResult:
        binary = _check_binary("claude") or _check_binary("claude.exe")
        path = _check_path(
            "~/.claude/config.json",
            "~/AppData/Roaming/Claude/config.json",
        )
        config_dir = _check_dir_exists(
            "~/AppData/Roaming/Claude",
            "~/.claude",
        )
        installed = bool(binary or path or config_dir)
        return ScanResult(
            installed=installed,
            config_path=path or str(config_dir or ""),
            detail="mcp_config_found" if path else ("config_dir_found" if config_dir else ""),
        )


class TerminalClineScanner(AgentScanner):
    name = "terminal-cline"
    display_name = "Terminal Cline (tcm)"
    category = "terminal"
    def detect(self) -> ScanResult:
        binary = _check_binary("tcm") or _check_binary("tcm.exe")
        npm_pkg = _check_npm_package("@ethanavatar/tcm") or _check_npm_package("tcm")
        installed = bool(binary or npm_pkg)
        return ScanResult(
            installed=installed,
            config_path=binary,
            detail="npm_installed" if npm_pkg else ("binary_found" if binary else ""),
        )


# ─── AI 框架 ────────────────────────────────

class LangGraphScanner(AgentScanner):
    name = "langgraph"
    display_name = "LangGraph"
    category = "framework"
    def detect(self) -> ScanResult:
        ver = _check_python_package("langgraph")
        binary = _check_binary("langgraph") or _check_binary("langgraph.json")
        return ScanResult(
            installed=bool(ver or binary),
            version=ver or "",
            detail=f"pip={ver}" if ver else ("binary_found" if binary else ""),
        )


class CrewAIScanner(AgentScanner):
    name = "crewai"
    display_name = "CrewAI"
    category = "framework"
    def detect(self) -> ScanResult:
        ver = _check_python_package("crewai")
        return ScanResult(installed=ver is not None, version=ver or "")


class DifyScanner(AgentScanner):
    name = "dify"
    display_name = "Dify"
    category = "framework"
    def detect(self) -> ScanResult:
        config_path = _check_path(
            "~/.dify/config.yaml",
            "~/.dify/config.json",
        )
        config_dir = _check_dir_exists("~/.dify")
        binary = _check_binary("dify") or _check_binary("dify.exe")
        installed = bool(binary or config_path or config_dir)
        return ScanResult(
            installed=installed,
            config_path=config_path or str(config_dir or ""),
            detail="binary_found" if binary else ("config_found" if config_path else ""),
        )


class MastraScanner(AgentScanner):
    name = "mastra"
    display_name = "Mastra"
    category = "framework"
    def detect(self) -> ScanResult:
        binary = _check_binary("mastra") or _check_binary("mastra.exe")
        npm_pkg = _check_npm_package("mastra")
        config_dir = _check_dir_exists("~/mastra")
        installed = bool(binary or npm_pkg or config_dir)
        return ScanResult(
            installed=installed,
            config_path=binary or str(config_dir or ""),
            detail="npm_installed" if npm_pkg else ("binary_found" if binary else ""),
        )


class SmolAgentsScanner(AgentScanner):
    name = "smolagents"
    display_name = "SmolAgents (HuggingFace)"
    category = "framework"
    def detect(self) -> ScanResult:
        ver = _check_python_package("smolagents")
        return ScanResult(installed=ver is not None, version=ver or "")


class AutoGenScanner(AgentScanner):
    name = "autogen"
    display_name = "AutoGen (Microsoft)"
    category = "framework"
    def detect(self) -> ScanResult:
        ver = _check_python_package("pyautogen") or _check_python_package("autogen-agentchat")
        return ScanResult(installed=ver is not None, version=ver or "")


class AgnoScanner(AgentScanner):
    name = "agno"
    display_name = "Agno (Phidata)"
    category = "framework"
    def detect(self) -> ScanResult:
        ver = _check_python_package("agno") or _check_python_package("phidata")
        return ScanResult(installed=ver is not None, version=ver or "")


class GritScanner(AgentScanner):
    name = "grit"
    display_name = "Grit (Val Town)"
    category = "terminal"
    def detect(self) -> ScanResult:
        binary = _check_binary("grit") or _check_binary("grit.exe")
        npm_pkg = _check_npm_package("@valtown/grit") or _check_npm_package("grit")
        installed = bool(binary or npm_pkg)
        return ScanResult(
            installed=installed,
            config_path=binary,
            detail="npm_installed" if npm_pkg else ("binary_found" if binary else ""),
        )


# ─── 注册表 ─────────────────────────────────

BUILTIN_SCANNERS: list[AgentScanner] = [
    ClaudeCodeScanner(),
    CursorScanner(),
    WindsurfScanner(),
    TraeScanner(),
    VSCodeScanner(),
    GithubCopilotScanner(),
    ClineScanner(),
    RooCodeScanner(),
    ContinueScanner(),
    CodexCliScanner(),
    OpenClawScanner(),
    AiderScanner(),
    GooseScanner(),
    GeminiCliScanner(),
    OpenCodeScanner(),
    TerminalClineScanner(),
    ClaudeDesktopScanner(),
    LangGraphScanner(),
    CrewAIScanner(),
    DifyScanner(),
    MastraScanner(),
    SmolAgentsScanner(),
    AutoGenScanner(),
    AgnoScanner(),
    GritScanner(),
]
