"""编辑限制 + 裂变推荐 — 本地 SQLite，无需用户认证。"""

import os
import sqlite3
import uuid
from pathlib import Path
from datetime import datetime

BASE_QUOTA = 100
REFERRAL_BONUS = 50


def _get_db_path() -> Path:
    env = os.environ.get("AGENT_MEMORY_QUOTA_DB")
    if env:
        return Path(env)
    return Path.home() / ".agent-memory" / "quota.db"


def _get_conn() -> tuple[sqlite3.Connection, str]:
    db_path = _get_db_path()
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    conn.execute("""
        CREATE TABLE IF NOT EXISTS usage (
            month TEXT NOT NULL,
            operation_count INTEGER DEFAULT 0,
            PRIMARY KEY (month)
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS referrals (
            install_id TEXT PRIMARY KEY,
            bonus INTEGER DEFAULT 0,
            referred_by TEXT
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS install (
            id TEXT PRIMARY KEY
        )
    """)
    cur = conn.execute("SELECT id FROM install LIMIT 1")
    row = cur.fetchone()
    if not row:
        install_id = str(uuid.uuid4())[:8].upper()
        conn.execute("INSERT INTO install (id) VALUES (?)", (install_id,))
        conn.commit()
        return conn, install_id
    return conn, row["id"]


def get_install_id() -> str:
    _, install_id = _get_conn()
    return install_id


def get_quota() -> dict:
    """返回当月编辑配额使用情况。"""
    conn, install_id = _get_conn()
    month = datetime.now().strftime("%Y-%m")

    cur = conn.execute("SELECT operation_count FROM usage WHERE month = ?", (month,))
    row = cur.fetchone()
    used = row["operation_count"] if row else 0

    cur = conn.execute("SELECT bonus FROM referrals WHERE install_id = ?", (install_id,))
    row = cur.fetchone()
    bonus = row["bonus"] if row else 0

    total = BASE_QUOTA + bonus
    conn.close()
    return {
        "used": used,
        "total": total,
        "remaining": max(0, total - used),
        "bonus": bonus,
        "month": month,
    }


def increment_usage() -> dict:
    """编辑/删除计数 +1。返回当前配额状态。"""
    conn, _ = _get_conn()
    month = datetime.now().strftime("%Y-%m")
    conn.execute("""
        INSERT INTO usage (month, operation_count) VALUES (?, 1)
        ON CONFLICT(month) DO UPDATE SET operation_count = operation_count + 1
    """, (month,))
    conn.commit()
    conn.close()
    return get_quota()


def add_referral(referral_code: str) -> dict:
    """接受一个邀请码，双方各 +50。"""
    conn, my_id = _get_conn()
    if referral_code == my_id:
        conn.close()
        return {"error": "不能推荐自己"}

    conn.execute("""
        INSERT INTO referrals (install_id, bonus, referred_by) VALUES (?, ?, ?)
        ON CONFLICT(install_id) DO UPDATE SET bonus = bonus + ?
    """, (referral_code, REFERRAL_BONUS, my_id, REFERRAL_BONUS))

    conn.execute("""
        INSERT INTO referrals (install_id, bonus, referred_by) VALUES (?, ?, ?)
        ON CONFLICT(install_id) DO UPDATE SET bonus = bonus + ?
    """, (my_id, REFERRAL_BONUS, referral_code, REFERRAL_BONUS))

    conn.commit()
    conn.close()
    return get_quota()


def can_edit() -> bool:
    """检查是否还有编辑次数。"""
    q = get_quota()
    return q["remaining"] > 0
