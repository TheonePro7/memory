# Agent Memory

> 装了这个东西，就变真智能了。

一个让 AI Agent 拥有记忆能力的记忆管理层产品。不是另一个记忆 API，而是 Agent 的记忆操作系统。

## 快速开始

```bash
git clone https://github.com/TheonePro7/memory.git
cd memory

# Windows
.\scripts\setup.ps1

# Linux / macOS
chmod +x scripts/setup.sh && ./scripts/setup.sh
```

### 启动 Dashboard

```bash
python packages/dashboard/backend/src/main.py
# 访问 http://localhost:8712
```

### CLI 使用

```bash
# 记住一条信息
python -m agent_memory_mcp.cli remember "内容" --tags tag1,tag2

# 搜索当前项目的记忆（自动按项目隔离）
python -m agent_memory_mcp.cli recall

# 指定其他项目
python -m agent_memory_mcp.cli remember "内容" --project-id other-project

# 查看裂变邀请码
python -m agent_memory_mcp.cli refer
```

## 系统架构

```
memory/
├── packages/
│   ├── mcp-server/       # MCP 服务 + CLI（核心后端）
│   │   └── src/agent_memory_mcp/
│   │       ├── server.py        # MCP 协议薄胶水
│   │       ├── core.py          # 业务逻辑编排层
│   │       ├── cli.py           # Shell 命令入口
│   │       ├── processor.py     # LLM 实体提取/重排序
│   │       ├── summarize.py     # 会话摘要
│   │       ├── audit.py         # 操作审计日志
│   │       ├── backends/
│   │       │   ├── mem0_backend.py  # ChromaDB 向量存储
│   │       │   ├── md_backend.py    # Markdown 会话日志
│   │       │   ├── task_backend.py  # SQLite 任务管理
│   │       │   ├── quota.py         # 编辑配额 + 裂变
│   │       │   └── adapters/        # 第三方适配器
│   │       │       ├── base.py          # 抽象基类
│   │       │       ├── mem0_adapter.py  # Mem0 读取
│   │       │       └── md_adapter.py    # Basic Memory 读取
│   │       └── tests/           # 97 个测试
│   ├── dashboard/        # Web 管理界面
│   │   ├── backend/      # FastAPI 后端（记忆/配额/统计 API）
│   │   └── frontend/     # React + Ant Design 前端
│   └── cli/              # TypeScript 安装器（开发中）
├── scripts/
│   ├── setup.ps1         # Windows 安装脚本
│   └── setup.sh          # Linux/macOS 安装脚本
├── .claude/
│   ├── settings.local.json   # MCP 服务配置
│   └── hooks.json            # 自动 recall/summarize
├── docs/
│   ├── project-overview.md   # 项目文档
│   └── project-management.md # 项目管理
├── CHANGELOG.md
└── ~/.agent-memory/chroma/   # 中央向量数据库（跨项目共享）
```

### 跨项目记忆隔离

所有项目的记忆存储在同一个中央库 `~/.agent-memory/chroma/` 中，通过 `project_id` 做逻辑隔离：

- **Hook 自动 recall** — 运行在哪个项目目录下，就只拉取该项目的记忆
- **Dashboard 筛选** — 按项目筛选、浏览全部或单个项目的记忆
- **手动指定** — CLI 支持 `--project-id` 参数覆盖自动检测

不同项目（如主项目和 Obsidian 插件）使用同一套记忆系统但互不干扰。

## 技术栈

- **向量存储：** ChromaDB + fastembed（`paraphrase-multilingual-mpnet-base-v2`）
- **语义搜索：** 支持中文、英文等多语言
- **MCP 协议：** FastMCP，通过 Claude Code MCP 集成
- **前端：** React 18 + Ant Design 6 + Vite
- **后端：** FastAPI + uvicorn

## 隐私

核心记忆功能完全本地运行，数据存储在 `~/.agent-memory/chroma/`。会话摘要（summarize）可选调用 Anthropic/OpenAI API，不提供 API Key 时自动回退到本地截断模式。

## V1.0 记忆管理

**Agent 记忆管理平面** — 不记忆，管理记忆。兼容多种记忆后端，统一操作界面。

### Dashboard 编辑/删除

在 Dashboard 记忆列表页可直接编辑和删除记忆：
- **编辑** — 修改记忆内容，保留原元数据（时间戳、项目 ID、标签等）
- **删除** — 一键删除，无需确认 API 调用（有前端确认弹窗）

### 编辑限制

每月 100 次免费编辑，可通过裂变推荐解锁更多：

| 方式 | 获取次数 |
|------|---------|
| 每月基础配额 | 100 次 |
| 每成功推荐一位 | +50 次 |

### 裂变推荐

```bash
# 查看邀请码
python -m agent_memory_mcp.cli refer
# 你的邀请码: 4FB7053B

# 被推荐者安装后输入邀请码即可（通过 API）
POST /api/quota/refer  {"referral_code": "4FB7053B"}
```

### 记忆同步层

核心 `remember()` 支持自动同步到第三方存储：

```python
# 注册第三方适配器
from agent_memory_mcp.core import register_adapter
register_adapter(MyAdapter())

# 写入记忆时自动同步到所有注册的第三方
remember("内容", sync_third_party=True)
```

内置适配器：
- **Mem0Adapter** — 读取 Mem0（Qdrant）存储的记忆
- **BasicMemoryAdapter** — 读取 Basic Memory 的 Markdown 文件
- **ChromaDB**（默认）— 自有向量存储

### 导出

```http
GET /api/memories/export
```

返回全部记忆的 JSON 导出，包含时间戳和版本号。

## 存储配置

| 环境变量 | 作用 | 默认值 |
|---|---|---|
| `AGENT_MEMORY_DIR` | 指定 ChromaDB 存储目录 | `~/.agent-memory/chroma/` |

---

## 核心洞见

真智能的反面不是"笨"，是"失忆"。

当前所有 AI 编程助手都像一个很聪明但每天失忆的人——每次会话都是全新开始，记不住项目的事、犯过的错、说过的需求。

## 四层记忆架构

```
长期知识 (LTM)      ← StructMem / EverMind 方向
    ↑ 沉淀
任务记忆 (Task)      ← beads 方向（版本化任务图）
    ↑ 压缩
情景记忆 (Episodic)  ← 我们的产品主战场
    ↑ 衰减
工作记忆 (Working)   ← 上下文窗口
```

## MVP

```
npx @agent-memory/init
```

一键激活：检测 beads → 初始化数据库 → 注入 CLAUDE.md → Agent 获得记忆。全程 < 3 秒。

## 状态

- [x] MVP 核心后端 — ChromaDB+fastembed，支持中文搜索
- [x] Dashboard — 记忆浏览、统计、项目筛选
- [x] CLI — remember / recall / summarize，支持 project_id
- [x] MCP 集成 — Claude Code 自动记忆
- [x] 跨项目共享 — 中央库 + project_id 隔离
- [x] **V1.0 记忆管理** — 编辑/删除记忆、100 次/月免费编辑、裂变推荐
- [x] **记忆管理层** — 兼容 Mem0 / Basic Memory / 自有 ChromaDB 统一管理界面
- [x] **记忆同步框架** — 适配器注册中心，第三方存储只读兼容
- [ ] TypeScript CLI（`npx @agent-memory/init`）
