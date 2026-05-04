# Agent Memory

> 装了这个东西，就变真智能了。

一个让 AI Agent 拥有记忆能力的元认知层产品。不是另一个记忆 API，而是 Agent 的记忆操作系统。

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
python packages/python-cli/src/main.py remember "内容" --tags tag1,tag2

# 搜索当前项目的记忆（自动按项目隔离）
python packages/python-cli/src/main.py recall

# 指定其他项目
python packages/python-cli/src/main.py remember "内容" --project-id other-project
```

## 系统架构

```
memory/
├── packages/
│   ├── mcp-server/       # MCP 服务（记忆读写）
│   ├── python-cli/       # CLI 工具（Hook 调用）
│   ├── dashboard/        # Web 管理界面
│   │   ├── backend/      # FastAPI 后端
│   │   └── frontend/     # React + Ant Design 前端
│   └── cli/              # TypeScript CLI（开发中）
├── scripts/
│   ├── setup.ps1         # Windows 安装脚本
│   └── setup.sh          # Linux/macOS 安装脚本
├── .claude/
│   ├── settings.local.json   # MCP 服务配置
│   └── hooks.json            # 自动 recall/summarize
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
- [ ] TypeScript CLI（`npx @agent-memory/init`）
