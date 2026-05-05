import sys
import pytest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))
from agent_memory_mcp.backends import md_backend


class TestMdBackend:
    """测试 Markdown 文件后端"""

    def test_append_and_grep(self):
        """追加摘要后可以通过 grep 搜索到"""
        content = f"# 测试摘要 test_md_backend"
        path = md_backend.append_summary(content)
        assert path
        assert Path(path).exists()

        results = md_backend.grep("测试摘要")
        # grep 返回的 matches 是匹配行列表
        all_matches = [m for r in results for m in r.get("matches", [])]
        assert len(all_matches) > 0

    def test_append_multiple(self):
        """多次追加产生不同文件（文件名基于日期，同一天文件相同但内容追加）"""
        p1 = md_backend.append_summary("摘要A")
        p2 = md_backend.append_summary("摘要B")
        # 同一天的文件路径相同
        assert p1 == p2

    def test_grep_no_match(self):
        """无匹配返回空列表"""
        results = md_backend.grep("__不存在的关键词_xyzzy__")
        assert isinstance(results, list)
        assert len(results) == 0

    def test_get_recent(self):
        """get_recent 返回最近记录"""
        recent = md_backend.get_recent(days=7)
        assert isinstance(recent, list)
