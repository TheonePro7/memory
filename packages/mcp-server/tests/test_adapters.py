"""适配器测试"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

from agent_memory_mcp.backends.adapters.base import MemoryAdapter


class TestAdapterInterface:
    def test_base_class_cannot_be_instantiated(self):
        try:
            MemoryAdapter()  # type: ignore
            assert False, "should have raised TypeError"
        except TypeError:
            pass

    def test_concrete_adapter_works(self):
        class Impl(MemoryAdapter):
            @property
            def name(self): return "test"
            def list_all(self, limit=50): return [{"id": "1"}]
            def get(self, id): return {"id": id}
        impl = Impl()
        assert impl.name == "test"
        assert impl.list_all() == [{"id": "1"}]
        assert impl.get("1") == {"id": "1"}
