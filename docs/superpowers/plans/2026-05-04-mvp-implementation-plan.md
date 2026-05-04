# Agent 记忆系统 MVP 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 一个命令让 Agent 拥有持久记忆 — mem0 + Markdown + 规则路由 + Hook 自动化

**Architecture:** Python FastMCP 服务提供 remember/recall/summarize 等工具，TypeScript CLI 做一键安装/卸载，React+Semi Design Dashboard 可视化。Python CLI 做 Hook 桥接。

**Tech Stack:** Python (FastMCP, mem0ai, FastAPI), TypeScript (npx, Node.js), React 18 + Semi Design + Vite

**Phases:**
1. MCP 服务核心 (Python) — 路由层 + 后端 + 摘要 + 审计
2. Python CLI — Hook 桥接命令
3. CLI 安装器 (TypeScript) — npx init/remove
4. Dashboard — Semi Design 可视化
5. 多 Agent 配置适配

---

## 文件结构

### Phase 1: MCP 服务 + Python CLI

```
packages/mcp-server/
├── pyproject.toml
├── requirements.txt
└── src/
    ├── __init__.py
    ├── server.py          # FastMCP 入口 + 工具注册
    ├── router.py          # 规则驱动路由
    ├── backends/
    │   ├── __init__.py
    │   ├── mem0_backend.py  # mem0 封装
    │   └── md_backend.py    # Markdown 封装
    ├── summarize.py       # LLM 会话摘要
    └── audit.py           # 审计日志

packages/python-cli/
├── pyproject.toml
└── src/
    ├── __init__.py
    └── main.py            # recall / summarize CLI
```

### Phase 2: CLI 安装器

```
packages/cli/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts           # 入口
    ├── install.ts         # init 命令
    ├── remove.ts          # remove 命令
    └── utils.ts           # 配置读写/路径
```

### Phase 3: Dashboard

```
packages/dashboard/
├── backend/
│   ├── requirements.txt
│   └── src/
│       ├── main.py         # FastAPI 入口
│       ├── config.py       # 配置
│       └── routers/
│           ├── __init__.py
│           ├── memories.py # 记忆 CRUD
│           ├── sessions.py # 会话时间线
│           └── stats.py    # 统计
└── frontend/
    ├── package.json
    ├── tsconfig.json
    ├── index.html
    ├── vite.config.ts
    └── src/
        ├── App.tsx
        ├── main.tsx
        ├── pages/
        │   ├── Overview.tsx
        │   ├── Memories.tsx
        │   ├── Timeline.tsx
        │   └── Settings.tsx
        └── components/
```

### Phase 4: 多 Agent 配置

```
packages/configs/
├── claude-code/hooks.json
├── cursor/.cursorrules
└── openclaw/mcp.json          # Codex CLI 共用
```

---

## Phase 1: MCP 服务核心

### Task 1.1: 项目骨架 + 配置

**Files:**
- Create: `packages/mcp-server/pyproject.toml`
- Create: `packages/mcp-server/requirements.txt`
- Create: `packages/mcp-server/src/__init__.py`
- Create: `packages/mcp-server/src/backends/__init__.py`

- [ ] **Step 1: Create pyproject.toml**

```toml
[build-system]
requires = ["setuptools>=68.0"]
build-backend = "setuptools.backends._legacy:_Backend"

[project]
name = "agent-memory-mcp"
version = "0.1.0"
description = "Agent 记忆系统 MCP 服务"
requires-python = ">=3.10"
dependencies = []
```

- [ ] **Step 2: Create requirements.txt**

```
mem0ai>=0.2.0
fastmcp>=0.3.0
httpx>=0.27.0
pyyaml>=6.0
```

- [ ] **Step 3: Create __init__.py files**

```python
# packages/mcp-server/src/__init__.py
```

```python
# packages/mcp-server/src/backends/__init__.py
```

- [ ] **Step 4: Commit**

```bash
cd f:/AI/memory
git add packages/mcp-server/
git commit -m "feat(mcp): scaffold project structure"
```

---

### Task 1.2: mem0 后端

**Files:**
- Create: `packages/mcp-server/src/backends/mem0_backend.py`

- [ ] **Step 1: Write mem0_backend.py**

```python
"""mem0 记忆后端"""

import os
from pathlib import Path
from mem0 import Memory


_MEMORY: Memory | None = None


def _get_memory_dir() -> Path:
    """获取 Chroma 数据目录"""
    return Path.cwd() / ".memory" / "chroma"


def get_memory() -> Memory:
    global _MEMORY
    if _MEMORY is None:
        _MEMORY = Memory.from_config({
            "vector_store": {
                "provider": "chroma",
                "config": {"path": str(_get_memory_dir())},
            },
        })
    return _MEMORY


def add(
    content: str,
    user_id: str = "default",
    project_id: str | None = None,
    tags: list[str] | None = None,
) -> dict:
    mem = get_memory()
    metadata = {}
    if project_id:
        metadata["project_id"] = project_id
    if tags:
        metadata["tags"] = ",".join(tags)
    result = mem.add(content, user_id=user_id, metadata=metadata)
    return result


def search(
    query: str,
    user_id: str = "default",
    project_id: str | None = None,
    limit: int = 10,
) -> list[dict]:
    mem = get_memory()
    filters = {}
    if project_id:
        filters["project_id"] = project_id
    results = mem.search(query, user_id=user_id, limit=limit, filters=filters)
    return results.get("results", [])


def delete(memory_id: str, user_id: str = "default") -> bool:
    mem = get_memory()
    mem.delete(memory_id, user_id=user_id)
    return True


def stats(user_id: str = "default") -> dict:
    mem = get_memory()
    all_memories = mem.get_all(user_id=user_id)
    return {"total": len(all_memories), "user_id": user_id}
```

