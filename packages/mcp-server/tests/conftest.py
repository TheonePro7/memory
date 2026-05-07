"""pytest 配置：测试使用独立数据目录，避免污染生产数据"""
import os
import tempfile
from pathlib import Path

# 在导入任何业务模块前设置 AGENT_MEMORY_DIR 到临时目录
_tmp_dir = Path(tempfile.mkdtemp(prefix="agent-memory-test-"))
os.environ["AGENT_MEMORY_DIR"] = str(_tmp_dir)

# 覆盖 Path.home() 引用 — 让 md_backend.py 和 quota.py 也走独立目录
# 注意：AGENT_MEMORY_DIR 只影响 mem0_backend 和 task_backend
# 其他模块（md_backend, quota）仍写 ~/.agent-memory/，因此需要使用 monkeypatch 方案
# 在测试函数层面通过 monkeypatch 解决（见各个测试中的 setup）
