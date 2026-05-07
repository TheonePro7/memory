"""core.py 鍗曞厓娴嬭瘯 鈥?remember / recall / summarize / detect_project_id / _format_mem0_result"""

import sys
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

from agent_memory_mcp.core import (
    detect_project_id,
    _format_mem0_result,
    remember,
    recall,
    summarize,
    register_adapter,
    get_adapters,
)


class TestDetectProjectId:
    def test_git_repo_returns_basename(self):
        with patch("agent_memory_mcp.core.subprocess.check_output", return_value="/home/user/my-project\n"):
            assert detect_project_id() == "my-project"

    def test_non_git_dir_falls_back_to_cwd(self):
        from subprocess import CalledProcessError
        with patch("agent_memory_mcp.core.subprocess.check_output", side_effect=CalledProcessError(128, "git")):
            with patch("agent_memory_mcp.core.Path.cwd", return_value=Path("/some/other-dir")):
                assert detect_project_id() == "other-dir"

    def test_file_not_found_falls_back_to_cwd(self):
        with patch("agent_memory_mcp.core.subprocess.check_output", side_effect=FileNotFoundError):
            with patch("agent_memory_mcp.core.Path.cwd", return_value=Path("/tmp/test-project")):
                assert detect_project_id() == "test-project"


class TestFormatMem0Result:
    def test_basic_format(self):
        r = {"memory": "hello world", "score": 0.85, "id": "abc123"}
        result = _format_mem0_result(r)
        assert result["content"] == "hello world"
        assert result["score"] == 0.85
        assert result["source"] == "mem0"
        assert result["id"] == "abc123"

    def test_with_entities_from_string(self):
        r = {"memory": "test", "metadata": {"entities": "AI,ML,Python"}}
        result = _format_mem0_result(r)
        assert result["entities"] == ["AI", "ML", "Python"]

    def test_with_entities_from_list(self):
        r = {"memory": "test", "metadata": {"entities": ["AI", "ML"]}}
        result = _format_mem0_result(r)
        assert result["entities"] == ["AI", "ML"]

    def test_with_actions_from_string(self):
        r = {"memory": "test", "metadata": {"actions": "refactor,test"}}
        result = _format_mem0_result(r)
        assert result["actions"] == ["refactor", "test"]

    def test_with_actions_from_list(self):
        r = {"memory": "test", "metadata": {"actions": ["refactor"]}}
        result = _format_mem0_result(r)
        assert result["actions"] == ["refactor"]

    def test_with_llm_summary(self):
        r = {"memory": "test", "metadata": {"llm_summary": "AI summary"}}
        result = _format_mem0_result(r)
        assert result["llm_summary"] == "AI summary"

    def test_with_tags_from_string(self):
        r = {"memory": "test", "metadata": {"tags": "a,b,c"}}
        result = _format_mem0_result(r)
        assert result["tags"] == ["a", "b", "c"]

    def test_with_tags_from_list(self):
        r = {"memory": "test", "metadata": {"tags": ["a", "b"]}}
        result = _format_mem0_result(r)
        assert result["tags"] == ["a", "b"]

    def test_with_rerank_reason(self):
        r = {"memory": "test", "score": 0.9, "id": "x", "rerank_reason": "very relevant"}
        result = _format_mem0_result(r)
        assert result["rerank_reason"] == "very relevant"

    def test_no_metadata_omits_optional_fields(self):
        r = {"memory": "test", "score": 0.5, "id": "x"}
        result = _format_mem0_result(r)
        assert "entities" not in result
        assert "actions" not in result
        assert "llm_summary" not in result
        assert "tags" not in result