- [ ] **Step 2: Commit**

```bash
git add packages/mcp-server/src/backends/mem0_backend.py
git commit -m "feat(mcp): mem0 backend add/search/delete/stats"
```

---

### Task 1.3: Markdown 后端

**Files:**
- Create: `packages/mcp-server/src/backends/md_backend.py`

- [ ] **Step 1: Write md_backend.py**

```python
"""Markdown 时间线日志后端"""

from pathlib import Path
from datetime import datetime, timedelta


def _get_memory_dir() -> Path:
    p = Path.cwd() / "memory"
    p.mkdir(parents=True, exist_ok=True)
    return p


def append_summary(summary: str, title: str = "") -> str:
    """追加一条会话摘要到今日文件"""
    memory_dir = _get_memory_dir()
    path = memory_dir / f"{datetime.now().strftime('%Y-%m-%d')}.md"

    ts = datetime.now().strftime("%H:%M")
    block = (
        f"\n## {title or f'会话 {ts}'}\n\n"
        f"{summary}\n\n"
        f"---\n"
    )
    with open(path, "a", encoding="utf-8") as f:
        f.write(block)
    return str(path)


def get_recent(days: int = 7) -> list[dict]:
    """获取最近几天的会话记录"""
    memory_dir = _get_memory_dir()
    results = []
    for i in range(days):
        date = datetime.now() - timedelta(days=i)
        path = memory_dir / f"{date.strftime('%Y-%m-%d')}.md"
        if path.exists():
            results.append({
                "date": date.strftime("%Y-%m-%d"),
                "path": str(path),
                "content": path.read_text(encoding="utf-8"),
            })
    return results


def grep(query: str, days: int = 30) -> list[dict]:
    """在历史日志中搜索关键词"""
    memory_dir = _get_memory_dir()
    results = []
    for i in range(days):
        date = datetime.now() - timedelta(days=i)
        path = memory_dir / f"{date.strftime('%Y-%m-%d')}.md"
        if path.exists():
            content = path.read_text(encoding="utf-8")
            if query.lower() in content.lower():
                lines = [l.strip() for l in content.split("\n")
                         if query.lower() in l.lower()]
                results.append({
                    "date": date.strftime("%Y-%m-%d"),
                    "path": str(path),
                    "matches": lines[:5],
                })
    return results
```

- [ ] **Step 2: Commit**

```bash
git add packages/mcp-server/src/backends/md_backend.py
git commit -m "feat(mcp): Markdown backend for timeline logs"
```

---

### Task 1.4: 路由层

**Files:**
- Create: `packages/mcp-server/src/router.py`

- [ ] **Step 1: Write router.py**

```python
"""规则驱动路由层 — 80% 关键词匹配，20% 默认走 mem0"""

import re


def route(text: str) -> str:
    """判断输入内容应路由到哪个后端

    Returns: "mem0" | "markdown"
    """
    t = text.strip().lower()

    # ──→ mem0: 显式记住指令 ──
    if re.search(
        r"记住|请注意|以后要知道|牢记|永远记住|"
        r"保存|存一下|记下来|别忘了|记录|保留|标记",
        t,
    ):
        return "mem0"

    # ──→ mem0: 偏好/规则/约定 ──
    if re.search(
        r"用|要用|不要用|首选用|请用|建议用|倾向于|"
        r"偏好|喜欢|习惯|风格|命名|格式|"
        r"规范|规则|约定|标准|推荐",
        t,
    ):
        return "mem0"

    # ──→ mem0: 身份/背景/事实 ──
    if re.search(
        r"我是|我叫|我是一名|我在做|我的项目|"
        r"这个项目|这里是|使用了|采用了|基于|依赖|版本|地址|端口",
        t,
    ):
        return "mem0"

    # ──→ mem0: 解法/知识 ──
    if re.search(
        r"怎么解决|怎么修|如何修复|如何解决|怎么处理|"
        r"解法|解决方案|解决办法|修复方案|最佳实践|"
        r"之前怎么处理|当时怎么搞|有没有遇到过|遇到过吗",
        t,
    ):
        return "mem0"

    # ──→ mem0: 任务状态（MVP 暂存 mem0）──
    if re.search(
        r"待办|todo|待处理|任务|事项|"
        r"卡在|卡住|阻塞|受阻|停滞|"
        r"还没做|未完成|还没完成|"
        r"下一步|接下来要做|需要做|需要完成|"
        r"进度|状态|进展",
        t,
    ):
        return "mem0"

    # ──→ Markdown: 时间指示词 ──
    if re.search(
        r"昨天|前天|上周|上个月|上星期|"
        r"上次|上回|之前|以前|过去|历史|"
        r"最近|刚才|刚刚|前几天|前几次|"
        r"当时|那时候|那天",
        t,
    ):
        return "markdown"

    # ──→ Markdown: 行为回溯 ──
    if re.search(
        r"之前讨论|之前说过|之前聊过|之前做过|之前提到|"
        r"上次我们|上次会话|上次聊天|上次讨论|"
        r"做了什么|发生了什么|讨论了什么",
        t,
    ):
        return "markdown"

    # ──→ Markdown: 决策回溯 ──
    if re.search(
        r"怎么决定|为什么选|为什么决定|决策原因|"
        r"试过|尝试过|踩过坑|"
        r"回顾|复盘|回看|查看历史",
        t,
    ):
        return "markdown"

    # 默认 → mem0
    return "mem0"
```

- [ ] **Step 2: Commit**

```bash
git add packages/mcp-server/src/router.py
git commit -m "feat(mcp): rule-based router with full keyword coverage"
```

