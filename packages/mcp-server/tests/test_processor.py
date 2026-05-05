"""processor.py 单元测试"""

import sys
import os
import json
from pathlib import Path
from unittest.mock import patch

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

from agent_memory_mcp.processor import extract, rerank, _parse_json_response


class TestParseJsonResponse:
    def test_anthropic_format(self):
        data = {"content": [{"text": '{"entities": ["AI"], "summary": "test"}'}]}
        result = _parse_json_response(data)
        assert result == {"entities": ["AI"], "summary": "test"}

    def test_openai_format(self):
        data = {"choices": [{"message": {"content": '{"entities": ["AI"]}'}}]}
        result = _parse_json_response(data)
        assert result == {"entities": ["AI"]}

    def test_with_json_markdown_fence(self):
        data = {
            "content": [{
                "text": "```json\n{\"entities\": [\"AI\"]}\n```"
            }]
        }
        result = _parse_json_response(data)
        assert result == {"entities": ["AI"]}

    def test_with_generic_markdown_fence(self):
        data = {
            "content": [{
                "text": "```\n{\"entities\": [\"AI\"]}\n```"
            }]
        }
        result = _parse_json_response(data)
        assert result == {"entities": ["AI"]}

    def test_invalid_json_returns_none(self):
        data = {"content": [{"text": "not json"}]}
        result = _parse_json_response(data)
        assert result is None

    def test_no_recognized_format_returns_none(self):
        data = {"unexpected": "format"}
        result = _parse_json_response(data)
        assert result is None


class TestExtract:
    def test_no_api_key_returns_none(self):
        with patch.dict(os.environ, {}, clear=True):
            result = extract("test content")
            assert result is None

    def test_with_anthropic_key(self):
        mock_response = {
            "content": [{"text": '{"entities": ["AI"], "summary": "test", "tags": ["ml"], "is_useful": true}'}]
        }
        with patch.dict(os.environ, {"ANTHROPIC_API_KEY": "sk-test"}):
            with patch("agent_memory_mcp.processor._call_anthropic", return_value=mock_response):
                result = extract("test content")
                assert result == {"entities": ["AI"], "summary": "test", "tags": ["ml"], "is_useful": True}

    def test_with_openai_key(self):
        mock_response = {
            "choices": [{"message": {"content": '{"entities": ["AI"]}'}}]
        }
        with patch.dict(os.environ, {"OPENAI_API_KEY": "sk-test", "ANTHROPIC_API_KEY": ""}):
            with patch("agent_memory_mcp.processor._call_openai", return_value=mock_response):
                result = extract("test content")
                assert result == {"entities": ["AI"]}


class TestRerank:
    def test_no_api_key_returns_none(self):
        with patch.dict(os.environ, {}, clear=True):
            result = rerank("query", [{"memory": "item 1"}])
            assert result is None

    def test_empty_results_returns_none(self):
        with patch.dict(os.environ, {"ANTHROPIC_API_KEY": "sk-test"}):
            result = rerank("query", [])
            assert result is None

    def test_rerank_with_valid_response(self):
        mock_response = {
            "content": [{
                "text": json.dumps([
                    {"index": 1, "reason": "more relevant"},
                    {"index": 0, "reason": "less relevant"},
                ])
            }]
        }
        results = [
            {"memory": "item A", "score": 0.5},
            {"memory": "item B", "score": 0.6},
        ]

        with patch.dict(os.environ, {"ANTHROPIC_API_KEY": "sk-test"}):
            with patch("agent_memory_mcp.processor._call_anthropic", return_value=mock_response):
                reranked = rerank("query", results, top_n=2)
                assert reranked is not None
                assert len(reranked) == 2
                # First result should be the one with index 1 (item B)
                assert reranked[0]["memory"] == "item B"
                assert reranked[0]["rerank_reason"] == "more relevant"
                assert reranked[1]["memory"] == "item A"
                assert reranked[1]["rerank_reason"] == "less relevant"

    def test_rerank_skips_invalid_index(self):
        mock_response = {
            "content": [{"text": json.dumps([{"index": 99, "reason": "out of range"}])}]
        }
        with patch.dict(os.environ, {"OPENAI_API_KEY": "sk-test"}):
            with patch("agent_memory_mcp.processor._call_openai", return_value=mock_response):
                reranked = rerank("query", [{"memory": "only item"}], top_n=5)
                # All indices invalid → 回退到 None
                assert reranked is None
