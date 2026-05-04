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

# 搜索记忆
python packages/python-cli/src/main.py recall
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
└── .claude/
    ├── settings.local.json   # MCP 服务配置
    └── hooks.json            # 自动 recall/summarize
```

## 技术栈

- **向量存储：** ChromaDB + fastembed（`paraphrase-multilingual-mpnet-base-v2`）
- **语义搜索：** 支持中文、英文等多语言
- **MCP 协议：** FastMCP 3.x，通过 Claude Code MCP 集成
- **前端：** React 18 + Ant Design 6 + Vite
- **后端：** FastAPI + uvicorn

## 隐私

完全本地运行，数据存储在项目目录的 `.memory/` 下。不依赖任何外部 API。

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
- [x] Dashboard — 记忆浏览、统计
- [x] CLI — remember / recall / summarize
- [x] MCP 集成 — Claude Code 自动记忆
- [ ] TypeScript CLI（`npx @agent-memory/init`）
