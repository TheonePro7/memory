# v0.3 任务记忆 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** 新增独立的任务记忆系统，自动同步 beads、记录决策/阻塞/产出物，Agent 自动感知任务上下文

**Architecture:** SQLite 独立存储（tasks/task_events/task_artifacts），session start 时增量同步 beads，summarize 时自动提取任务事件。Dashboard 新增看板视图。

**Tech Stack:** Python sqlite3（内置）、beads `.jsonl` 解析

---

### Task 1: 创建 task_backend.py — SQLite 核心操作

**Files:**
- Create: `packages/mcp-server/src/backends/task_backend.py`

- [ ] **Step 1: 创建 task_backend.py**

```python
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
```

- [ ] **Step 2: 验证模块可导入**

Run: `python -c "import sys; sys.path.insert(0,'packages/mcp-server/src'); from backends.task_backend import create_task, list_tasks, update_status, get_task; print('ok')"`

Expected: `ok`

- [ ] **Step 3: 验证基本 CRUD**

Run:
```python
python -c "
import sys; sys.path.insert(0,'packages/mcp-server/src')
from backends.task_backend import create_task, list_tasks, update_status, add_event, add_artifact, get_task
t = create_task('测试任务', project_id='test')
print('created:', t['id'][:8])
t2 = update_status(t['id'], 'in_progress')
print('status:', t2['status'])
add_event(t['id'], 'decision', '改用 JWT')
add_artifact(t['id'], 'commit', 'abc1234')
full = get_task(t['id'])
print('events:', len(full['events']), 'artifacts:', len(full['artifacts']))
tasks = list_tasks(project_id='test')
print('total tasks:', len(tasks))
"
```

Expected: created/status/events/artifacts 都正确输出

- [ ] **Step 4: 提交**

```bash
git add packages/mcp-server/src/backends/task_backend.py
git commit -m "feat: add task memory backend with SQLite CRUD"
```

---

### Task 2: beads 同步逻辑

**Files:**
- Modify: `packages/mcp-server/src/backends/task_backend.py`（追加同步函数）

- [ ] **Step 1: 追加 beads 同步函数**

在 task_backend.py 末尾添加：

```python
# ── beads 同步 ─────────────────────────────────────

BEADS_FILE = ".beads" / Path("issues.jsonl")
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

    for line in beads_file.read_text(encoding="utf-8").strip().split("\n"):
        line = line.strip()
        if not line:
            continue
        try:
            issue = json.loads(line)
            total += 1
            source_id = issue.get("id") or str(issue.get("number", ""))
            if not source_id:
                continue

            # 检查是否已同步
            existing = conn.execute(
                "SELECT id, status FROM tasks WHERE source='beads' AND source_id=? AND project_id=?",
                (str(source_id), project_id),
            ).fetchone()

            title = issue.get("title", issue.get("description", "untitled"))
            status = STATUS_MAP.get(issue.get("status", ""), "todo")
            tags = issue.get("tags", [])

            if existing:
                # 增量：仅状态变化时追加事件
                if existing["status"] != status:
                    now = _now()
                    conn.execute(
                        "UPDATE tasks SET status=?, updated_at=? WHERE id=?",
                        (status, now, existing["id"]),
                    )
                    conn.execute(
                        "INSERT INTO task_events (task_id, type, content, created_at) VALUES (?, 'status_change', ?, ?)",
                        (existing["id"], f"{existing['status']} → {status}", now),
                    )
            else:
                create_task(
                    title=title,
                    project_id=project_id,
                    tags=tags if isinstance(tags, list) else None,
                    source="beads",
                    source_id=str(source_id),
                )
                # 创建后立即更新为 beads 的状态
                if status != "todo":
                    tid = conn.execute(
                        "SELECT id FROM tasks WHERE source='beads' AND source_id=? AND project_id=?",
                        (str(source_id), project_id),
                    ).fetchone()["id"]
                    now = _now()
                    conn.execute(
                        "UPDATE tasks SET status=?, updated_at=? WHERE id=?",
                        (status, now, tid),
                    )
                    conn.execute(
                        "INSERT INTO task_events (task_id, type, content, created_at) VALUES (?, 'status_change', ?, ?)",
                        (tid, f"beads init: todo → {status}", now),
                    )
            synced += 1
        except (json.JSONDecodeError, KeyError) as e:
            logger.warning("beads sync: skip invalid line: %s", e)
            continue

    conn.commit()
    conn.close()
    return {"synced": synced, "total": total}
```

