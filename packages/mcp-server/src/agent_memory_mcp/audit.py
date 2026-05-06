"""审计日志"""

import json
from pathlib import Path
from datetime import datetime, timedelta

_MAX_LOG_BYTES = 10 * 1024 * 1024  # 10 MB
_MAX_RETENTION_DAYS = 90


_AUDIT_DIR = Path.home() / ".agent-memory" / "audit"


def _ensure_dir() -> None:
    _AUDIT_DIR.mkdir(parents=True, exist_ok=True)


def _rotate_if_needed(path: Path) -> None:
    if path.exists() and path.stat().st_size > _MAX_LOG_BYTES:
        rotated = path.with_suffix(f".{datetime.now().strftime('%H%M%S')}.jsonl")
        path.rename(rotated)


def _cleanup_old() -> None:
    cutoff = datetime.now() - timedelta(days=_MAX_RETENTION_DAYS)
    for f in _AUDIT_DIR.glob("*.jsonl*"):
        stem = f.stem.split(".")[0] if "." in f.stem else f.stem
        try:
            fdate = datetime.strptime(stem, "%Y-%m-%d")
            if fdate < cutoff:
                f.unlink()
        except (ValueError, IndexError):
            pass


def log(action: str, **detail: str | int | bool | list[str]) -> None:
    _ensure_dir()
    today = datetime.now().strftime("%Y-%m-%d")
    path = _AUDIT_DIR / f"{today}.jsonl"
    _rotate_if_needed(path)
    entry = {"timestamp": datetime.now().isoformat(), "action": action, **detail}
    with open(path, "a", encoding="utf-8") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")


def query(days: int = 7) -> list[dict]:
    _ensure_dir()
    _cleanup_old()
    entries = []
    for i in range(days):
        date = (datetime.now() - timedelta(days=i)).strftime("%Y-%m-%d")
        path = _AUDIT_DIR / f"{date}.jsonl"
        if path.exists():
            with open(path, encoding="utf-8") as f:
                for line in f:
                    if line.strip():
                        entries.append(json.loads(line))
    return entries
