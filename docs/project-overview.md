# Agent Memory — Project Overview

一键激活 Agent 记忆的 CLI 工具。

## 一句话

`npx @agent-memory/init` — 一行命令让 Claude Code 拥有持久记忆能力。

## 架构

```
@agent-memory/init (npm)     ← 安装器 CLI
  └── agent-memory-mcp (PyPI) ← MCP 服务器（记忆读写）
        ├── ChromaDB          ← 向量存储（语义搜索）
        └── SQLite             ← 任务记忆（结构化管理）

packages/
├── cli/           TypeScript  CLI 安装器（v0.4）
├── python-cli/    Python    CLI 工具（remember/recall/summarize）
├── mcp-server/    Python    MCP 服务器（记忆+任务）
└── dashboard/     React     Web 管理界面
```

## 当前进度

- [x] 市场调研、竞品扫描、技术研究
- [x] 产品定位与 MVP 设计
- [x] CLI 工具 — remember / recall / summarize 命令可用
- [x] Hook 自动 recall（会话开始）和 summarize（会话结束）
- [x] ChromaDB+fastembed 后端，支持中文搜索，Dashboard 可访问
- [x] 任务记忆系统 — SQLite 后端，beads 同步，Dashboard 任务面板
- [x] TypeScript CLI — `npx @agent-memory/init` 一键安装
- [ ] npm 发布 @agent-memory/init
- [ ] PyPI 发布 agent-memory-mcp

## 快速开始

```bash
npx @agent-memory/init                    # 当前目录安装
npx @agent-memory/init ./my-project       # 指定项目
npx @agent-memory/init --dry-run          # 仅检测环境
npx @agent-memory/remove                  # 卸载
```

## 技术栈

- **CLI:** TypeScript, Node.js 18+, execa
- **后端:** Python 3.10+, ChromaDB, fastembed, fastmcp
- **前端:** React, Ant Design, Recharts
- **集成:** MCP 协议, Claude Code hooks