- [ ] **Step 2: 验证 beads 同步**

创建测试 beads 文件：
```bash
mkdir -p /tmp/test-beads/.beads
cat > /tmp/test-beads/.beads/issues.jsonl << 'EOF'
{"id":"1","title":"修复登录页","status":"in_progress","tags":["bug"]}
{"id":"2","title":"添加测试","status":"done","tags":["test"]}
EOF
```

运行测试：
```python
python -c "
import sys, os; sys.path.insert(0,'packages/mcp-server/src')
os.chdir('/tmp/test-beads')
from backends.task_backend import sync_beads, list_tasks, get_task
result = sync_beads('test-proj')
print('sync:', result)
tasks = list_tasks(project_id='test-proj')
for t in tasks:
    print(f'  [{t[\"status\"]}] {t[\"title\"]} (source: {t[\"source\"]})')
"
```

Expected: sync 2 tasks, status correct, source = "beads"

- [ ] **Step 3: 提交**

```bash
git add packages/mcp-server/src/backends/task_backend.py
git commit -m "feat: add beads sync to task backend"
```

---

### Task 3: CLI — task 子命令

**Files:**
- Modify: `packages/python-cli/src/main.py`

- [ ] **Step 1: 添加 task 子命令处理**

在 `cmd_summarize()` 定义之后添加：

```python
def cmd_task():
    """task 子命令: agent-memory task list|show|start|done|block"""
    if len(sys.argv) < 3:
        _print_task_usage()
        sys.exit(1)
    sub = sys.argv[2]
    from backends.task_backend import (
        create_task, list_tasks, get_task,
        update_status, add_event, add_artifact,
        sync_beads, get_active_tasks, detect_beads,
    )
    pid = _detect_project_id()

    if sub == "list":
        status = None
        if "--status" in sys.argv:
            idx = sys.argv.index("--status")
            if idx + 1 < len(sys.argv):
                status = sys.argv[idx + 1]
        tasks = list_tasks(project_id=pid, status=status)
        if not tasks:
            print("没有任务")
            return
        for t in tasks:
            src = "B" if t["source"] == "beads" else "M"
            print(f"  [{t['status']:12}] {src} {t['id'][:8]} {t['title']}")
        print(f"\n共 {len(tasks)} 个任务")

    elif sub == "show":
        if len(sys.argv) < 4:
            print("用法: agent-memory task show <id>", file=sys.stderr)
            sys.exit(1)
        t = get_task(sys.argv[3])
        if not t:
            print("任务不存在")
            return
        src_label = "beads" if t["source"] == "beads" else "agent-memory"
        print(f"标题:   {t['title']}")
        print(f"状态:   {t['status']}")
        print(f"来源:   {src_label}")
        print(f"标签:   {', '.join(t['tags']) if t['tags'] else '-'}")
        if t["events"]:
            print(f"\n事件 ({len(t['events'])}):")
            for e in t["events"]:
                print(f"  [{e['type']}] {e['content']}  ({e['created_at'][:16]})")
        if t["artifacts"]:
            print(f"\n产出物 ({len(t['artifacts'])}):")
            for a in t["artifacts"]:
                print(f"  {a['kind']}: {a['reference']}")

    elif sub == "start":
        if len(sys.argv) < 4:
            print("用法: agent-memory task start <标题>", file=sys.stderr)
            sys.exit(1)
        title = sys.argv[3]
        t = create_task(title=title, project_id=pid)
        update_status(t["id"], "in_progress")
        print(f"任务已创建并开始: {t['id'][:8]} {title}")

    elif sub == "done":
        if len(sys.argv) < 4:
            # 查找当前 in_progress 任务
            active = get_active_tasks(project_id=pid)
            if not active:
                print("没有进行中的任务", file=sys.stderr)
                sys.exit(1)
            t = active[0]
        else:
            t = get_task(sys.argv[3])
        if not t:
            print("任务不存在", file=sys.stderr)
            sys.exit(1)
        update_status(t["id"], "done")
        print(f"任务已完成: {t['title']}")

    elif sub == "block":
        if len(sys.argv) < 5:
            print("用法: agent-memory task block <id> <原因>", file=sys.stderr)
            sys.exit(1)
        tid = sys.argv[3]
        reason = sys.argv[4]
        update_status(tid, "blocked")
        add_event(tid, "blocker", reason)
        print(f"任务已阻塞: {reason}")

    else:
        _print_task_usage()


def _print_task_usage():
    print("用法: agent-memory task list|show|start|done|block", file=sys.stderr)
    print("  list                   列出任务", file=sys.stderr)
    print("  show <id>              任务详情", file=sys.stderr)
    print("  start <标题>            开始新任务", file=sys.stderr)
    print("  done [id]              完成任务（无id则完成当前活跃任务）", file=sys.stderr)
    print("  block <id> <原因>       阻塞任务", file=sys.stderr)
```

