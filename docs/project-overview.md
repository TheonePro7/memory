# Agent Memory — 项目文档

> 做一家 Agent 记忆公司。核心产品：让 Agent 安装后自动拥有记忆能力（元认知层）。

---

## 目录

1. [项目概述](#1-项目概述)
2. [架构总览](#2-架构总览)
3. [包结构](#3-包结构)
4. [CLI 安装器（packages/cli）](#4-cli-安装器packagescli)
5. [Python CLI（packages/python-cli）](#5-python-clipackagespython-cli)
6. [MCP 服务器（packages/mcp-server）](#6-mcp-服务器packagesmcp-server)
7. [Dashboard（packages/dashboard）](#7-dashboardpackagesdashboard)
8. [开发工作流](#8-开发工作流)
9. [部署与发布](#9-部署与发布)
10. [设计决策记录](#10-设计决策记录)

---

## 1. 项目概述

### 1.1 定位

Agent Memory 是一个为 Claude Code 提供持久记忆能力的元认知层。它不是另一个向量数据库或 RAG 工具——它是一个**安装即用**的记忆系统，让 AI 在会话之间保持上下文连续性。

### 1.2 核心能力

| 能力 | 说明 | 技术实现 |
|------|------|----------|
| 记忆存储 | 保存关键信息跨会话持久化 | ChromaDB（向量）+ SQLite（结构化） |
| 语义搜索 | 自然语言查询历史记忆 | ChromaDB + fastembed 向量化 |
| 智能加工 | LLM 自动提取实体/动作/摘要 | processor.py 调用 Anthropic/OpenAI |
| 任务管理 | 结构化的任务跟踪与状态流转 | SQLite CRUD + beads 同步 |
| 一键安装 | 新项目 5 步自动激活 | TypeScript CLI + MCP 配置注入 |

### 1.3 安装方式

```bash
npx @agent-memory/init                    # 当前目录安装
npx @agent-memory/init ./my-project       # 指定项目
npx @agent-memory/init --dry-run          # 仅检测环境
npx @agent-memory/remove                  # 卸载
npx @agent-memory/remove ./my-project     # 从指定项目卸载
```

---

## 2. 架构总览

### 2.1 组件关系

```
┌─────────────────────────────────────────────────────────┐
│                    用户项目目录                            │
│                                                           │
│  .claude/                                                 │
│  ├── settings.local.json    ← MCP 服务器配置              │
│  └── hooks.json             ← 自动 recall/summarize       │
│                                                           │
│  CLAUDE.md                  ← 记忆系统说明                 │
└──────────────────────────────────────────────────────────┘
          ↕ MCP 协议 (stdio)
┌─────────────────────────────────────────────────────────┐
│                agent-memory-mcp (Python)                  │
│                                                           │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐ │
│  │ remember()  │  │  recall()   │  │  summarize()     │ │
│  │ MCP Tool    │  │  MCP Tool   │  │  MCP Tool        │ │
│  └──────┬──────┘  └──────┬───────┘  └────────┬─────────┘ │
│         │                │                    │           │
│         ▼                ▼                    ▼           │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐ │
│  │  ChromaDB   │  │  SQLite      │  │  processor.py    │ │
│  │  向量存储    │  │  任务存储     │  │  LLM 提取/重排   │ │
│  └─────────────┘  └──────────────┘  └──────────────────┘ │
│         │                │                    │           │
│         ▼                ▼                    ▼           │
│  ┌─────────────────────────────────────────────────────┐  │
│  │               ~/.agent-memory/                        │  │
│  │  ├── chroma/        向量数据库                        │  │
│  │  ├── tasks.db       SQLite 任务库                     │  │
│  │  └── config.yaml    用户/项目配置                    │  │
│  └─────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### 2.2 数据流

**记忆存储流程：**

```
用户消息 → remember() MCP tool → mem0_backend.store()
  → 1. processor.extract() — LLM 提取 entities/actions/summary
  → 2. ChromaDB 向量化存储（含 metadata）
  → 3. 返回记忆 ID
```

**记忆召回流程：**

```
会话开始 → hooks.json onSessionStart → recall
  → 1. 同步 beads 任务
  → 2. 查询活跃任务
  → 3. 根据 query 语义搜索 ChromaDB
  → 4. processor.rerank() — LLM 重排序结果
  → 5. 写入 context.json 供 Claude Code 读取
```

**会话总结流程：**

```
会话结束 → hooks.json onSessionEnd → summarize
  → 1. 读取本次会话对话摘要
  → 2. 提取涉及的任务（含"完成""修复""实现"关键词）
  → 3. 更新任务状态
  → 4. 保存总结到 ChromaDB
```

### 2.3 配置架构

配置文件位于 `~/.agent-memory/config.yaml`：

```yaml
user_id: default
project_id: my-project
memory_dir: C:\Users\<user>\.agent-memory
chroma_dir: C:\Users\<user>\.agent-memory\chroma

llm:
  provider: auto          # auto | anthropic | openai
  api_key_env: ANTHROPIC_API_KEY   # 环境变量名

mcp:
  transport: stdio
  port: 8710
```

环境变量覆盖：

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `AGENT_MEMORY_DIR` | 记忆数据目录 | `~/.agent-memory` |
| `ANTHROPIC_API_KEY` | Anthropic API 密钥 | - |
| `OPENAI_API_KEY` | OpenAI API 密钥（备选） | - |
| `AGENT_MEMORY_PROJECT_ROOT` | 项目根目录（旧版） | `process.cwd()` |

---

## 3. 包结构

```
memory/
├── packages/
│   ├── cli/                     TypeScript CLI 安装器
│   │   ├── src/
│   │   │   ├── index.ts         入口 — 命令路由
│   │   │   ├── install.ts       安装主流程（5 步）
│   │   │   ├── remove.ts        卸载流程
│   │   │   ├── utils.ts         工具函数（路径/Python/配置）
│   │   │   └── vendor/
│   │   │       └── requirements.txt   Python 依赖
│   │   ├── tests/
│   │   │   ├── utils.test.ts    工具函数测试
│   │   │   └── install.test.ts  集成测试
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── .npmignore
│   │
│   ├── python-cli/              Python CLI 工具
│   │   └── src/
│   │       └── main.py          remember/recall/summarize + task 命令
│   │
│   ├── mcp-server/              MCP 服务器
│   │   ├── src/
│   │   │   ├── server.py        MCP 入口（remember/recall/summarize/task_context）
│   │   │   ├── processor.py     LLM 实体/动作/摘要提取 + 重排序
│   │   │   ├── backends/
│   │   │   │   ├── mem0_backend.py   ChromaDB 向量存储
│   │   │   │   └── task_backend.py   SQLite 任务存储
│   │   │   └── routers/         （Dashboard API 路由）
│   │   ├── tests/
│   │   │   ├── test_task_backend.py  任务 CRUD + beads 同步测试
│   │   │   └── test_cli.py          CLI 命令测试
│   │   └── pyproject.toml
│   │
│   └── dashboard/               Web 管理界面
│       ├── backend/
│       │   └── src/
│       │       ├── main.py      FastAPI 入口
│       │       └── routers/
│       │           ├── memory.py     记忆查询 API
│       │           └── tasks.py      任务 CRUD API
│       └── frontend/
│           └── src/
│               ├── App.tsx      路由 + 布局
│               └── pages/
│                   ├── Dashboard.tsx   记忆统计面板
│                   ├── Search.tsx      记忆搜索
│                   ├── MemoryDetail.tsx 记忆详情
│                   └── Tasks.tsx       任务看板
│
├── docs/
│   ├── project-overview.md      本文档
│   └── superpowers/
│       ├── specs/               设计文档
│       └── plans/               实现计划
│
└── CLAUDE.md                    Claude Code 项目规则
```

---

## 4. CLI 安装器（packages/cli）

### 4.1 职责

TypeScript 编写的 npm 包，用户执行 `npx @agent-memory/init` 后自动完成 5 步安装流程。

### 4.2 安装流程

```
Step 1: 解析目标目录
  └─ 参数路径存在 → resolve 绝对路径
  └─ 无参数 → process.cwd()
  └─ --dry-run 标记 → 仅检测不写入

Step 2: 检测 Python 环境
  └─ python3 --version ≥ 3.10
  └─ 失败 → 提示安装，继续后续步骤

Step 3: 安装 Python 依赖
  └─ 1st try: pip install agent-memory-mcp（PyPI）
  └─ 2nd try: pip install -r vendor/requirements.txt（本地）
  └─ 全部失败 → 提示手动安装，mcpMode=manual

Step 4: 写配置文件
  └─ .claude/settings.local.json  ← MCP 服务器配置
  └─ .claude/hooks.json           ← 自动 recall/summarize
  └─ ~/.agent-memory/config.yaml  ← 项目标识/LLM 配置
  └─ CLAUDE.md                    ← 记忆系统说明段落

Step 5: 报告结果
  └─ 全部成功 → ✓
  └─ 部分失败 → ⚠ 列出需手动处理的项目
```

### 4.3 MCP 配置模式

**PyPI 模式（默认）：**

```json
{
  "mcpServers": {
    "agent-memory": {
      "command": "python",
      "args": ["-m", "agent_memory_mcp"]
    }
  }
}
```

**本地模式（回退）：**

```json
{
  "mcpServers": {
    "agent-memory": {
      "command": "python",
      "args": [".agent-memory/mcp-server/server.py"]
    }
  }
}
```

**Manual 模式（pip 失败）：**

```json
{
  "mcpServers": {
    "agent-memory": {
      "command": "python",
      "args": ["-m", "agent_memory_mcp"]
    }
  }
}
```

### 4.4 卸载流程

```
1. 清理 hooks.json — 删除 onSessionStart/onSessionEnd
2. 清理 settings.local.json — 删除 agent-memory MCP 配置
3. CLAUDE.md 内容保留（用户手动清理）
4. ~/.agent-memory/ 数据保留（用户手动删除）
```

### 4.5 优雅降级原则

- 每步错误独立隔离，不阻断后续
- Python 未检测到 → 仍写入配置（需用户手动装 Python）
- pip 安装失败 → 仍写入配置（需用户手动 pip install）
- 配置合并而非覆盖 → 已有 hooks/settings 保留
- `--dry-run` 只检测不写入

### 4.6 测试

```bash
cd packages/cli

# 运行全部测试
npm test

# 单元测试
npx vitest run tests/utils.test.ts

# 集成测试（需要 Python 环境）
npx vitest run tests/install.test.ts
```

---

## 5. Python CLI（packages/python-cli）

### 5.1 职责

Python 编写的 CLI 工具，提供 remember/recall/summarize 命令及任务管理。

### 5.2 命令参考

```bash
# 记忆操作
python packages/python-cli/src/main.py remember <内容> [--tags tag1,tag2] [--process]
python packages/python-cli/src/main.py recall [查询] [--top-k 5]
python packages/python-cli/src/main.py summarize

# 任务操作
python packages/python-cli/src/main.py task list [--status todo|in_progress|done]
python packages/python-cli/src/main.py task show <id>
python packages/python-cli/src/main.py task start <id>
python packages/python-cli/src/main.py task done [id]    # 无 id 时自动查找当前任务
python packages/python-cli/src/main.py task block <id> [--reason ...]
```

### 5.3 关键逻辑

**`cmd_recall()`** — 会话开始自动执行：
1. 调用 `sync_beads()` 同步 beads 任务
2. 查询 `get_active_tasks()` 获取进行中/阻塞的任务
3. 语义搜索 ChromaDB 获取相关记忆
4. 写入 `context.json`（UTF-8 编码），供 Claude Code 读取

**`cmd_summarize()`** — 会话结束自动执行：
1. 读取对话摘要
2. 扫描含"完成""修复""实现"等关键词的消息
3. 识别涉及的任务并更新状态
4. 保存总结到 ChromaDB

---

## 6. MCP 服务器（packages/mcp-server）

### 6.1 职责

通过 MCP 协议暴露记忆和任务能力给 Claude Code。

### 6.2 MCP 工具

| 工具 | 参数 | 说明 |
|------|------|------|
| `remember` | `content`, `tags`, `process` | 存储记忆（可选 LLM 加工） |
| `recall` | `query`, `project_id`, `top_k` | 语义搜索记忆 |
| `summarize` | `summary` | 会话总结并更新任务 |
| `task_context` | `project_id` | 获取当前任务上下文（活跃+最近任务） |

### 6.3 后端存储

**mem0_backend.py — ChromaDB 向量存储：**

- 集合名：`agent-memory`
- 文档存储：`raw_content`（纯文本）+ `entities`/`actions`/`summary`（LLM 加工后）
- metadata：user_id, project_id, tags, created_at
- 搜索：支持 `$and` 语法的多条件过滤
- 距离函数：cosine

**task_backend.py — SQLite 结构化存储：**

- 三表设计：`tasks`（主表）+ `task_events`（事件流）+ `task_artifacts`（文件引用）
- WAL 模式，row_factory=sqlite3.Row
- 字段：id, title, status, priority, tags, project_id, source, source_id
- 状态流转：todo → in_progress → done（含 blocked 中间态）
- beads 同步：单向增量读取 `.beads/issues.jsonl`，BOM 安全（utf-8-sig）

### 6.4 测试

```bash
cd packages/mcp-server

# 运行全部测试
pytest

# 任务后端测试（共 16 个）
pytest tests/test_task_backend.py -v

# CLI 测试（共 7 个）
pytest tests/test_cli.py -v
```

---

## 7. Dashboard（packages/dashboard）

### 7.1 职责

Web 管理界面，提供记忆可视化和任务管理。

### 7.2 技术栈

- **后端：** FastAPI（Python）
- **前端：** React + TypeScript + Ant Design + Recharts
- **构建：** Vite
- **哈希路由**（支持页面刷新不丢失状态）

### 7.3 页面

| 页面 | 路由 | 功能 |
|------|------|------|
| 仪表盘 | `/` | 记忆总数、项目数、标签云、近期活动时间线 |
| 搜索 | `/search` | 语义搜索 + 按用户/项目/标签筛选 |
| 记忆详情 | `/memory/:id` | 原始内容 + LLM 加工结果 + metadata |
| 任务看板 | `/tasks` | 任务表格、状态筛选、状态统计、事件时间线 |

### 7.4 API 端点

**记忆 API（routers/memory.py）：**

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/search` | 搜索记忆 |
| GET | `/api/memory/{id}` | 获取记忆详情 |
| GET | `/api/stats` | 统计数据 |
| GET | `/api/timeline` | 时间线事件 |

**任务 API（routers/tasks.py）：**

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/tasks` | 列出任务（支持 status 筛选） |
| GET | `/tasks/active` | 活跃任务（in_progress/blocked） |
| GET | `/tasks/{id}` | 任务详情（含事件和制品） |
| POST | `/tasks` | 创建任务 |
| POST | `/tasks/{id}/status` | 更新状态 |
| POST | `/tasks/{id}/events` | 添加事件 |
| POST | `/tasks/sync-beads` | 同步 beads |

### 7.5 启动

```bash
# 后端
cd packages/dashboard/backend
uvicorn src.main:app --reload --port 8000

# 前端
cd packages/dashboard/frontend
npm run dev
```

---

## 8. 开发工作流

### 8.1 8 阶段流程

项目使用 devflow skill 编排开发流程：

| 阶段 | 名称 | 内容 |
|------|------|------|
| -1 | 项目分析 | gitnexus scan → 生成 backlog |
| 0 | 环境检测 | 依赖安装、项目初始化 |
| 1 | Brainstorming | 需求分析 → 设计文档 → 用户签批 |
| 2 | Writing Plans | 拆分任务 → 实施计划 → 用户签批 |
| 3 | Git Worktree | 创建隔离分支 → 初始化环境 |
| 4 | 实施 | Subagent 分任务实现 + 两轮审查 |
| 5 | 代码审查 | 规范审查 + 代码质量审查 |
| 6 | 完成 | 测试验证 → 合并/PR → 清理 |

### 8.2 提交规范

```
feat: 新功能
fix: 修复
chore: 配置/工具
docs: 文档
test: 测试
refactor: 重构
```

### 8.3 测试要求

- CLI 安装器：vitest（8 个测试）
- MCP 服务器：pytest（23 个测试）
- TDD 原则：先写失败测试，再实现，再验证通过

---

## 9. 部署与发布

### 9.1 npm 发布

```bash
cd packages/cli

# 构建
npm run build

# 预览包内容
npm pack --dry-run

# 发布
npm publish

# 验证
mkdir -p /tmp/test-agent-memory && cd /tmp/test-agent-memory
npx @agent-memory/init --dry-run
```

包内容（约 13.3 kB）：
- dist/index.js
- dist/install.js
- dist/remove.js
- dist/utils.js
- package.json
- src/vendor/requirements.txt

### 9.2 PyPI 发布

待创建 `agent-memory-mcp` 包，包含 MCP 服务器代码。

### 9.3 版本策略

CLI 和 MCP 服务器版本号独立但建议同步发布。CLI 安装时从 PyPI 拉取 MCP 包，用户无需手动处理 Python 依赖。

---

## 10. 设计决策记录

### 10.1 为什么 CLI 用 TypeScript 而非 Python？

- npx 无需预装 Python 环境
- npm 生态更适合 CLI 分发（一行命令）
- Python 留作后端和 MCP 服务器（生态更适合 ML/NLP）

### 10.2 为什么 MCP 配置分三种模式？

- **PyPI 模式**：标准路径，用户装了包就能用
- **本地模式**：离线环境或无 PyPI 依赖时用 vendor 回退
- **Manual 模式**：pip 全部失败时确保配置已就位，用户只需补装

三种模式确保不同场景下都能提供最佳体验。

### 10.3 为什么用 ChromaDB + SQLite 双存储？

- ChromaDB：语义搜索，适合"模糊回忆"场景
- SQLite：结构化查询，适合"精确任务跟踪"场景
- 二选一会导致一种场景体验差，两者互补覆盖记忆全场景

### 10.4 为什么 hooks 用 agent-memory 命令而非 python 直接调用？

原始设计是直接在 hooks 中写 `python -m agent_memory_mcp recall`，但：
- 这要求用户安装 Python CLI，增加心智负担
- `agent-memory` 命令可以内聚为统一的入口
- 未来可以加缓存、错误处理等逻辑而不改 hooks

换成 `agent-memory recall` 后 hooks 更简洁，CLI 内部可灵活实现。

### 10.5 为什么是 BOM 安全（utf-8-sig）？

Windows 上 PowerShell 的 `Set-Content` 和部分编辑器会写入 BOM 头，导致 JSON 和 JSONL 解析失败。使用 `utf-8-sig` 自动跳过 BOM，确保跨平台兼容。
