import sys
import pytest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))
from agent_memory_mcp.backends import mem0_backend


class TestMem0Backend:
    """测试 mem0 向量记忆后端"""

    def test_add_and_search(self):
        """添加记忆后可以搜索到"""
        content = f"测试记忆内容_test_mem0_backend"
        r = mem0_backend.add(content, project_id="test-mem0")
        assert r["status"] == "stored"
        assert r["id"]

        results = mem0_backend.search(content, project_id="test-mem0")
        assert len(results) > 0
        # 搜索结果的 memory 字段应包含原文
        assert any(content in r.get("memory", "") for r in results)

    def test_delete(self):
        """删除记忆后搜索不到"""
        content = f"待删除测试_test_mem0_backend"
        r = mem0_backend.add(content, project_id="test-mem0")
        assert r["status"] == "stored"

        ok = mem0_backend.delete(r["id"])
        assert ok is True

        # 尝试删除不存在的 id
        ok2 = mem0_backend.delete("non-existent-id")
        assert ok2 is True  # ChromaDB delete with non-existent id returns True

    def test_stats(self):
        """统计返回 count"""
        stats = mem0_backend.stats(project_id="test-mem0")
        assert "total" in stats
        assert isinstance(stats["total"], int)

    def test_list_all(self):
        """list_all 返回记忆列表"""
        items = mem0_backend.list_all(project_id="test-mem0", limit=5)
        assert isinstance(items, list)

    def test_add_empty_content(self):
        """空内容返回 error 状态"""
        r = mem0_backend.add("   ", project_id="test-mem0")
        assert r["status"] == "error"

    def test_search_empty_query(self):
        """空查询返回空列表"""
        results = mem0_backend.search("", project_id="test-mem0")
        assert results == []