- [ ] **Step 2: 在 `main()` 中添加 task 路由**

```python
def main():
    if len(sys.argv) < 2:
        print("Usage: agent-memory remember|recall|summarize|task", file=sys.stderr)
        sys.exit(1)
    cmd = sys.argv[1]
    if cmd == "remember":
        cmd_remember()
    elif cmd == "recall":
        cmd_recall()
    elif cmd == "summarize":
        cmd_summarize()
    elif cmd == "task":
        cmd_task()
    else:
        print(f"Unknown command: {cmd}", file=sys.stderr)
        sys.exit(1)
```

- [ ] **Step 3: 增强 cmd_recall — 同步 beads + 返回活跃任务**

```python
def cmd_recall():
    project_id = _detect_project_id()
    process = "--process" in sys.argv

    results = mem0_backend.search("当前项目上下文", project_id=project_id, limit=10)
    recent = md_backend.get_recent(days=3)

    if process and results:
        from processor import rerank
        reranked = rerank("当前项目上下文", results, top_n=5)
        if reranked:
            results = reranked

    # 同步 beads + 获取活跃任务
    from backends.task_backend import sync_beads, get_active_tasks
    sync_beads(project_id)
    active_tasks = get_active_tasks(project_id=project_id)

    output = {
        "mem0": results,
        "recent_sessions": recent,
        "active_tasks": active_tasks,
    }
    tmp = Path.home() / ".agent-memory" / "context.json"
    tmp.parent.mkdir(parents=True, exist_ok=True)
    tmp.write_text(json.dumps(output, ensure_ascii=False, indent=2))
    print(f"Context written to {tmp}")
    if active_tasks:
        for t in active_tasks:
            print(f"  活跃: [{t['status']}] {t['title']}")
```

- [ ] **Step 4: 验证 CLI 命令**

Run:
```bash
python packages/python-cli/src/main.py task list
python packages/python-cli/src/main.py task start "测试新任务"
python packages/python-cli/src/main.py task list
python packages/python-cli/src/main.py task done
python packages/python-cli/src/main.py recall
```

Expected: 所有命令无报错，输出合理

- [ ] **Step 5: 提交**

```bash
git add packages/python-cli/src/main.py
git commit -m "feat: add task CLI commands and enhanced recall with active tasks"
```

