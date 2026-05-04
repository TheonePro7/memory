"""测试任务记忆后端"""

import sys
import os
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

from backends.task_backend import (
    create_task, get_task, list_tasks, update_status,
    add_event, add_artifact, get_active_tasks,
    sync_beads, detect_beads,
)
import tempfile
import json


class TestTaskCRUD:
    """测试任务 CRUD 基本操作"""

    pid = "test-crud"

    def test_create_task(self):
        t = create_task("测试任务", project_id=self.pid)
        assert t["title"] == "测试任务"
        assert t["status"] == "todo"
        assert t["source"] == "agent-memory"
        assert t["project_id"] == self.pid
        assert len(t["id"]) == 36  # UUID

    def test_create_task_with_tags(self):
        t = create_task("带标签任务", project_id=self.pid, tags=["bug", "frontend"])
        assert "bug" in t["tags"]
        assert "frontend" in t["tags"]

    def test_get_task_not_found(self):
        t = get_task("non-existent")
        assert t is None

    def test_get_task_with_events_and_artifacts(self):
        t = create_task("完整任务", project_id=self.pid)
        add_event(t["id"], "decision", "改用 JWT")
        add_artifact(t["id"], "commit", "abc1234")
        full = get_task(t["id"])
        assert len(full["events"]) == 1
        assert full["events"][0]["type"] == "decision"
        assert len(full["artifacts"]) == 1
        assert full["artifacts"][0]["reference"] == "abc1234"

    def test_update_status(self):
        t = create_task("状态测试", project_id=self.pid)
        t2 = update_status(t["id"], "in_progress")
        assert t2["status"] == "in_progress"
        # 验证事件被记录
        assert len(t2["events"]) >= 1
        assert t2["events"][-1]["type"] == "status_change"

    def test_update_status_not_found(self):
        assert update_status("non-existent", "done") is None

    def test_list_tasks(self):
        create_task("列表测试1", project_id=self.pid)
        create_task("列表测试2", project_id=self.pid)
        tasks = list_tasks(project_id=self.pid)
        assert len(tasks) >= 2

    def test_list_tasks_filter_status(self):
        t = create_task("状态筛选", project_id=self.pid)
        update_status(t["id"], "blocked")
        blocked = list_tasks(project_id=self.pid, status="blocked")
        assert any(tt["id"] == t["id"] for tt in blocked)

    def test_get_active_tasks(self):
        # 清理之前的活跃任务
        for t in list_tasks(project_id=self.pid):
            if t["status"] in ("in_progress", "blocked"):
                update_status(t["id"], "done")
        t1 = create_task("活跃1", project_id=self.pid)
        t2 = create_task("活跃2", project_id=self.pid)
        update_status(t1["id"], "in_progress")
        update_status(t2["id"], "blocked")
        active = get_active_tasks(project_id=self.pid)
        assert len(active) >= 2

    def test_add_event(self):
        t = create_task("事件测试", project_id=self.pid)
        add_event(t["id"], "blocker", "依赖 API 未就绪")
        full = get_task(t["id"])
        assert any(e["content"] == "依赖 API 未就绪" for e in full["events"])

    def test_add_artifact(self):
        t = create_task("产出物测试", project_id=self.pid)
        add_artifact(t["id"], "pr", "https://github.com/example/pr/1")
        full = get_task(t["id"])
        assert any(a["reference"] == "https://github.com/example/pr/1" for a in full["artifacts"])


class TestBeadsSync:
    """测试 beads 同步功能"""

    def test_detect_beads_no_file(self):
        with tempfile.TemporaryDirectory() as tmp:
            result = detect_beads(tmp)
            assert result is None

    def test_sync_beads_no_file(self):
        with tempfile.TemporaryDirectory() as tmp:
            result = sync_beads("test-beads", project_path=tmp)
            assert result["error"] == "no beads file found"

    def test_sync_beads_from_jsonl(self):
        with tempfile.TemporaryDirectory() as tmp:
            beads_dir = Path(tmp) / ".beads"
            beads_dir.mkdir()
            beads_file = beads_dir / "issues.jsonl"
            beads_file.write_text(
                '{"id":"b1","title":"修复登录页","status":"in_progress","tags":["bug"]}\n'
                '{"id":"b2","title":"添加测试","status":"done","tags":["test"]}\n',
                encoding="utf-8",
            )

            result = sync_beads("test-beads", project_path=tmp)
            assert result["synced"] == 2
            assert result["total"] == 2

            tasks = list_tasks(project_id="test-beads")
            titles = {t["title"] for t in tasks}
            assert "修复登录页" in titles
            assert "添加测试" in titles

    def test_sync_beads_incremental(self):
        """增量同步：再次同步不应重复创建"""
        with tempfile.TemporaryDirectory() as tmp:
            beads_dir = Path(tmp) / ".beads"
            beads_dir.mkdir()
            beads_file = beads_dir / "issues.jsonl"
            beads_file.write_text(
                '{"id":"b1","title":"修复登录页","status":"in_progress","tags":["bug"]}\n',
                encoding="utf-8",
            )

            sync1 = sync_beads("test-incr", project_path=tmp)
            assert sync1["synced"] == 1

            sync2 = sync_beads("test-incr", project_path=tmp)
            assert sync2["synced"] == 1  # 仍然是 1（增量更新，不是新建）

            tasks = list_tasks(project_id="test-incr")
            assert len(tasks) == 1

    def test_sync_beads_status_change(self):
        """beads 状态变化应触发事件"""
        with tempfile.TemporaryDirectory() as tmp:
            beads_dir = Path(tmp) / ".beads"
            beads_dir.mkdir()
            beads_file = beads_dir / "issues.jsonl"

            # 首次同步：in_progress
            beads_file.write_text(
                '{"id":"b1","title":"修复登录页","status":"in_progress","tags":["bug"]}\n',
                encoding="utf-8",
            )
            sync_beads("test-change", project_path=tmp)

            # 改状态为 done
            beads_file.write_text(
                '{"id":"b1","title":"修复登录页","status":"done","tags":["bug"]}\n',
                encoding="utf-8",
            )
            sync = sync_beads("test-change", project_path=tmp)
            assert sync["synced"] == 1

            tasks = list_tasks(project_id="test-change")
            # list_tasks 返回 flat 数据，需要 get_task 获取完整事件
            task_ids = [t["id"] for t in tasks if t["source"] == "beads"]
            assert len(task_ids) == 1
            full = get_task(task_ids[0])
            assert full["status"] == "done"
            assert len(full["events"]) >= 2  # 初始创建事件 + 状态变更事件
