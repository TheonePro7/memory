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
from agent_memory_mcp.backends.quota import get_quota, increment_usage, add_referral, can_edit, _get_conn


def _create_valid_referral_code() -> str:
    """向测试数据库插入一个有效的安装 ID 作为邀请码。"""
    conn, _ = _get_conn()
    code = str(uuid.uuid4())[:8].upper()
    conn.execute("INSERT OR IGNORE INTO install (id) VALUES (?)", (code,))
    conn.commit()
    conn.close()
    return code


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
        code = _create_valid_referral_code()
        result = add_referral(code)
        assert "error" not in result
        after = get_quota()
        assert after["bonus"] == before["bonus"] + REFERRAL_BONUS

    def test_add_referral_self(self):
        from agent_memory_mcp.backends.quota import get_install_id
        my_id = get_install_id()
        result = add_referral(my_id)
        assert result.get("error") == "不能推荐自己"

    def test_add_referral_invalid_code(self):
        result = add_referral("INVALID")
        assert result.get("error") == "邀请码不存在"
