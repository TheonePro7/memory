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