---

### Task 4: MCP — task_context 工具

**Files:**
- Modify: `packages/mcp-server/src/server.py`

- [ ] **Step 1: 添加 task_context MCP 工具**

```python
@mcp.tool()
def task_context(project_id: str | None = None) -> dict:
    """返回当前项目的任务概览（活跃任务 + 最近完成）。

    Args:
        project_id: 项目标识符，不传则自动检测
    """
    from backends.task_backend import get_active_tasks, list_tasks, sync_beads
    from pathlib import Path

    pid = project_id or Path.cwd().name
    sync_beads(pid)
    active = get_active_tasks(project_id=pid)
    recent = list_tasks(project_id=pid, limit=5)
    return {
        "active_tasks": active,
        "recent_tasks": recent,
        "total": len(recent),
    }
```

- [ ] **Step 2: 更新 audit.log 调用适配新参数（如果有）**

```python
# audit.log 调用不需要改，task_context 不走 audit
```

- [ ] **Step 3: 提交**

```bash
git add packages/mcp-server/src/server.py
git commit -m "feat: add task_context MCP tool"
```

---

### Task 5: Dashboard API — 任务路由

**Files:**
- Create: `packages/dashboard/backend/src/routers/tasks.py`
- Modify: `packages/dashboard/backend/src/main.py`

- [ ] **Step 1: 创建 tasks.py 路由**

```python
"""任务 API"""

from fastapi import APIRouter
from backends import task_backend

router = APIRouter(tags=["tasks"])


@router.get("/tasks")
def list_tasks(project_id: str = "default", status: str | None = None):
    tasks = task_backend.list_tasks(project_id=project_id, status=status)
    return {"tasks": tasks, "total": len(tasks)}


@router.get("/tasks/active")
def get_active_tasks(project_id: str = "default"):
    tasks = task_backend.get_active_tasks(project_id=project_id)
    return {"tasks": tasks, "total": len(tasks)}


@router.get("/tasks/{task_id}")
def get_task(task_id: str):
    t = task_backend.get_task(task_id)
    if not t:
        return {"error": "not found"}, 404
    return t


@router.post("/tasks")
def create_task(title: str, project_id: str = "default", priority: str = "medium"):
    t = task_backend.create_task(title=title, project_id=project_id, priority=priority)
    return t


@router.post("/tasks/{task_id}/status")
def update_task_status(task_id: str, status: str):
    t = task_backend.update_status(task_id, status)
    if not t:
        return {"error": "not found"}, 404
    return t


@router.post("/tasks/{task_id}/events")
def add_task_event(task_id: str, type: str, content: str):
    t = task_backend.add_event(task_id, type, content)
    if not t:
        return {"error": "not found"}, 404
    return t


@router.post("/tasks/sync-beads")
def sync_beads(project_id: str = "default"):
    import os
    result = task_backend.sync_beads(project_id, project_path=os.getcwd())
    return result
```

- [ ] **Step 2: 注册路由到 main.py**

```python
from routers import memories, sessions, stats, tasks

app.include_router(memories.router, prefix="/api")
app.include_router(sessions.router, prefix="/api")
app.include_router(stats.router, prefix="/api")
app.include_router(tasks.router, prefix="/api")
```

- [ ] **Step 3: 提交**

```bash
git add packages/dashboard/backend/src/routers/tasks.py packages/dashboard/backend/src/main.py
git commit -m "feat: add task API endpoints"
```

---

### Task 6: Dashboard 前端 — 任务页面

**Files:**
- Create: `packages/dashboard/frontend/src/pages/Tasks.tsx`
- Modify: `packages/dashboard/frontend/src/App.tsx`

- [ ] **Step 1: 创建 Tasks.tsx 页面组件**

