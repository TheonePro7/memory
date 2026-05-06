import sys
import pytest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))
from agent_memory_mcp.summarize import generate_summary


class TestSummarize:
    """测试摘要生成"""

    def test_no_api_key_returns_fallback(self):
        """无 API key 时返回 fallback"""
        import os
        old_anthropic = os.environ.pop("ANTHROPIC_API_KEY", None)
        old_openai = os.environ.pop("OPENAI_API_KEY", None)
        try:
            result = generate_summary("这是一段测试会话内容。")
            assert "summary" in result
            assert result.get("model") == "fallback-truncation"
            assert result.get("task_completed") is False
        finally:
            if old_anthropic:
                os.environ["ANTHROPIC_API_KEY"] = old_anthropic
            if old_openai:
                os.environ["OPENAI_API_KEY"] = old_openai

    def test_fallback_returns_text(self):
        """fallback 包含输入文本"""
        import os
        old_anthropic = os.environ.pop("ANTHROPIC_API_KEY", None)
        old_openai = os.environ.pop("OPENAI_API_KEY", None)
        try:
            text = "你好，这是测试会话。"
            result = generate_summary(text)
            assert text in result["summary"]
        finally:
            if old_anthropic:
                os.environ["ANTHROPIC_API_KEY"] = old_anthropic
            if old_openai:
                os.environ["OPENAI_API_KEY"] = old_openai

    def test_long_text_gets_truncated(self):
        """超长文本在 fallback 中被截断"""
        import os
        old_anthropic = os.environ.pop("ANTHROPIC_API_KEY", None)
        old_openai = os.environ.pop("OPENAI_API_KEY", None)
        try:
            text = "A" * 3000
            result = generate_summary(text)
            assert len(result["summary"]) <= 2000
        finally:
            if old_anthropic:
                os.environ["ANTHROPIC_API_KEY"] = old_anthropic
            if old_openai:
                os.environ["OPENAI_API_KEY"] = old_openai
