import sys
import pytest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))
from agent_memory_mcp import audit


class TestAudit:
    """测试审计日志"""

    def test_log_and_query(self):
        """记录后可查询到"""
        audit.log("test_event", key="value")
        results = audit.query(days=7)
        assert len(results) > 0
        assert any(r["action"] == "test_event" for r in results)

    def test_query_empty(self):
        """查询 0 天返回空列表"""
        results = audit.query(days=0)
        assert isinstance(results, list)
        # 0 天时 range(0) 为空，不查询任何文件
        assert len(results) == 0

    def test_query_structure(self):
        """每条记录包含必要字段"""
        audit.log("struct_test", data="xyz")
        results = audit.query(days=7)
        matching = [r for r in results if r.get("action") == "struct_test"]
        if matching:
            record = matching[0]
            assert "timestamp" in record
            assert "action" in record