---

### Task 1.5: 审计日志

**Files:**
- Create: `packages/mcp-server/src/audit.py`

- [ ] **Step 1: Write audit.py**

```python
"""审计日志 — 所有记忆操作可追溯"""

import json
from pathlib import Path
from datetime import datetime, timedelta


_AUDIT_DIR = Path.home() / ".agent-memory" / "audit"


def _ensure_dir():
    _AUDIT_DIR.mkdir(parents=True, exist_ok=True)


def log(action: str, **detail):
    _ensure_dir()
    today = datetime.now().strftime("%Y-%m-%d")
    path = _AUDIT_DIR / f"{today}.jsonl"
    entry = {"timestamp": datetime.now().isoformat(), "action": action, **detail}
    with open(path, "a", encoding="utf-8") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")


def query(days: int = 7) -> list[dict]:
    _ensure_dir()
    entries = []
    for i in range(days):
        date = (datetime.now() - timedelta(days=i)).strftime("%Y-%m-%d")
        path = _AUDIT_DIR / f"{date}.jsonl"
        if path.exists():
            with open(path, encoding="utf-8") as f:
                for line in f:
                    if line.strip():
                        entries.append(json.loads(line))
    return entries
```

- [ ] **Step 2: Commit**

```bash
git add packages/mcp-server/src/audit.py
git commit -m "feat(mcp): audit log for all memory operations"
```

---

### Task 1.6: 会话摘要

**Files:**
- Create: `packages/mcp-server/src/summarize.py`

- [ ] **Step 1: Write summarize.py**

```python
"""会话摘要生成 — LLM + fallback"""

import os
import json
import httpx


def generate_summary(conversation_text: str) -> dict:
    """生成结构化摘要，LLM 不可用时返回截断文本"""
    api_key = os.environ.get("ANTHROPIC_API_KEY") or os.environ.get("OPENAI_API_KEY")
    if not api_key:
        return _fallback(conversation_text)

    try:
        if os.environ.get("ANTHROPIC_API_KEY"):
            return _with_claude(conversation_text)
        return _with_openai(conversation_text)
    except Exception:
        return _fallback(conversation_text)


def _fallback(text: str) -> dict:
    return {
        "summary": text[:2000] if len(text) > 2000 else text,
        "facts": [],
        "model": "fallback-truncation",
    }


def _with_claude(text: str) -> dict:
    resp = httpx.post(
        "https://api.anthropic.com/v1/messages",
        headers={
            "x-api-key": os.environ["ANTHROPIC_API_KEY"],
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        },
        json={
            "model": "claude-sonnet-4-20250506",
            "max_tokens": 1024,
            "messages": [{
                "role": "user",
                "content": f"为以下编码会话生成结构化摘要。"
                           f"输出 JSON: {{\"summary\": \"...\", \"facts\": [\"...\"]}}\n\n{text[:8000]}",
            }],
        },
        timeout=30,
    )
    return _parse_llm_response(resp.json())


def _with_openai(text: str) -> dict:
    resp = httpx.post(
        "https://api.openai.com/v1/chat/completions",
        headers={
            "authorization": f"Bearer {os.environ['OPENAI_API_KEY']}",
            "content-type": "application/json",
        },
        json={
            "model": "gpt-4o-mini",
            "max_tokens": 1024,
            "messages": [{
                "role": "user",
                "content": f"为以下编码会话生成结构化摘要。"
                           f"输出 JSON: {{\"summary\": \"...\", \"facts\": [\"...\"]}}\n\n{text[:8000]}",
            }],
        },
        timeout=30,
    )
    return _parse_llm_response(resp.json())


def _parse_llm_response(data: dict) -> dict:
    try:
        content = (
            data.get("content", [{}])[0].get("text", "")
            if "content" in data
            else data.get("choices", [{}])[0].get("message", {}).get("content", "")
        )
        # 提取 JSON
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0]
        elif "```" in content:
            content = content.split("```")[1].split("```")[0]
        result = json.loads(content.strip())
        return {
            "summary": result.get("summary", content[:500]),
            "facts": result.get("facts", []),
            "model": "llm",
        }
    except (json.JSONDecodeError, KeyError, IndexError):
        return _fallback(content[:500] if content else "summary unavailable")
```

- [ ] **Step 2: Commit**

```bash
git add packages/mcp-server/src/summarize.py
git commit -m "feat(mcp): LLM session summary with fallback"
```

---

### Task 1.7: MCP 服务入口

**Files:**
- Create: `packages/mcp-server/src/server.py`

- [ ] **Step 1: Write server.py**

```python
"""Agent 记忆系统 MCP 服务入口"""

from fastmcp import FastMCP

from .router import route
from .backends import mem0_backend, md_backend
from .summarize import generate_summary
from . import audit

mcp = FastMCP("agent-memory")


@mcp.tool()
def remember(
    content: str,
    tags: list[str] = [],
    importance: int = 5,
    auto_verify: bool = False,
    project_id: str | None = None,
) -> dict:
    """记住一条信息。

    Args:
        content: 要记住的内容
        tags: 分类标签，如 ["coding-style", "preference"]
        importance: 重要度 1-10，>8 会后台验证
        auto_verify: 后台 LLM 去噪（Hook 自动提取时启用）
        project_id: 项目隔离
    """
    target = route(content)
    result = mem0_backend.add(content, project_id=project_id, tags=tags)
    audit.log("remember", content_summary=content[:50], backend=target, tags=tags)
    return {"id": result.get("id"), "backend": target, "status": "stored"}


