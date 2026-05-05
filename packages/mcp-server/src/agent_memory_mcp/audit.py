"""审计日志"""

import json
from pathlib import Path
from datetime import datetime, timedelta


_AUDIT_DIR = Path.home() / ".agent-memory" / "audit"


def _ensure_dir():
    _AUDIT_DIR.mkdir(parents=True, exist_ok=True)


def log(action: str, **detail):
    _ensure_dir()
    today = datetime.now().strftime("%Y-%m-%d")
    path = _AUDIT_DIR / f"{today}.jsonl"
    entry = {"timestamp": datetime.now().isoformat(), "action": action, **detail}
    with open(path, "a", encoding="utf-8") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")


def query(days: int = 7) -> list[dict]:
    _ensure_dir()
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
