"""编辑配额 + 裂变测试"""

import sys
import os
import uuid
from pathlib import Path

# 每次测试用独立数据库文件，防止测试间干扰
_DB_DIR = Path.home() / ".agent-memory" / "test-quota"
_DB_DIR.mkdir(parents=True, exist_ok=True)
_DB_FILE = _DB_DIR / f"{uuid.uuid4().hex}.db"
os.environ["AGENT_MEMORY_QUOTA_DB"] = str(_DB_FILE)

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

from agent_memory_mcp.backends.quota import BASE_QUOTA, REFERRAL_BONUS
from agent_memory_mcp.backends.quota import get_quota, increment_usage, add_referral, can_edit


class TestQuota:
    def test_base_quota_default(self):
        q = get_quota()
        assert q["total"] >= BASE_QUOTA
        assert q["used"] >= 0

    def test_increment_increases_usage(self):
        before = get_quota()
        result = increment_usage()
        assert result["used"] == before["used"] + 1

    def test_can_edit_returns_bool(self):
        assert isinstance(can_edit(), bool)


class TestReferral:
    def test_add_referral_increases_bonus(self):
        before = get_quota()
        code = str(uuid.uuid4())[:8].upper()
        add_referral(code)
        after = get_quota()
        assert after["bonus"] == before["bonus"] + REFERRAL_BONUS
