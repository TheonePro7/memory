"""Markdown 时间线日志后端"""

from pathlib import Path
from datetime import datetime, timedelta


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
            results.append({
                "date": date.strftime("%Y-%m-%d"),
                "path": str(path),
                "content": path.read_text(encoding="utf-8"),
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
                results.append({
                    "date": date.strftime("%Y-%m-%d"),
                    "path": str(path),
                    "matches": lines[:5],
                })
    return results
