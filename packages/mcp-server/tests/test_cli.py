"""测试 CLI 命令"""

import sys
import json
import os
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

from agent_memory_mcp import cli
import pytest


class TestCLI:
    """测试 CLI task 子命令"""

    def test_task_list(self, monkeypatch: pytest.MonkeyPatch):
        monkeypatch.setattr(sys, "argv", ["agent-memory", "task", "list"])
        cli.cmd_task()

    def test_task_start(self, monkeypatch: pytest.MonkeyPatch):
        monkeypatch.setattr(sys, "argv", ["agent-memory", "task", "start", "CLI测试任务"])
        cli.cmd_task()

    def test_task_show(self, monkeypatch: pytest.MonkeyPatch):
        from agent_memory_mcp.backends.task_backend import create_task
        t = create_task("show测试", project_id="test-cli")
        monkeypatch.setattr(sys, "argv", ["agent-memory", "task", "show", t["id"]])
        cli.cmd_task()

    def test_task_done_no_id(self, monkeypatch: pytest.MonkeyPatch):
        monkeypatch.setattr(sys, "argv", ["agent-memory", "task", "done"])
        from agent_memory_mcp.backends.task_backend import create_task, update_status, get_task
        t = create_task("done测试", project_id="test-cli")
        update_status(t["id"], "in_progress")
        monkeypatch.setattr(cli, "detect_project_id", lambda: "test-cli")
        cli.cmd_task()
        assert get_task(t["id"])["status"] == "done"

    def test_task_block(self, monkeypatch: pytest.MonkeyPatch):
        from agent_memory_mcp.backends.task_backend import create_task, get_task
        t = create_task("block测试", project_id="test-cli")
        monkeypatch.setattr(sys, "argv", ["agent-memory", "task", "block", t["id"], "依赖未就绪"])
        cli.cmd_task()
        full = get_task(t["id"])
        assert full["status"] == "blocked"
        assert any(e["type"] == "blocker" for e in full["events"])

    def test_recall(self, monkeypatch: pytest.MonkeyPatch):
        monkeypatch.setattr(sys, "argv", ["agent-memory", "recall"])
        cli.cmd_recall()
        pid = os.getpid()
        ctx_file = Path.home() / ".agent-memory" / f"context.{pid}.json"
        assert ctx_file.exists(), f"context.{pid}.json not found"
        data = json.loads(ctx_file.read_text(encoding="utf-8"))
        assert "mem0" in data
        assert "active_tasks" in data

    def test_unknown_command(self, monkeypatch: pytest.MonkeyPatch):
        monkeypatch.setattr(sys, "argv", ["agent-memory", "invalid"])
        with pytest.raises(SystemExit):
            cli.main()

    def test_remember_basic(self, monkeypatch: pytest.MonkeyPatch, capsys):
        """基础 remember 命令输出 JSON"""
        monkeypatch.setattr(sys, "argv", ["agent-memory", "remember", "测试内容"])
        cli.cmd_remember()
        captured = capsys.readouterr()
        out = json.loads(captured.out)
        assert "status" in out

    def test_remember_with_tags(self, monkeypatch: pytest.MonkeyPatch, capsys):
        """带标签的 remember"""
        monkeypatch.setattr(sys, "argv", ["agent-memory", "remember", "带标签的内容", "--tags", "tag1,tag2"])
        cli.cmd_remember()
        captured = capsys.readouterr()
        out = json.loads(captured.out)
        assert "status" in out

    def test_remember_no_args_exits(self, monkeypatch: pytest.MonkeyPatch):
        """不带参数应退出"""
        monkeypatch.setattr(sys, "argv", ["agent-memory", "remember"])
        with pytest.raises(SystemExit):
            cli.cmd_remember()