@mcp.tool()
def recall(
    query: str,
    limit: int = 10,
    project_id: str | None = None,
) -> list[dict]:
    """搜索相关记忆。

    自动路由到最合适的后端，融合排序后返回。
    Args:
        query: 自然语言查询
        limit: 返回条数
        project_id: 项目隔离
    """
    target = route(query)
    results = []

    if target == "markdown":
        # 时间线查询 → 先查 Markdown
        md_results = md_backend.grep(query)
        results.extend({
            "content": r["content"],
            "date": r["date"],
            "source": "markdown",
            "relevance": 0.8,
        } for r in md_results[:limit])
        # 辅以 mem0
        mem_results = mem0_backend.search(query, limit=limit // 2)
        results.extend({
            "content": r.get("memory", ""),
            "score": r.get("score", 0),
            "source": "mem0",
        } for r in mem_results)
    else:
        # 默认 mem0
        mem_results = mem0_backend.search(query, limit=limit)
        results.extend({
            "content": r.get("memory", ""),
            "score": r.get("score", 0),
            "source": "mem0",
        } for r in mem_results)

    audit.log("recall", query_summary=query[:50], backend=target)
    return results[:limit]


@mcp.tool()
def summarize(context: str) -> dict:
    """生成会话摘要并持久化。

    自动调用 LLM 生成摘要，写入 Markdown 日志并提取事实存入 mem0。
    Args:
        context: 当前会话文本
    """
    result = generate_summary(context)
    # 写 Markdown
    path = md_backend.append_summary(result["summary"])
    # 提取事实存 mem0
    for fact in result.get("facts", []):
        mem0_backend.add(fact, tags=["auto-extracted"])
    audit.log("summarize", summary_len=len(result["summary"]), facts_count=len(result.get("facts", [])))
    return {"summary": result["summary"], "file": path, "facts": result.get("facts", [])}


@mcp.tool()
def forget(pattern: str, backend: str | None = None) -> dict:
    """删除匹配的记忆。

    Args:
        pattern: 内容关键词
        backend: "mem0" | "markdown" | None（全部）
    """
    # MVP 只实现 mem0 删除，Markdown 需要手动
    deleted = 0
    # mem0 目前没有批量 delete API，标记为待扩展
    audit.log("forget", pattern=pattern)
    return {"deleted": deleted, "status": "not_fully_implemented"}


@mcp.tool()
def memory_stats() -> dict:
    """获取记忆统计"""
    return mem0_backend.stats()


@mcp.tool()
def audit_log(days: int = 7) -> list[dict]:
    """查询操作审计日志"""
    return audit.query(days=days)


if __name__ == "__main__":
    mcp.run()
```

- [ ] **Step 2: Commit**

```bash
git add packages/mcp-server/src/server.py
git commit -m "feat(mcp): FastMCP server with all tools"
```

---

### Task 1.8: Python CLI（Hook 桥接）

**Files:**
- Create: `packages/python-cli/pyproject.toml`
- Create: `packages/python-cli/src/__init__.py`
- Create: `packages/python-cli/src/main.py`

- [ ] **Step 1: Create pyproject.toml**

```toml
[build-system]
requires = ["setuptools>=68.0"]
build-backend = "setuptools.backends._legacy:_Backend"

[project]
name = "agent-memory-cli"
version = "0.1.0"
description = "Agent 记忆系统 Hook CLI"
requires-python = ">=3.10"
dependencies = []

[project.scripts]
agent-memory = "src.main:main"
```

- [ ] **Step 2: Write main.py**

```python
"""Hook 桥接 CLI — Hook 通过 shell 调用此命令

Usage:
    agent-memory recall         # 读取最近上下文
    agent-memory summarize      # 生成会话摘要
"""

import sys
import json
from pathlib import Path

# 直接引用 MCP 服务的后端代码
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent / "mcp-server" / "src"))
from backends import mem0_backend, md_backend


def cmd_recall():
    """Hook onSessionStart: 读取最近记忆上下文"""
    results = mem0_backend.search("当前项目上下文", limit=5)
    recent = md_backend.get_recent(days=3)
    output = {"mem0": results, "recent_sessions": recent}
    # 写入临时文件供 MCP 服务读取
    tmp = Path.home() / ".agent-memory" / "context.json"
    tmp.parent.mkdir(parents=True, exist_ok=True)
    tmp.write_text(json.dumps(output, ensure_ascii=False, indent=2))
    print(f"Context written to {tmp}")


def cmd_summarize():
    """Hook onSessionEnd: 生成会话摘要"""
    # 从临时文件读取当前会话上下文
    ctx_file = Path.home() / ".agent-memory" / "current_session.txt"
    if not ctx_file.exists():
        print("No session context found", file=sys.stderr)
        return
    text = ctx_file.read_text(encoding="utf-8")

    from summarize import generate_summary
    result = generate_summary(text)
    md_backend.append_summary(result["summary"])
    for fact in result.get("facts", []):
        mem0_backend.add(fact, tags=["auto-extracted"])
    print(f"Summary written: {result['summary'][:100]}...")


