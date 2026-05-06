"""server.py MCP 工具测试"""

import sys
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

from agent_memory_mcp.server import remember, recall, summarize, forget, memory_stats, audit_log, task_context


class TestRemember:
    def test_basic_remember(self):
        with patch("agent_memory_mcp.server.core_remember", return_value={"id": "abc", "status": "stored"}):
            with patch("agent_memory_mcp.server.audit.log"):
                result = remember("test content", tags=["tag1"], project_id="p")
                assert result["status"] == "stored"
                assert result["id"] == "abc"
                assert result["backend"] == "mem0"

    def test_remember_with_process(self):
        with patch("agent_memory_mcp.server.core_remember", return_value={"id": "abc"}):
            with patch("agent_memory_mcp.server.audit.log"):
                result = remember("content", process=True)
                assert result["status"] == "stored"


class TestRecall:
    def test_basic_recall(self):
        mock_results = [{"content": "item 1", "source": "mem0"}]
        with patch("agent_memory_mcp.server.core_recall", return_value=mock_results):
            with patch("agent_memory_mcp.server.audit.log"):
                results = recall("test query", limit=10, project_id="p")
                assert len(results) == 1
                assert results[0]["content"] == "item 1"

    def test_recall_empty(self):
        with patch("agent_memory_mcp.server.core_recall", return_value=[]):
            with patch("agent_memory_mcp.server.audit.log"):
                results = recall("nothing")
                assert results == []

    def test_recall_respects_limit(self):
        mock_results = [{"content": str(i)} for i in range(20)]
        with patch("agent_memory_mcp.server.core_recall", return_value=mock_results):
            with patch("agent_memory_mcp.server.audit.log"):
                results = recall("query", limit=5)
                assert len(results) == 5


class TestSummarize:
    def test_basic_summarize(self):
        mock_result = {"summary": "Summary", "file": "/path", "facts": ["f1"], "task_completed": False}
        with patch("agent_memory_mcp.server.core_summarize", return_value=mock_result):
            with patch("agent_memory_mcp.server.audit.log"):
                result = summarize("session text")
                assert result["summary"] == "Summary"
                assert len(result["facts"]) == 1


class TestForget:
    def test_forget_success(self):
        with patch("agent_memory_mcp.server.mem0_backend.delete", return_value=True):
            with patch("agent_memory_mcp.server.audit.log"):
                result = forget("abc123")
                assert result["deleted"] == 1
                assert result["status"] == "deleted"

    def test_forget_not_found(self):
        with patch("agent_memory_mcp.server.mem0_backend.delete", return_value=False):
            with patch("agent_memory_mcp.server.audit.log"):
                result = forget("non-existent")
                assert result["deleted"] == 0
                assert result["status"] == "not_found"


class TestMemoryStats:
    def test_stats(self):
        with patch("agent_memory_mcp.server.mem0_backend.stats", return_value={"total": 10}):
            result = memory_stats()
            assert result["total"] == 10


class TestAuditLog:
    def test_audit_log_query(self):
        mock_logs = [{"action": "remember", "timestamp": "2026-01-01"}]
        with patch("agent_memory_mcp.server.audit.query", return_value=mock_logs):
            result = audit_log(days=30)
            assert len(result) == 1
            assert result[0]["action"] == "remember"

    def test_audit_log_default_days(self):
        with patch("agent_memory_mcp.server.audit.query", return_value=[]):
            result = audit_log()
            assert result == []


class TestTaskContext:
    def test_task_context(self):
        mock_active = [{"id": "1", "title": "Task 1", "status": "in_progress"}]
        mock_recent = [{"id": "2", "title": "Task 2", "status": "done"}]
        with patch("agent_memory_mcp.server.detect_project_id", return_value="test-p"):
            with patch("agent_memory_mcp.backends.task_backend.sync_beads"):
                with patch("agent_memory_mcp.backends.task_backend.get_active_tasks", return_value=mock_active):
                    with patch("agent_memory_mcp.backends.task_backend.list_tasks", return_value=mock_recent):
                        result = task_context()
                        assert result["active_tasks"] == mock_active
                        assert result["recent_tasks"] == mock_recent
                        assert result["total"] == 1

    def test_task_context_with_explicit_project_id(self):
        with patch("agent_memory_mcp.backends.task_backend.sync_beads") as mock_sync:
            with patch("agent_memory_mcp.backends.task_backend.get_active_tasks", return_value=[]):
                with patch("agent_memory_mcp.backends.task_backend.list_tasks", return_value=[]):
                    task_context(project_id="explicit-p")
                    mock_sync.assert_called_once_with("explicit-p")
