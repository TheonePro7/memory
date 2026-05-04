"""测试 CLI 命令"""

import sys
import json
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

# 将 CLI src 目录加入 sys.path
_cli_src = str(
    Path(__file__).resolve().parent.parent.parent.parent
    / "packages" / "python-cli" / "src"
)
if _cli_src not in sys.path:
    sys.path.insert(0, _cli_src)

import pytest


class TestCLI:
    """测试 CLI task 子命令"""

    def test_task_list(self, monkeypatch: pytest.MonkeyPatch):
        monkeypatch.setattr(sys, "argv", ["agent-memory", "task", "list"])
        import main as cli
        cli.cmd_task()

    def test_task_start(self, monkeypatch: pytest.MonkeyPatch):
        monkeypatch.setattr(sys, "argv", ["agent-memory", "task", "start", "CLI测试任务"])
        import main as cli
        cli.cmd_task()

    def test_task_show(self, monkeypatch: pytest.MonkeyPatch):
        from backends.task_backend import create_task
        t = create_task("show测试", project_id="test-cli")
        monkeypatch.setattr(sys, "argv", ["agent-memory", "task", "show", t["id"]])
        import main as cli
        cli.cmd_task()

    def test_task_done_no_id(self, monkeypatch: pytest.MonkeyPatch):
        monkeypatch.setattr(sys, "argv", ["agent-memory", "task", "done"])
        from backends.task_backend import create_task, update_status, get_task
        t = create_task("done测试", project_id="test-cli")
        update_status(t["id"], "in_progress")
        import main as cli
        monkeypatch.setattr(cli, "_detect_project_id", lambda: "test-cli")
        cli.cmd_task()
        assert get_task(t["id"])["status"] == "done"

    def test_task_block(self, monkeypatch: pytest.MonkeyPatch):
        from backends.task_backend import create_task, get_task
        t = create_task("block测试", project_id="test-cli")
        monkeypatch.setattr(sys, "argv", ["agent-memory", "task", "block", t["id"], "依赖未就绪"])
        import main as cli
        cli.cmd_task()
        full = get_task(t["id"])
        assert full["status"] == "blocked"
        assert any(e["type"] == "blocker" for e in full["events"])

    def test_recall(self, monkeypatch: pytest.MonkeyPatch):
        monkeypatch.setattr(sys, "argv", ["agent-memory", "recall"])
        import main as cli
        cli.cmd_recall()
        ctx_file = Path.home() / ".agent-memory" / "context.json"
        assert ctx_file.exists()
        data = json.loads(ctx_file.read_text(encoding="utf-8"))
        assert "mem0" in data
        assert "active_tasks" in data

    def test_unknown_command(self, monkeypatch: pytest.MonkeyPatch):
        monkeypatch.setattr(sys, "argv", ["agent-memory", "invalid"])
        with pytest.raises(SystemExit):
            import main as cli
            cli.main()