```tsx
import React, { useEffect, useState } from "react";
import { Typography, Table, Tag, Select, Card, Row, Col, Statistic, Button, Modal, Input, message } from "antd";
import { CheckCircleOutlined, ClockCircleOutlined, ExclamationCircleOutlined, InboxOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  source: string;
  tags: string[];
  events?: { type: string; content: string; created_at: string }[];
  artifacts?: { kind: string; reference: string }[];
  created_at: string;
}

export default function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const fetchTasks = (status?: string) => {
    setLoading(true);
    let url = "/api/tasks";
    if (status) url += `?status=${status}`;
    fetch(url)
      .then((r) => r.json())
      .then((data) => setTasks(data.tasks || []))
      .catch(() => setTasks([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchTasks(statusFilter); }, []);

  const statusCounts = {
    todo: tasks.filter((t) => t.status === "todo").length,
    in_progress: tasks.filter((t) => t.status === "in_progress").length,
    blocked: tasks.filter((t) => t.status === "blocked").length,
    done: tasks.filter((t) => t.status === "done").length,
  };

  const columns: ColumnsType<Task> = [
    {
      title: "标题",
      dataIndex: "title",
      key: "title",
      render: (t: string, r: Task) => (
        <a onClick={() => setSelectedTask(r)}>{t}</a>
      ),
    },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      width: 120,
      render: (s: string) => {
        const colorMap: Record<string, string> = {
          todo: "default",
          in_progress: "processing",
          blocked: "error",
          done: "success",
        };
        const labelMap: Record<string, string> = {
          todo: "待办",
          in_progress: "进行中",
          blocked: "阻塞",
          done: "已完成",
        };
        return <Tag color={colorMap[s] || "default"}>{labelMap[s] || s}</Tag>;
      },
    },
    {
      title: "来源",
      dataIndex: "source",
      key: "source",
      width: 80,
      render: (s: string) => <Tag>{s === "beads" ? "B" : "M"}</Tag>,
    },
    {
      title: "标签",
      key: "tags",
      dataIndex: "tags",
      width: 160,
      render: (tags: string[]) => tags?.map((t, i) => <Tag key={i}>{t}</Tag>),
    },
    {
      title: "更新时间",
      dataIndex: "updated_at",
      key: "updated_at",
      width: 160,
      render: (t: string) => t?.slice(0, 10),
    },
  ];

  return (
    <div>
      <Typography.Title level={3}>任务</Typography.Title>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}><Card><Statistic title="待办" value={statusCounts.todo} prefix={<InboxOutlined />} /></Card></Col>
        <Col span={6}><Card><Statistic title="进行中" value={statusCounts.in_progress} prefix={<ClockCircleOutlined />} valueStyle={{ color: "#1677ff" }} /></Card></Col>
        <Col span={6}><Card><Statistic title="阻塞" value={statusCounts.blocked} prefix={<ExclamationCircleOutlined />} valueStyle={{ color: "#ff4d4f" }} /></Card></Col>
        <Col span={6}><Card><Statistic title="已完成" value={statusCounts.done} prefix={<CheckCircleOutlined />} valueStyle={{ color: "#52c41a" }} /></Card></Col>
      </Row>

      <div style={{ marginBottom: 16 }}>
        <Select
          allowClear
          placeholder="筛选状态"
          style={{ width: 160 }}
          value={statusFilter}
          onChange={(v) => { setStatusFilter(v ?? undefined); fetchTasks(v ?? undefined); }}
          options={[
            { value: "todo", label: "待办" },
            { value: "in_progress", label: "进行中" },
            { value: "blocked", label: "阻塞" },
            { value: "done", label: "已完成" },
          ]}
        />
      </div>

      <Table
        dataSource={tasks}
        columns={columns}
        loading={loading}
        pagination={{ pageSize: 20 }}
        rowKey="id"
      />

      <Modal
        title={selectedTask?.title}
        open={!!selectedTask}
        onCancel={() => setSelectedTask(null)}
        footer={null}
        width={600}
      >
        {selectedTask && (
          <div>
            <p><strong>状态：</strong>{selectedTask.status}</p>
            <p><strong>来源：</strong>{selectedTask.source === "beads" ? "beads" : "agent-memory"}</p>
            {selectedTask.events && selectedTask.events.length > 0 && (
              <>
                <Typography.Title level={5}>事件流</Typography.Title>
                {selectedTask.events.map((e, i) => (
                  <Card key={i} size="small" style={{ marginBottom: 8 }}>
                    <Tag color="blue">{e.type}</Tag>
                    <span>{e.content}</span>
                    <div style={{ fontSize: 12, color: "#999" }}>{e.created_at?.slice(0, 16)}</div>
                  </Card>
                ))}
              </>
            )}
            {selectedTask.artifacts && selectedTask.artifacts.length > 0 && (
              <>
                <Typography.Title level={5} style={{ marginTop: 16 }}>产出物</Typography.Title>
                {selectedTask.artifacts.map((a, i) => (
                  <Tag key={i} color="green">{a.kind}: {a.reference}</Tag>
                ))}
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
```

