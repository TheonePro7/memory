"""任务记忆后端 — SQLite 存储"""

import sqlite3
import uuid
import os
import json
import logging
from pathlib import Path
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

SCHEMA = """
CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    source TEXT NOT NULL DEFAULT 'agent-memory',
    source_id TEXT,
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'todo',
    priority TEXT NOT NULL DEFAULT 'medium',
    project_id TEXT NOT NULL DEFAULT 'default',
    tags TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS task_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id TEXT NOT NULL,
    type TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (task_id) REFERENCES tasks(id)
);

CREATE TABLE IF NOT EXISTS task_artifacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id TEXT NOT NULL,
    kind TEXT NOT NULL,
    reference TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (task_id) REFERENCES tasks(id)
);

CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_events_task ON task_events(task_id);
CREATE INDEX IF NOT EXISTS idx_artifacts_task ON task_artifacts(task_id);
"""


def _get_db_path() -> Path:
    env = os.environ.get("AGENT_MEMORY_DIR")
    if env:
        base = Path(env)
    else:
        base = Path.home() / ".agent-memory"
    base.mkdir(parents=True, exist_ok=True)
    return base / "tasks.db"


def _get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(str(_get_db_path()))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


def _init_db():
    conn = _get_conn()
    conn.executescript(SCHEMA)
    conn.commit()
    conn.close()


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


# ── CRUD ──────────────────────────────────────────

def create_task(
    title: str,
    project_id: str = "default",
    priority: str = "medium",
    tags: list[str] | None = None,
    source: str = "agent-memory",
    source_id: str | None = None,
) -> dict:
    _init_db()
    tid = str(uuid.uuid4())
    now = _now()
    conn = _get_conn()
    conn.execute(
        "INSERT INTO tasks (id, source, source_id, title, status, priority, project_id, tags, created_at, updated_at) "
        "VALUES (?, ?, ?, ?, 'todo', ?, ?, ?, ?, ?)",
        (tid, source, source_id, title, priority, project_id,
         ",".join(tags) if tags else None, now, now),
    )
    conn.commit()
    conn.close()
    return get_task(tid)


def get_task(task_id: str) -> dict | None:
    _init_db()
    conn = _get_conn()
    row = conn.execute("SELECT * FROM tasks WHERE id=?", (task_id,)).fetchone()
    if not row:
        conn.close()
        return None
    events = conn.execute(
        "SELECT * FROM task_events WHERE task_id=? ORDER BY created_at", (task_id,)
    ).fetchall()
    artifacts = conn.execute(
        "SELECT * FROM task_artifacts WHERE task_id=? ORDER BY created_at", (task_id,)
    ).fetchall()
    conn.close()
    return {
        "id": row["id"],
        "source": row["source"],
        "source_id": row["source_id"],
        "title": row["title"],
        "status": row["status"],
        "priority": row["priority"],
        "project_id": row["project_id"],
        "tags": row["tags"].split(",") if row["tags"] else [],
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
        "events": [dict(e) for e in events],
        "artifacts": [dict(a) for a in artifacts],
    }