def main():
    if len(sys.argv) < 2:
        print("Usage: agent-memory recall|summarize", file=sys.stderr)
        sys.exit(1)
    cmd = sys.argv[1]
    if cmd == "recall":
        cmd_recall()
    elif cmd == "summarize":
        cmd_summarize()
    else:
        print(f"Unknown command: {cmd}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
```

- [ ] **Step 3: Commit**

```bash
git add packages/python-cli/
git commit -m "feat(cli): Hook bridge CLI for recall/summarize"
```

---

## Phase 2: CLI 安装器

### Task 2.1: Package scaffold

**Files:**
- Create: `packages/cli/package.json`
- Create: `packages/cli/tsconfig.json`

- [ ] **Step 1: Write package.json**

```json
{
  "name": "@agent-memory/init",
  "version": "0.1.0",
  "description": "一键安装 Agent 记忆系统",
  "bin": {
    "agent-memory-init": "./dist/index.js"
  },
  "scripts": {
    "build": "tsc",
    "prepublish": "npm run build"
  },
  "dependencies": {},
  "devDependencies": {
    "typescript": "^5.5.0",
    "@types/node": "^20.0.0"
  }
}
```

- [ ] **Step 2: Write tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Commit**

```bash
git add packages/cli/package.json packages/cli/tsconfig.json
git commit -m "chore(cli): scaffold npx package"
```

---

### Task 2.2: Utils（配置读写）

**Files:**
- Create: `packages/cli/src/utils.ts`

- [ ] **Step 1: Write utils.ts**

```typescript
import { execSync } from "child_process";
import { existsSync, mkdirSync, writeFileSync, readFileSync, appendFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";

export const MEMORY_DIR = join(process.cwd(), "memory");
export const MEMORY_DOT_DIR = join(process.cwd(), ".memory");
export const CONFIG_DIR = join(homedir(), ".agent-memory");
export const CONFIG_PATH = join(CONFIG_DIR, "config.yaml");
export const HOOKS_PATH = join(process.cwd(), ".claude", "hooks.json");
export const CLAUDE_MD_PATH = join(process.cwd(), "CLAUDE.md");
export const SETTINGS_PATH = join(process.cwd(), ".claude", "settings.local.json");

export interface InstallOptions {
  withTasks?: boolean;
  withExperience?: boolean;
  withStructure?: boolean;
}

export function ensureDir(dir: string): void {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

export function pipInstall(packageName: string): boolean {
  try {
    execSync(`pip install ${packageName}`, { stdio: "inherit" });
    return true;
  } catch {
    return false;
  }
}

export function writeConfig(userId = "default", projectId = ""): void {
  const config = `user_id: ${userId}
project_id: ${projectId || "null"}
memory_dir: ${MEMORY_DIR}
chroma_dir: ${join(MEMORY_DOT_DIR, "chroma")}

llm:
  provider: auto
  api_key_env: ANTHROPIC_API_KEY

mcp:
  transport: stdio
  port: 8710
`;
  ensureDir(CONFIG_DIR);
  writeFileSync(CONFIG_PATH, config, "utf-8");
}

export function writeHooks(): void {
  const hooks = {
    onSessionStart: ["agent-memory recall"],
    onSessionEnd: ["agent-memory summarize"],
  };
  ensureDir(join(process.cwd(), ".claude"));
  writeFileSync(HOOKS_PATH, JSON.stringify(hooks, null, 2), "utf-8");
}

export function writeClaudeMd(): void {
  const guide = `\n## 记忆系统\n\n你拥有持久记忆能力。当用户说"记住""注意""以后要知道"等时，主动调用 remember() 工具。\n会话结束时系统会自动 summarize，不需要你手动操作。\n`;

  if (existsSync(CLAUDE_MD_PATH)) {
    const existing = readFileSync(CLAUDE_MD_PATH, "utf-8");
    if (!existing.includes("## 记忆系统")) {
      appendFileSync(CLAUDE_MD_PATH, guide, "utf-8");
    }
  } else {
    writeFileSync(CLAUDE_MD_PATH, guide, "utf-8");
  }
}

export function writeMcpConfig(serverScriptPath: string): void {
  const config = {
    "mcpServers": {
      "agent-memory": {
        "command": "python",
        "args": [serverScriptPath],
        "env": {},
      },
    },
  };
  ensureDir(join(process.cwd(), ".claude"));
  writeFileSync(SETTINGS_PATH, JSON.stringify(config, null, 2), "utf-8");
}

export function removeConfig(): void {
  try {
    // 恢复 CLAUDE.md
    if (existsSync(CLAUDE_MD_PATH)) {
      let content = readFileSync(CLAUDE_MD_PATH, "utf-8");
      content = content.replace(/\n## 记忆系统\n\n[\s\S]*?(?=\n## |$)/, "");
      writeFileSync(CLAUDE_MD_PATH, content.trim(), "utf-8");
    }
    // 删除 hooks
    if (existsSync(HOOKS_PATH)) {
      writeFileSync(HOOKS_PATH, "{}", "utf-8");
    }
    // MCP 配置由用户手动处理
    console.log("Cleanup complete. MCP config in .claude/settings.local.json needs manual removal.");
  } catch (e) {
    console.error("Cleanup failed:", e);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/cli/src/utils.ts
git commit -m "feat(cli): config/install utility functions"
```

---

### Task 2.3: Install + Remove 命令

**Files:**
- Create: `packages/cli/src/install.ts`
- Create: `packages/cli/src/remove.ts`
- Create: `packages/cli/src/index.ts`

- [ ] **Step 1: Write install.ts**

```typescript
import { join } from "path";
import {
  ensureDir,
  pipInstall,
  writeConfig,
  writeHooks,
  writeClaudeMd,
  writeMcpConfig,
  MEMORY_DIR,
  MEMORY_DOT_DIR,
  InstallOptions,
} from "./utils";

export function runInstall(options: InstallOptions = {}): void {
  console.log("🔧 Installing Agent Memory System...\n");

  // 1. 目录
  console.log("📁 Creating directories...");
  ensureDir(MEMORY_DIR);
  ensureDir(MEMORY_DOT_DIR);

  // 2. pip install mem0
  console.log("📦 Installing mem0ai...");
  if (pipInstall("mem0ai")) {
    console.log("   ✅ mem0ai installed");
  } else {
    console.log("   ⚠️  pip install failed. Run manually: pip install mem0ai");
  }

  // 3. 配置
  console.log("⚙️  Writing config...");
  writeConfig();
  console.log("   ✅ Config written to ~/.agent-memory/config.yaml");

  // 4. MCP
  const serverScript = join(process.cwd(), "packages", "mcp-server", "src", "server.py");
  console.log("🔌 Configuring MCP...");
  writeMcpConfig(serverScript);
  console.log(`   ✅ MCP configured for ${serverScript}`);

  // 5. Hooks
  console.log("🔄 Configuring Hooks...");
  writeHooks();
  console.log("   ✅ Hooks written to .claude/hooks.json");

  // 6. CLAUDE.md
  console.log("📝 Updating CLAUDE.md...");
  writeClaudeMd();
  console.log("   ✅ CLAUDE.md updated");

  // 7. 可选组件
  if (options.withTasks) {
    console.log("📋 Installing beads (task management)...");
    pipInstall("beads");
  }

  console.log("\n✅ Installation complete!");
  console.log("   Restart Claude Code for changes to take effect.");
  console.log("   Run 'agent-memory dashboard' to view the dashboard.");
}
```

- [ ] **Step 2: Write remove.ts**

```typescript
import { removeConfig } from "./utils";

export function runRemove(): void {
  console.log("🧹 Removing Agent Memory System...\n");
  removeConfig();
  console.log("\n✅ Removal complete!");
  console.log("   Your memory data (memory/ and .memory/) has been preserved.");
  console.log("   To fully remove, delete those directories manually if desired.");
}
```

- [ ] **Step 3: Write index.ts**

```typescript
#!/usr/bin/env node

import { runInstall } from "./install";
import { runRemove } from "./remove";

const args = process.argv.slice(2);
const command = args[0] || "init";

switch (command) {
  case "init":
  case "install":
    runInstall({
      withTasks: args.includes("--with-tasks"),
      withExperience: args.includes("--with-experience"),
      withStructure: args.includes("--with-structure"),
    });
    break;
  case "remove":
  case "uninstall":
    runRemove();
    break;
  case "dashboard":
    console.log("Starting dashboard... (coming soon)");
    // 后续接入 dashboard
    break;
  default:
    console.log(`Usage: npx @agent-memory/init [--with-tasks] [--with-experience] [--with-structure]`);
    console.log(`       npx @agent-memory/remove`);
    process.exit(1);
}
```

- [ ] **Step 4: Build and verify**

```bash
cd f:/AI/memory/packages/cli
npm install
npx tsc --noEmit  # type check only, don't output
```

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/install.ts packages/cli/src/remove.ts packages/cli/src/index.ts
git commit -m "feat(cli): install and remove commands"
```

---

## Phase 3: Dashboard

### Task 3.1: FastAPI 后端

**Files:**
- Create: `packages/dashboard/backend/requirements.txt`
- Create: `packages/dashboard/backend/src/main.py`
- Create: `packages/dashboard/backend/src/config.py`
- Create: `packages/dashboard/backend/src/routers/__init__.py`
- Create: `packages/dashboard/backend/src/routers/memories.py`
- Create: `packages/dashboard/backend/src/routers/sessions.py`
- Create: `packages/dashboard/backend/src/routers/stats.py`

- [ ] **Step 1: Write requirements.txt**

```
fastapi>=0.110.0
uvicorn>=0.27.0
```

- [ ] **Step 2: Write config.py**

```python
"""Dashboard 配置 — 共享 MCP 服务的 mem0 配置"""

from pathlib import Path
import yaml

_CONFIG_PATH = Path.home() / ".agent-memory" / "config.yaml"


def load_config() -> dict:
    if _CONFIG_PATH.exists():
        return yaml.safe_load(_CONFIG_PATH.read_text()) or {}
    return {
        "user_id": "default",
        "memory_dir": str(Path.cwd() / "memory"),
        "chroma_dir": str(Path.cwd() / ".memory" / "chroma"),
    }
```

- [ ] **Step 3: Write main.py**

```python
"""Dashboard FastAPI 入口"""

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path

from .routers import memories, sessions, stats

app = FastAPI(title="Agent Memory Dashboard")

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

app.include_router(memories.router, prefix="/api")
app.include_router(sessions.router, prefix="/api")
app.include_router(stats.router, prefix="/api")

# 挂载前端静态文件
static_dir = Path(__file__).resolve().parent.parent / "frontend" / "dist"
if static_dir.exists():
    app.mount("/", StaticFiles(directory=str(static_dir), html=True), name="frontend")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8712)
```

- [ ] **Step 4: Write memories router**

```python
"""记忆 CRUD API"""

from fastapi import APIRouter, Query
from pydantic import BaseModel

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent.parent / "mcp-server" / "src"))
from backends import mem0_backend

router = APIRouter(tags=["memories"])


@router.get("/memories")
def list_memories(
    q: str = "",
    limit: int = 50,
    project_id: str | None = None,
):
    if q:
        results = mem0_backend.search(q, limit=limit, project_id=project_id)
    else:
        results = mem0_backend.search("", limit=limit, project_id=project_id)
    return {"results": results, "total": len(results)}


@router.delete("/memories/{memory_id}")
def delete_memory(memory_id: str):
    mem0_backend.delete(memory_id)
    return {"status": "deleted", "id": memory_id}
```

- [ ] **Step 5: Write sessions router**

```python
"""会话时间线 API"""

from fastapi import APIRouter

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent.parent / "mcp-server" / "src"))
from backends import md_backend

router = APIRouter(tags=["sessions"])


@router.get("/sessions")
def list_sessions(days: int = 30):
    return {"sessions": md_backend.get_recent(days=days)}


@router.get("/sessions/{date}")
def get_session(date: str):
    path = Path.cwd() / "memory" / f"{date}.md"
    if path.exists():
        return {"date": date, "content": path.read_text(encoding="utf-8")}
    return {"date": date, "content": ""}
```

- [ ] **Step 6: Write stats router**

```python
"""统计 API"""

from fastapi import APIRouter

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent.parent / "mcp-server" / "src"))
from backends import mem0_backend, md_backend

router = APIRouter(tags=["stats"])


@router.get("/stats")
def get_stats():
    m = mem0_backend.stats()
    sessions = md_backend.get_recent(days=90)
    return {
        "total_memories": m["total"],
        "total_sessions": len(sessions),
        "recent_sessions": [s["date"] for s in sessions[:7]],
    }
```

- [ ] **Step 7: Write __init__.py**

```python
```

- [ ] **Step 8: Commit**

```bash
git add packages/dashboard/backend/
git commit -m "feat(dashboard): FastAPI backend for CRUD + stats"
```

---

### Task 3.2: React + Semi Design 前端

**Files:**
- Create: `packages/dashboard/frontend/package.json`
- Create: `packages/dashboard/frontend/tsconfig.json`
- Create: `packages/dashboard/frontend/index.html`
- Create: `packages/dashboard/frontend/vite.config.ts`
- Create: `packages/dashboard/frontend/src/main.tsx`
- Create: `packages/dashboard/frontend/src/App.tsx`
- Create: `packages/dashboard/frontend/src/pages/Overview.tsx`
- Create: `packages/dashboard/frontend/src/pages/Memories.tsx`
- Create: `packages/dashboard/frontend/src/pages/Timeline.tsx`
- Create: `packages/dashboard/frontend/src/pages/Settings.tsx`

- [ ] **Step 1: Write package.json**

```json
{
  "name": "@agent-memory/dashboard",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build"
  },
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "@douyinfe/semi-ui": "^2.60.0",
    "@douyinfe/semi-icons": "^2.60.0",
    "react-router-dom": "^6.23.0",
    "recharts": "^2.12.0"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "vite": "^5.4.0"
  }
}
```

- [ ] **Step 2: Write tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Write index.html**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Agent Memory Dashboard</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>
```

- [ ] **Step 4: Write vite.config.ts**

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { "/api": "http://127.0.0.1:8712" },
  },
  build: {
    outDir: "dist",
  },
});
```

- [ ] **Step 5: Write main.tsx**

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
// Semi Design 样式
import "@douyinfe/semi-ui/dist/css/semi.min.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

- [ ] **Step 6: Write App.tsx**

```tsx
import React, { useEffect, useState } from "react";
import { Layout, Nav, Avatar, Typography } from "@douyinfe/semi-ui";
import { IconHome, IconHistogram, IconBox, IconSetting } from "@douyinfe/semi-icons";
import Overview from "./pages/Overview";
import Memories from "./pages/Memories";
import Timeline from "./pages/Timeline";
import Settings from "./pages/Settings";

const { Sider, Content, Header } = Layout;

export interface Stats {
  total_memories: number;
  total_sessions: number;
  recent_sessions: string[];
}

function App() {
  const [page, setPage] = useState("overview");
  const [stats, setStats] = useState<Stats>({ total_memories: 0, total_sessions: 0, recent_sessions: [] });

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {});
  }, []);

  const pages: Record<string, React.ReactNode> = {
    overview: <Overview stats={stats} />,
    memories: <Memories />,
    timeline: <Timeline />,
    settings: <Settings />,
  };

  return (
    <Layout style={{ height: "100vh" }}>
      <Sider>
        <Nav
          defaultSelectedKeys={["overview"]}
          items={[
            { itemKey: "overview", text: "总览", icon: <IconHome /> },
            { itemKey: "memories", text: "记忆浏览", icon: <IconBox /> },
            { itemKey: "timeline", text: "时间线", icon: <IconHistogram /> },
            { itemKey: "settings", text: "设置", icon: <IconSetting /> },
          ]}
          onSelect={(e) => setPage(e.itemKey)}
          header={{
            logo: <Avatar size="small" style={{ backgroundColor: "#0077FA" }}>M</Avatar>,
            text: <Typography.Title heading={6}>Agent Memory</Typography.Title>,
          }}
          footer={{ collapseButton: true }}
        />
      </Sider>
      <Content style={{ padding: "24px", overflow: "auto" }}>
        {pages[page] || <Overview stats={stats} />}
      </Content>
    </Layout>
  );
}

export default App;
```

- [ ] **Step 7: Write Overview.tsx**

```tsx
import React from "react";
import { Card, Row, Col, Typography, Table } from "@douyinfe/semi-ui";
import { IconPlus, IconComment, IconClockHistory } from "@douyinfe/semi-icons";
import { Stats } from "../App";

interface Props {
  stats: Stats;
}

export default function Overview({ stats }: Props) {
  const cards = [
    { title: "记忆总数", value: stats.total_memories, icon: <IconPlus />, color: "#0077FA" },
    { title: "会话总数", value: stats.total_sessions, icon: <IconComment />, color: "#00A85D" },
    { title: "近 7 天会话", value: stats.recent_sessions.length, icon: <IconClockHistory />, color: "#FA7D00" },
  ];

  return (
    <div>
      <Typography.Title heading={3} style={{ marginBottom: 24 }}>总览</Typography.Title>
      <Row gutter={[16, 16]}>
        {cards.map((c) => (
          <Col span={8} key={c.title}>
            <Card
              title={c.title}
              headerExtraContent={c.icon}
              style={{ borderLeft: `4px solid ${c.color}` }}
            >
              <Typography.Title heading={2}>{c.value}</Typography.Title>
            </Card>
          </Col>
        ))}
      </Row>
      <Typography.Title heading={5} style={{ marginTop: 32, marginBottom: 16 }}>最近会话</Typography.Title>
      <Table
        dataSource={stats.recent_sessions.map((d, i) => ({ key: i, date: d }))}
        columns={[{ title: "日期", dataIndex: "date" }]}
        pagination={false}
      />
    </div>
  );
}
```

- [ ] **Step 8: Write Memories.tsx**

```tsx
import React, { useEffect, useState } from "react";
import { Input, Table, Button, Tag, Typography, Space } from "@douyinfe/semi-ui";

interface Memory {
  id?: string;
  content?: string;
  memory?: string;
  score?: number;
  source?: string;
}

export default function Memories() {
  const [query, setQuery] = useState("");
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(false);

  const search = (q: string) => {
    setLoading(true);
    setQuery(q);
    fetch(`/api/memories?q=${encodeURIComponent(q)}&limit=50`)
      .then((r) => r.json())
      .then((data) => setMemories(data.results || []))
      .catch(() => setMemories([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => search(""), []);

  const columns = [
    { title: "内容", dataIndex: "memory", render: (t: string) => t?.slice(0, 80) },
    { title: "来源", dataIndex: "source", render: (t: string) => <Tag>{t || "mem0"}</Tag> },
    { title: "相关性", dataIndex: "score", render: (s: number) => s?.toFixed(2) },
  ];

  return (
    <div>
      <Typography.Title heading={3} style={{ marginBottom: 16 }}>记忆浏览</Typography.Title>
      <Space style={{ marginBottom: 16 }}>
        <Input
          placeholder="搜索记忆..."
          value={query}
          onChange={(v) => search(v)}
          style={{ width: 400 }}
          showClear
        />
        <Button onClick={() => search(query)} loading={loading}>搜索</Button>
      </Space>
      <Table dataSource={memories} columns={columns} loading={loading} pagination={{ pageSize: 20 }} />
    </div>
  );
}
```

- [ ] **Step 9: Write Timeline.tsx**

```tsx
import React, { useEffect, useState } from "react";
import { List, Typography, Spin } from "@douyinfe/semi-ui";

interface Session {
  date: string;
  content: string;
}

export default function Timeline() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/sessions?days=30")
      .then((r) => r.json())
      .then((data) => setSessions(data.sessions || []))
      .catch(() => setSessions([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spin />;

  return (
    <div>
      <Typography.Title heading={3} style={{ marginBottom: 16 }}>会话时间线</Typography.Title>
      <List
        dataSource={sessions}
        renderItem={(item) => (
          <List.Item
            header={<Typography.Text strong>{item.date}</Typography.Text>}
            main={
              <div
                style={{ whiteSpace: "pre-wrap", maxHeight: 200, overflow: "hidden" }}
              >
                {item.content.slice(0, 500)}
              </div>
            }
          />
        )}
      />
    </div>
  );
}
```

- [ ] **Step 10: Write Settings.tsx**

```tsx
import React from "react";
import { Typography, Card, Descriptions } from "@douyinfe/semi-ui";

export default function Settings() {
  return (
    <div>
      <Typography.Title heading={3} style={{ marginBottom: 16 }}>设置</Typography.Title>
      <Card title="系统信息">
        <Descriptions
          data={[
            { key: "版本", value: "0.1.0" },
            { key: "MCP 端口", value: "8710" },
            { key: "Dashboard 端口", value: "8712" },
            { key: "记忆后端", value: "mem0 (Chroma)" },
            { key: "日志后端", value: "Markdown (memory/)" },
          ]}
        />
      </Card>
    </div>
  );
}
```

- [ ] **Step 11: Build frontend**

```bash
cd f:/AI/memory/packages/dashboard/frontend
npm install
npm run build
```

- [ ] **Step 12: Commit**

```bash
git add packages/dashboard/frontend/
git commit -m "feat(dashboard): React + Semi Design frontend"
```

---

## Phase 4: 多 Agent 配置适配

### Task 4.1: Claude Code hooks.json

**Files:**
- Create: `packages/configs/claude-code/hooks.json`

- [ ] **Step 1: Write hooks.json**

```json
{
  "onSessionStart": ["agent-memory recall"],
  "onSessionEnd": ["agent-memory summarize"]
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/configs/claude-code/
git commit -m "feat(config): Claude Code hooks config"
```

---

### Task 4.2: Cursor .cursorrules

**Files:**
- Create: `packages/configs/cursor/.cursorrules`

- [ ] **Step 1: Write .cursorrules**

```markdown
你拥有持久记忆能力，通过 agent-memory MCP 服务访问。

规则：
1. 当用户说"记住""注意""以后要知道"时，主动调用 remember() 工具
2. 当用户询问"之前""上次""历史"时，主动调用 recall() 工具
3. 你不需要手动 summarize，会话结束时系统自动处理

MCP 工具：
- remember(content, tags, importance, project_id) — 存记忆
- recall(query, limit, project_id) — 查记忆
```

- [ ] **Step 2: Commit**

```bash
git add packages/configs/cursor/
git commit -m "feat(config): Cursor .cursorrules"
```

---

### Task 4.3: OpenClaw / Codex CLI MCP 配置

**Files:**
- Create: `packages/configs/openclaw/mcp.json`

- [ ] **Step 1: Write mcp.json**

```json
{
  "mcpServers": {
    "agent-memory": {
      "command": "python",
      "args": ["${PROJECT_DIR}/packages/mcp-server/src/server.py"],
      "env": {}
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/configs/openclaw/
git commit -m "feat(config): OpenClaw and Codex CLI MCP config"
```