- [ ] **Step 2: 更新 App.tsx — 添加任务菜单和路由**

```tsx
// 在 menuItems 中添加:
{ key: "tasks", icon: <CheckSquareOutlined />, label: "任务" },

// 需要 import CheckSquareOutlined:
import {
  HomeOutlined, DatabaseOutlined, ClockCircleOutlined,
  SettingOutlined, CheckSquareOutlined,
} from "@ant-design/icons";

// 在 pages 中添加:
tasks: <Tasks />,

// 需要 import Tasks:
import Tasks from "./pages/Tasks";
```

- [ ] **Step 3: 编译验证**

Run: `cd packages/dashboard/frontend && npx tsc --noEmit`

Expected: 无类型错误

- [ ] **Step 4: 提交**

```bash
git add packages/dashboard/frontend/src/pages/Tasks.tsx packages/dashboard/frontend/src/App.tsx
git commit -m "feat: add task page with kanban view and event timeline"
```

---

### Task 7: Summarize 任务提取集成

**Files:**
- Modify: `packages/python-cli/src/main.py`（cmd_summarize）

- [ ] **Step 1: 增强 cmd_summarize — 自动提取任务信息**

在 cmd_summarize 中的事实提取之后，增加任务信息提取：

```python
def cmd_summarize():
    ctx_file = Path.home() / ".agent-memory" / "current_session.txt"
    if not ctx_file.exists():
        print("No session context found", file=sys.stderr)
        return
    text = ctx_file.read_text(encoding="utf-8")
    from summarize import generate_summary
    result = generate_summary(text)
    md_backend.append_summary(result["summary"])
    project_id = _detect_project_id()
    for fact in result.get("facts", []):
        mem0_backend.add(fact, tags=["auto-extracted"], project_id=project_id)

    # 从摘要中提取任务信息（简单启发式）
    from backends.task_backend import sync_beads, get_active_tasks, create_task, update_status, add_event
    sync_beads(project_id)

    summary_lower = result["summary"].lower()
    # 检测是否提到完成任务
    if "完成" in summary_lower or "修复" in summary_lower or "实现" in summary_lower:
        active = get_active_tasks(project_id=project_id)
        if active:
            # 找到第一个 in_progress 或 blocked 任务，追加 done 事件
            task_to_close = None
            for t in active:
                if t["status"] == "in_progress":
                    task_to_close = t
                    break
            if task_to_close:
                add_event(task_to_close["id"], "note",
                          f"会话摘要关联: {result['summary'][:100]}")
                print(f"  更新任务: {task_to_close['title']}")

    print(f"Summary written: {result['summary'][:100]}...")
```

- [ ] **Step 2: 提交**

```bash
git add packages/python-cli/src/main.py
git commit -m "feat: auto-extract task context during session summarize"
```
