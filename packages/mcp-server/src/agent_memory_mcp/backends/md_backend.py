"""Markdown 时间线日志后端"""

from pathlib import Path
from datetime import datetime, timedelta
import re

# 无意义内容的过滤模式
_NOISE_PATTERNS: list[re.Pattern] = [
    re.compile(r"^(摘要A|摘要B|摘要C|摘要D|摘要E)$"),
    re.compile(r"^#\s*测试摘要"),
    re.compile(r"^测试内容"),
    re.compile(r"这是测试"),
    re.compile(r"^[#]*\s*测试"),
    re.compile(r"^test\s*content"),
    re.compile(r"^[#]*\s*test\s+summary"),
]


def _is_noise_line(line: str) -> bool:
    """检查某行是否为测试/无意义内容。"""
    stripped = line.strip().rstrip("—\\-")
    if not stripped or stripped in ("---", "---"):
        return True
    for pat in _NOISE_PATTERNS:
        if pat.match(stripped):
            return True
    return False


def _is_empty_block(block: str) -> bool:
    """检查会话块是否只有标题没有实际内容。"""
    lines = [l.strip() for l in block.strip().split("\n") if l.strip()]
    # 去掉标题行和分隔符后，如果没剩几行就算空块
    meaningful = [l for l in lines if not l.startswith("## ") and l != "---"]
    return len(meaningful) < 1


def _filter_content(content: str) -> str:
    """过滤掉无意义的测试内容行。"""
    lines = content.split("\n")
    cleaned = [l for l in lines if not _is_noise_line(l)]
    # 去除连续的空行
    result: list[str] = []
    prev_empty = False
    for l in cleaned:
        if not l.strip():
            if prev_empty:
                continue
            prev_empty = True
        else:
            prev_empty = False
        result.append(l)
    return "\n".join(result).strip()


def _extract_sessions(content: str) -> list[dict]:
    """将会话内容分割为独立的会话块，并提取元信息。"""
    # 会话按 ## 标题分割
    blocks = re.split(r"\n(?=##\s)", content)
    sessions: list[dict] = []
    for block in blocks:
        block = block.strip()
        if not block or _is_noise_line(block) or _is_empty_block(block):
            continue
        # 提取标题行
        title_match = re.match(r"##\s+(.+)", block)
        title = title_match.group(1) if title_match else ""
        # 从标题中的括号尝试提取 Agent/项目名
        agent = ""
        project = ""
        if "(" in title and ")" in title:
            paren = title.split("(")[-1].rstrip(")")
            if "/" in paren:
                parts = paren.split("/")
                project = parts[0].strip()
                agent = parts[1].strip() if len(parts) > 1 else ""
            else:
                agent = paren.strip()
        # 检查是否有结构化标记
        tags: list[str] = []
        if "【任务】" in block:
            tags.append("task")
        if "【决策】" in block:
            tags.append("decision")
        if "【配置】" in block:
            tags.append("config")
        if block.strip().startswith("# "):
            tags.append("summary")
        sessions.append({
            "title": title,
            "content": block,
            "agent": agent or "",
            "project": project or "",
            "tags": tags,
        })
    return sessions


def _get_memory_dir() -> Path:
    p = Path.home() / ".agent-memory" / "sessions"
    p.mkdir(parents=True, exist_ok=True)
    return p


def append_summary(summary: str, title: str = "") -> str:
    memory_dir = _get_memory_dir()
    path = memory_dir / f"{datetime.now().strftime('%Y-%m-%d')}.md"
    ts = datetime.now().strftime("%H:%M")
    block = (
        f"\n## {title or f'会话 {ts}'}\n\n"
        f"{summary}\n\n---\n"
    )
    with open(path, "a", encoding="utf-8") as f:
        f.write(block)
    return str(path)


def get_recent(days: int = 7) -> list[dict]:
    memory_dir = _get_memory_dir()
    results = []
    for i in range(days):
        date = datetime.now() - timedelta(days=i)
        path = memory_dir / f"{date.strftime('%Y-%m-%d')}.md"
        if path.exists():
            raw = path.read_text(encoding="utf-8")
            filtered = _filter_content(raw)
            if not filtered:
                continue
            sessions = _extract_sessions(filtered)
            if not sessions:
                continue  # 全是空会话，跳过该日期
            all_tags: set[str] = set()
            agent_projects: set[str] = set()
            for s in sessions:
                all_tags.update(s["tags"])
                if s["agent"] and s["project"]:
                    agent_projects.add(f"{s['project']}/{s['agent']}")
                elif s["agent"]:
                    agent_projects.add(s["agent"])
            results.append({
                "date": date.strftime("%Y-%m-%d"),
                "path": str(path),
                "content": filtered,
                "sessions": sessions,
                "session_count": len(sessions),
                "tags": list(all_tags),
                "sources": list(agent_projects),
            })
    return results


def delete_session(date: str) -> bool:
    """删除指定日期的会话文件。"""
    memory_dir = _get_memory_dir()
    path = memory_dir / f"{date}.md"
    if path.exists():
        path.unlink()
        return True
    return False


def grep(query: str, days: int = 30) -> list[dict]:
    memory_dir = _get_memory_dir()
    results = []
    for i in range(days):
        date = datetime.now() - timedelta(days=i)
        path = memory_dir / f"{date.strftime('%Y-%m-%d')}.md"
        if path.exists():
            content = path.read_text(encoding="utf-8")
            if query.lower() in content.lower():
                lines = [l.strip() for l in content.split("\n")
                         if query.lower() in l.lower()]
                lines = [l for l in lines if not _is_noise_line(l)]
                if lines:
                    results.append({
                        "date": date.strftime("%Y-%m-%d"),
                        "path": str(path),
                        "matches": lines[:5],
                    })
    return results
