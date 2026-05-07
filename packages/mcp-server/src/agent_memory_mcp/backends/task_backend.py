"""任务记忆后端 — SQLite 存储"""

import sqlite3
import uuid
import os
import json
import logging
from contextlib import closing
from pathlib import Path
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

SCHEMA = """
CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    source TEXT NOT NULL DEFAULT 'agent-memory',
    source_id TEXT,
    agent TEXT NOT NULL DEFAULT '',
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
    conn = sqlite3.connect(str(_get_db_path()), timeout=5)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


def _init_db() -> None:
    with closing(_get_conn()) as conn:
        conn.executescript(SCHEMA)
        conn.commit()
    _migrate()


def _migrate() -> None:
    """运行数据库迁移（新增列等）。"""
    with closing(_get_conn()) as conn:
        # 检查 agent 列是否存在
        cols = conn.execute("PRAGMA table_info(tasks)").fetchall()
        col_names = {c["name"] for c in cols}
        if "agent" not in col_names:
            conn.execute("ALTER TABLE tasks ADD COLUMN agent TEXT NOT NULL DEFAULT ''")
        # 确保已有 agent 数据不空
        conn.execute("UPDATE tasks SET agent='' WHERE agent IS NULL")
        conn.commit()


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _row_to_task(r: sqlite3.Row) -> dict:
    agent_val = r["agent"] if r["agent"] is not None else ""
    return {"id": r["id"], "source": r["source"], "source_id": r["source_id"],
            "agent": agent_val,
            "title": r["title"], "status": r["status"], "priority": r["priority"],
            "project_id": r["project_id"],
            "tags": r["tags"].split(",") if r["tags"] else [],
            "created_at": r["created_at"], "updated_at": r["updated_at"]}


# ── CRUD ──────────────────────────────────────────

def create_task(
    title: str,
    project_id: str = "default",
    priority: str = "medium",
    tags: list[str] | None = None,
    source: str = "agent-memory",
    source_id: str | None = None,
    agent: str = "",
) -> dict:
    _init_db()
    tid = str(uuid.uuid4())
    now = _now()
    with closing(_get_conn()) as conn:
        conn.execute(
            "INSERT INTO tasks (id, source, source_id, agent, title, status, priority, project_id, tags, created_at, updated_at) "
            "VALUES (?, ?, ?, ?, ?, 'todo', ?, ?, ?, ?, ?)",
            (tid, source, source_id, agent or "", title, priority, project_id,
             ",".join(tags) if tags else None, now, now),
        )
        conn.commit()
    return get_task(tid)


def get_task(task_id: str) -> dict | None:
    _init_db()
    with closing(_get_conn()) as conn:
        row = conn.execute("SELECT * FROM tasks WHERE id=?", (task_id,)).fetchone()
        if not row:
            return None
        events = conn.execute(
            "SELECT * FROM task_events WHERE task_id=? ORDER BY created_at", (task_id,)
        ).fetchall()
        artifacts = conn.execute(
            "SELECT * FROM task_artifacts WHERE task_id=? ORDER BY created_at", (task_id,)
        ).fetchall()
    agent_val = row["agent"] if row["agent"] is not None else ""
    return {
        "id": row["id"],
        "source": row["source"],
        "source_id": row["source_id"],
        "agent": agent_val,
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
    agent: str | None = None,
    limit: int = 50,
) -> list[dict]:
    _init_db()
    with closing(_get_conn()) as conn:
        where = "WHERE project_id=?"
        params = [project_id]
        if status:
            where += " AND status=?"
            params.append(status)
        if agent:
            where += " AND agent=?"
            params.append(agent)
        rows = conn.execute(
            f"SELECT * FROM tasks {where} ORDER BY updated_at DESC LIMIT ?",
            params + [limit],
        ).fetchall()
    return [_row_to_task(r) for r in rows]


def update_status(task_id: str, status: str) -> dict | None:
    _init_db()
    now = _now()
    with closing(_get_conn()) as conn:
        old = conn.execute("SELECT status FROM tasks WHERE id=?", (task_id,)).fetchone()
        if not old:
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
    return get_task(task_id)


def add_event(task_id: str, event_type: str, content: str) -> dict | None:
    _init_db()
    now = _now()
    with closing(_get_conn()) as conn:
        conn.execute(
            "UPDATE tasks SET updated_at=? WHERE id=?", (now, task_id),
        )
        conn.execute(
            "INSERT INTO task_events (task_id, type, content, created_at) VALUES (?, ?, ?, ?)",
            (task_id, event_type, content, now),
        )
        conn.commit()
    return get_task(task_id)


def add_artifact(task_id: str, kind: str, reference: str) -> dict | None:
    _init_db()
    now = _now()
    with closing(_get_conn()) as conn:
        conn.execute(
            "UPDATE tasks SET updated_at=? WHERE id=?", (now, task_id),
        )
        conn.execute(
            "INSERT INTO task_artifacts (task_id, kind, reference, created_at) VALUES (?, ?, ?, ?)",
            (task_id, kind, reference, now),
        )
        conn.commit()
    return get_task(task_id)


def get_active_tasks(project_id: str = "default", agent: str | None = None) -> list[dict]:
    """返回 in_progress 和 blocked 的任务，用于 session start 注入。"""
    _init_db()
    with closing(_get_conn()) as conn:
        if agent:
            rows = conn.execute(
                "SELECT * FROM tasks WHERE project_id=? AND agent=? AND status IN ('in_progress','blocked') ORDER BY updated_at DESC",
                (project_id, agent),
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM tasks WHERE project_id=? AND status IN ('in_progress','blocked') ORDER BY updated_at DESC",
                (project_id,),
            ).fetchall()
    return [_row_to_task(r) for r in rows]


def delete_task(task_id: str) -> bool:
    """删除任务及其关联的事件和产出物。返回是否删除成功。"""
    _init_db()
    with closing(_get_conn()) as conn:
        cur = conn.execute("SELECT id FROM tasks WHERE id=?", (task_id,))
        if not cur.fetchone():
            return False
        conn.execute("DELETE FROM task_events WHERE task_id=?", (task_id,))
        conn.execute("DELETE FROM task_artifacts WHERE task_id=?", (task_id,))
        conn.execute("DELETE FROM tasks WHERE id=?", (task_id,))
        conn.commit()
    return True


def update_task(
    task_id: str,
    title: str | None = None,
    priority: str | None = None,
    tags: list[str] | None = None,
    agent: str | None = None,
) -> dict | None:
    """更新任务字段（只更新非 None 字段）。"""
    _init_db()
    now = _now()
    updates: list[str] = []
    params: list = []
    if title is not None:
        updates.append("title=?")
        params.append(title)
    if priority is not None:
        updates.append("priority=?")
        params.append(priority)
    if tags is not None:
        updates.append("tags=?")
        params.append(",".join(tags))
    if agent is not None:
        updates.append("agent=?")
        params.append(agent)
    if not updates:
        return get_task(task_id)
    updates.append("updated_at=?")
    params.append(now)
    params.append(task_id)
    with closing(_get_conn()) as conn:
        old = conn.execute("SELECT title FROM tasks WHERE id=?", (task_id,)).fetchone()
        if not old:
            return None
        conn.execute(
            f"UPDATE tasks SET {', '.join(updates)} WHERE id=?",
            params,
        )
        if title is not None and title != old["title"]:
            conn.execute(
                "INSERT INTO task_events (task_id, type, content, created_at) VALUES (?, 'title_change', ?, ?)",
                (task_id, f"'{old['title']}' → '{title}'", now),
            )
        conn.commit()
    return get_task(task_id)


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
    synced = 0
    total = 0

    raw = beads_file.read_text(encoding="utf-8-sig")
    with closing(_get_conn()) as conn:
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
                        "INSERT INTO tasks (id, source, source_id, agent, title, status, priority, project_id, tags, created_at, updated_at) "
                        "VALUES (?, 'beads', ?, '', ?, ?, 'medium', ?, ?, ?, ?)",
                        (tid, str(source_id), title, status or "todo", project_id,
                         ",".join(tags) if isinstance(tags, list) else None, now, now),
                    )
                synced += 1
            except (json.JSONDecodeError, KeyError) as e:
                logger.warning("beads sync: skip invalid line: %s", e)
                continue

        conn.commit()
    return {"synced": synced, "total": total}


def list_agents_from_tasks(project_id: str = "default") -> list[str]:
    """返回 tasks 表中所有不重复的 agent 名称。"""
    _init_db()
    with closing(_get_conn()) as conn:
        rows = conn.execute(
            "SELECT DISTINCT agent FROM tasks WHERE project_id=? AND agent != '' ORDER BY agent",
            (project_id,),
        ).fetchall()
    return [r["agent"] for r in rows]


def clean_non_beads(project_id: str = "default") -> int:
    """删除所有 source != 'beads' 的任务，返回删除数量。"""
    _init_db()
    with closing(_get_conn()) as conn:
        conn.execute(
            "DELETE FROM task_events WHERE task_id IN (SELECT id FROM tasks WHERE project_id=? AND source != 'beads')",
            (project_id,),
        )
        conn.execute(
            "DELETE FROM task_artifacts WHERE task_id IN (SELECT id FROM tasks WHERE project_id=? AND source != 'beads')",
            (project_id,),
        )
        cur = conn.execute(
            "DELETE FROM tasks WHERE project_id=? AND source != 'beads'",
            (project_id,),
        )
        conn.commit()
    return cur.rowcount
