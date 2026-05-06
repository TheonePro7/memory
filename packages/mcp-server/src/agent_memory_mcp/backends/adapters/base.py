"""适配器抽象基类 — 所有第三方记忆产品适配器实现此接口。"""

from abc import ABC, abstractmethod


class MemoryAdapter(ABC):
    """第三方记忆读取适配器。管理层核心是读数据，不需要写接口。"""

    @abstractmethod
    def list_all(self, limit: int = 50) -> list[dict]:
        """列出所有记忆。"""
        ...

    @abstractmethod
    def get(self, memory_id: str) -> dict | None:
        """获取单条记忆详情。"""
        ...

    @property
    @abstractmethod
    def name(self) -> str:
        """适配器名称，如 'mem0' / 'basic_memory'。"""
        ...