def list_tasks(
    project_id: str = "default",
    status: str | None = None,
    limit: int = 50,
) -> list[dict]:
    _init_db()
    conn = _get_conn()
    where = "WHERE project_id=?"
    params = [project_id]
    if status:
        where += " AND status=?"
        params.append(status)
    rows = conn.execute(
        f"SELECT * FROM tasks {where} ORDER BY updated_at DESC LIMIT ?",
        params + [limit],
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def update_status(task_id: str, status: str) -> dict | None:
    _init_db()
    now = _now()
    conn = _get_conn()
    old = conn.execute("SELECT status FROM tasks WHERE id=?", (task_id,)).fetchone()
    if not old:
        conn.close()
        return None
    conn.execute(
        "UPDATE tasks SET status=?, updated_at=? WHERE id=?",
        (status, now, task_id),
    )
    conn.execute(
        "INSERT INTO task_events (task_id, type, content, created_at) VALUES (?, 'status_change', ?, ?)",
        (task_id, f"{old['status']} → {status}", now),
    )
    conn.commit()
    conn.close()
    return get_task(task_id)


def add_event(task_id: str, event_type: str, content: str) -> dict | None:
    _init_db()
    now = _now()
    conn = _get_conn()
    conn.execute(
        "UPDATE tasks SET updated_at=? WHERE id=?", (now, task_id),
    )
    conn.execute(
        "INSERT INTO task_events (task_id, type, content, created_at) VALUES (?, ?, ?, ?)",
        (task_id, event_type, content, now),
    )
    conn.commit()
    conn.close()
    return get_task(task_id)


def add_artifact(task_id: str, kind: str, reference: str) -> dict | None:
    _init_db()
    now = _now()
    conn = _get_conn()
    conn.execute(
        "UPDATE tasks SET updated_at=? WHERE id=?", (now, task_id),
    )
    conn.execute(
        "INSERT INTO task_artifacts (task_id, kind, reference, created_at) VALUES (?, ?, ?, ?)",
        (task_id, kind, reference, now),
    )
    conn.commit()
    conn.close()
    return get_task(task_id)


def get_active_tasks(project_id: str = "default") -> list[dict]:
    """返回 in_progress 和 blocked 的任务，用于 session start 注入。"""
    _init_db()
    conn = _get_conn()
    rows = conn.execute(
        "SELECT * FROM tasks WHERE project_id=? AND status IN ('in_progress','blocked') ORDER BY updated_at DESC",
        (project_id,),
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


# ── beads 同步 ─────────────────────────────────────

STATUS_MAP = {
    "open": "todo",
    "in_progress": "in_progress",
    "done": "done",
    "closed": "done",
    "cancelled": "done",
}


def detect_beads(project_path: str | Path = ".") -> Path | None:
    """检测项目目录下是否有 beads 数据文件。"""
    p = Path(project_path).resolve()
    candidates = [
        p / ".beads" / "issues.jsonl",
        p / ".beads" / "issues.json",
    ]
    for c in candidates:
        if c.exists():
            return c
    return None


def sync_beads(project_id: str, project_path: str | Path = ".") -> dict:
    """增量同步 beads issues 到 SQLite。返回同步统计。"""
    beads_file = detect_beads(project_path)
    if not beads_file:
        return {"synced": 0, "total": 0, "error": "no beads file found"}

    _init_db()
    conn = _get_conn()
    synced = 0
    total = 0

    raw = beads_file.read_text(encoding="utf-8-sig")
    for line in raw.strip().split("\n"):
        line = line.strip()
        if not line:
            continue
        try:
            issue = json.loads(line)
            total += 1
            source_id = issue.get("id") or str(issue.get("number", ""))
            if not source_id:
                continue

            existing = conn.execute(
                "SELECT id, status FROM tasks WHERE source='beads' AND source_id=? AND project_id=?",
                (str(source_id), project_id),
            ).fetchone()

            title = issue.get("title", issue.get("description", "untitled"))
            status = STATUS_MAP.get(issue.get("status", ""), "todo")
            tags = issue.get("tags", [])

            if existing:
                if existing["status"] != status:
                    now = _now()
                    conn.execute(
                        "UPDATE tasks SET status=?, updated_at=? WHERE id=?",
                        (status, now, existing["id"]),
                    )
                    conn.execute(
                        "INSERT INTO task_events (task_id, type, content, created_at) "
                        "VALUES (?, 'status_change', ?, ?)",
                        (existing["id"], f"{existing['status']} → {status}", now),
                    )
            else:
                tid = str(uuid.uuid4())
                now = _now()
                conn.execute(
                    "INSERT INTO tasks (id, source, source_id, title, status, priority, project_id, tags, created_at, updated_at) "
                    "VALUES (?, 'beads', ?, ?, 'todo', 'medium', ?, ?, ?, ?)",
                    (tid, str(source_id), title, project_id,
                     ",".join(tags) if isinstance(tags, list) else None, now, now),
                )
                if status != "todo":
                    conn.execute(
                        "UPDATE tasks SET status=?, updated_at=? WHERE id=?",
                        (status, now, tid),
                    )
                    conn.execute(
                        "INSERT INTO task_events (task_id, type, content, created_at) "
                        "VALUES (?, 'status_change', ?, ?)",
                        (tid, f"beads init: todo → {status}", now),
                    )
            synced += 1
        except (json.JSONDecodeError, KeyError) as e:
            logger.warning("beads sync: skip invalid line: %s", e)
            continue

    conn.commit()
    conn.close()
    return {"synced": synced, "total": total}
