# 设计缺陷修复 — 重构方案

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this spec task-by-task.

**Goal:** 修复记忆项目 9 个设计缺陷，建立干净的分层架构

**Architecture:** 三层架构（MCP/CLI → Core → Backends），CLI 合并入 mcp-server 包，移除死代码和垂悬问题

**Tech Stack:** Python 3.10+, FastMCP, ChromaDB, SQLite

---

## 1. 共享核心层（Core Layer）

### 1.1 新增 `packages/mcp-server/src/core.py`

纯业务逻辑函数，不依赖 MCP 协议或 CLI argv：

```python
# 核心函数签名

def remember(
    content: str,
    tags: list[str] | None = None,
    project_id: str | None = None,
    process: bool = False,
) -> dict:
    """记忆存储：可选 LLM 加工 → 向量存储。"""

def recall(
    query: str,
    limit: int = 10,
    project_id: str | None = None,
    process: bool = False,
) -> list[dict]:
    """记忆搜索：搜索 → 可选重排序 → 格式化。"""

def summarize(
    context: str,
    project_id: str | None = None,
) -> dict:
    """会话总结：LLM 摘要 → 持久化 → 提取事实。"""
```

### 1.2 server.py 变为薄胶水层

```python
@mcp.tool()
def remember(content, tags, importance, auto_verify, project_id, process):
    result = core.remember(content, tags, project_id, process)
    audit.log("remember", ...)
    return {"id": result.get("id"), "backend": "mem0", "status": "stored"}
```

### 1.3 main.py 变为薄胶水层

```python
def cmd_remember():
    content = sys.argv[2]
    result = core.remember(content, tags, project_id, process)
    print(json.dumps(result, ensure_ascii=False))
```

## 2. CLI 命令注册 + 包重构

### 2.1 将 main.py 移入 mcp-server 包

源文件移动：
- `packages/python-cli/src/main.py` → `packages/mcp-server/src/cli.py`
- 重构 CLI 入口为可导入函数
- 删除 `packages/python-cli/` 目录

### 2.2 pyproject.toml 加 entry_points

```toml
[project.scripts]
agent-memory = "agent_memory_mcp.cli:main"
```

### 2.3 更新 npx 安装器路径

`install.ts` 中写 hooks 时指向已注册的 `agent-memory` 命令，不再写 `python packages/python-cli/src/main.py`

## 3. 路由死代码清理

### 3.1 移除 router.route()

- 删除 `from router import route`
- `recall()` 固定走 `mem0_backend.search()` 一条路径
- 移除 `md_backend` 相关的 import 和分支代码

### 3.2 实现 forget()

```python
@mcp.tool()
def forget(memory_id: str) -> dict:
    """通过 ID 删除一条记忆。"""
    ok = mem0_backend.delete(memory_id)
    return {"deleted": 1 if ok else 0, "status": "deleted" if ok else "not_found"}
```

## 4. 垂悬问题清理

### 4.1 SQLite 连接管理

所有 CRUD 函数改用 `with closing(_get_conn()) as conn:`：
- `task_backend.py` 中 10 个函数全部修改

### 4.2 context.json 加 PID

```python
pid = os.getpid()
tmp = Path.home() / ".agent-memory" / f"context.{pid}.json"
```

### 4.3 summarize 任务关联增强

在 `generate_summary()` 的 LLM prompt 加字段 `task_completed`，由 LLM 判断会话是否完成了某个任务，不再用关键词匹配。

### 4.4 补充测试

| 测试文件 | 测试内容 | 用例数 |
|----------|----------|--------|
| `tests/test_mem0_backend.py` | add/search/delete/stats/list_all | 6 |
| `tests/test_md_backend.py` | append_summary/grep/get_recent | 4 |
| `tests/test_summarize.py` | generate_summary（mock LLM） | 3 |
| `tests/test_audit.py` | log/query | 3 |
| `tests/test_processor.py` | 已有 13 个 | 已有 |

## 5. 不变部分

- `processor.py` 不动（已有测试）
- `mem0_backend.py` 的 API 签名不变
- `task_backend.py` 的 API 签名不变
- Dashboard 不动
- TypeScript CLI 的安装流程不变（只改 hooks 写入内容）
- CLAUDE.md / docs 在最后更新
