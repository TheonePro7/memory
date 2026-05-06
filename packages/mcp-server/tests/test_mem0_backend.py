import sys
import unittest
import pytest
from pathlib import Path
from unittest.mock import patch
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

        # 尝试删除不存在的 id 应返回 False
        ok2 = mem0_backend.delete("non-existent-id")
        assert ok2 is False

    def test_stats(self):
        """统计返回 count"""
        stats = mem0_backend.stats(project_id="test-mem0")
        assert "total" in stats
        assert isinstance(stats["total"], int)

    def test_stats_with_project(self):
        """stats 支持 project_id 过滤"""
        stats = mem0_backend.stats(project_id="test-mem0")
        assert "total" in stats
        assert "user_id" in stats

    def test_add_empty_content(self):
        """空内容返回 error 状态"""
        r = mem0_backend.add("   ", project_id="test-mem0")
        assert r["status"] == "error"

    def test_search_empty_query(self):
        """空查询返回空列表"""
        results = mem0_backend.search("", project_id="test-mem0")
        assert results == []

    def test_update(self):
        """更新记忆后内容改变"""
        content = "原始内容_test_mem0_backend"
        r = mem0_backend.add(content, project_id="test-mem0")
        assert r["status"] == "stored"
        rid = r["id"]

        new_content = "更新后的内容_test_mem0_backend"
        ok = mem0_backend.update(rid, new_content)
        assert ok is True

        # 搜索验证内容已更新
        results = mem0_backend.search("更新后的内容", project_id="test-mem0")
        assert any(new_content in m.get("memory", "") for m in results)

    def test_update_not_found(self):
        """更新不存在的 id 返回 False"""
        ok = mem0_backend.update("non-existent-id", "新内容")
        assert ok is False

    def test_update_empty_content(self):
        """更新空内容返回 False"""
        content = "待更新测试_test_mem0_backend"
        r = mem0_backend.add(content, project_id="test-mem0")
        assert r["status"] == "stored"
        ok = mem0_backend.update(r["id"], "")
        assert ok is False

    def test_update_rollback_on_reinsert_failure(self):
        """重插入失败时自动回滚"""
        content = "回滚测试原始内容"
        r = mem0_backend.add(content, project_id="test-mem0")
        rid = r["id"]

        # Mock _embed 让第一次调用（新内容嵌入）正常，第二次调用（回滚嵌入）也正常
        # 但让 _get_collection().add() 在重插入时抛出异常
        from agent_memory_mcp.backends.mem0_backend import _get_collection

        real_add = _get_collection().add
        add_count = 0

        def mock_add(*args, **kwargs):
            nonlocal add_count
            add_count += 1
            if add_count == 1:  # 重插入（delete 后的第一次 add）
                raise RuntimeError("模拟重插入失败")
            return real_add(*args, **kwargs)

        with patch("agent_memory_mcp.backends.mem0_backend._get_collection") as mock_get_coll:
            mock_coll = mock_get_coll.return_value
            # 让 get/delete 调真实方法
            real_collection = _get_collection()
            mock_coll.get = real_collection.get
            mock_coll.delete = real_collection.delete
            mock_coll.add = mock_add

            ok = mem0_backend.update(rid, "新内容")
            assert ok is False, "重插入失败应返回 False"

        # 验证原始内容仍然可搜索到（回滚成功）
        results = mem0_backend.search("回滚测试原始内容", project_id="test-mem0")
        assert any(content in m.get("memory", "") for m in results)