class TestRemember:
    def test_basic_store(self):
        with patch("agent_memory_mcp.core.mem0_backend.add", return_value={"status": "stored", "id": "abc"}) as mock_add:
            result = remember("test content", tags=["tag1"], project_id="test-project")
            assert result == {"status": "stored", "id": "abc"}
            mock_add.assert_called_once_with(
                "test content", project_id="test-project", tags=["tag1"],
                entities=None, actions=None, llm_summary=None, agent="default",
            )

    def test_with_process(self):
        mock_extract = {"entities": ["AI"], "actions": ["test"], "summary": "s", "tags": ["auto"]}
        with patch("agent_memory_mcp.core.extract", return_value=mock_extract):
            with patch("agent_memory_mcp.core.mem0_backend.add", return_value={"status": "stored"}) as mock_add:
                remember("test", tags=["manual"], project_id="p", process=True)
                mock_add.assert_called_once()
                args, kwargs = mock_add.call_args
                assert args[0] == "test"
                assert kwargs["project_id"] == "p"
                assert kwargs["agent"] == "default"
                assert set(kwargs["tags"]) == {"auto", "manual"}
                assert kwargs["entities"] == ["AI"]
                assert kwargs["actions"] == ["test"]
                assert kwargs["llm_summary"] == "s"

    def test_process_returns_none_leaves_tags_untouched(self):
        with patch("agent_memory_mcp.core.extract", return_value=None):
            with patch("agent_memory_mcp.core.mem0_backend.add", return_value={"status": "stored"}) as mock_add:
                remember("test", tags=["manual"], project_id="p", process=True)
                mock_add.assert_called_once_with(
                    "test", project_id="p", tags=["manual"],
                    entities=None, actions=None, llm_summary=None, agent="default",
                )


class TestRecall:
    def test_basic_search(self):
        mock_results = [{"memory": "item 1", "score": 0.9, "id": "a"}]
        with patch("agent_memory_mcp.core.mem0_backend.search", return_value=mock_results):
            results = recall("test query", limit=5, project_id="p")
            assert len(results) == 1
            assert results[0]["content"] == "item 1"
            assert results[0]["source"] == "mem0"

    def test_with_process_rerank(self):
        mock_results = [{"memory": "item 1", "score": 0.9, "id": "a"}]
        mock_reranked = [{"memory": "item 1", "score": 0.9, "id": "a", "rerank_reason": "relevant"}]
        with patch("agent_memory_mcp.core.mem0_backend.search", return_value=mock_results):
            with patch("agent_memory_mcp.processor.rerank", return_value=mock_reranked):
                results = recall("query", limit=5, project_id="p", process=True)
                assert results[0]["rerank_reason"] == "relevant"

    def test_empty_results(self):
        with patch("agent_memory_mcp.core.mem0_backend.search", return_value=[]):
            results = recall("query", limit=5, project_id="p")
            assert results == []


class TestSummarize:
    def test_full_flow(self):
        mock_gen = {"summary": "Session summary", "facts": ["fact 1", "fact 2"], "task_completed": True}
        with patch("agent_memory_mcp.core.generate_summary", return_value=mock_gen):
            with patch("agent_memory_mcp.core.md_backend.append_summary", return_value="/path/to/summary.md"):
                with patch("agent_memory_mcp.core.mem0_backend.add") as mock_add:
                    with patch("agent_memory_mcp.core.sync_beads"):
                        result = summarize("session context", project_id="test-p")
                        assert result["summary"] == "Session summary"
                        assert result["file"] == "/path/to/summary.md"
                        assert result["facts"] == ["fact 1", "fact 2"]
                        assert result["task_completed"] is True
                        assert mock_add.call_count == 3  # summary + 2 facts
                        mock_add.assert_any_call("Session summary", tags=["auto-summary"], project_id="test-p", agent="default")
                        mock_add.assert_any_call("fact 1", tags=["auto-extracted"], project_id="test-p", agent="default")
                        mock_add.assert_any_call("fact 2", tags=["auto-extracted"], project_id="test-p", agent="default")

    def test_no_facts_skips_mem_add(self):
        mock_gen = {"summary": "Session", "facts": [], "task_completed": False}
        with patch("agent_memory_mcp.core.generate_summary", return_value=mock_gen):
            with patch("agent_memory_mcp.core.md_backend.append_summary", return_value="/path"):
                with patch("agent_memory_mcp.core.mem0_backend.add") as mock_add:
                    with patch("agent_memory_mcp.core.sync_beads"):
                        summarize("context", project_id="p")
                        mock_add.assert_called_once_with("Session", tags=["auto-summary"], project_id="p", agent="default")


class TestAdapterRegistry:
    def test_register_and_get_adapters(self):
        from agent_memory_mcp.core import register_adapter, get_adapters

        before = len(get_adapters())
        mock = {"name": "test-adapter"}
        register_adapter(mock)
        assert len(get_adapters()) == before + 1
        assert mock in get_adapters()

    def test_get_adapters_returns_copy(self):
        from agent_memory_mcp.core import register_adapter, get_adapters

        before = len(get_adapters())
        mock = {"name": "test"}
        register_adapter(mock)
        result = get_adapters()
        result.clear()
        assert len(get_adapters()) == before + 1
