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

## 版本历史

| 版本 | 内容 | 状态 |
|------|------|------|
| v0.1 | MVP — ChromaDB+fastembed 后端，基础 remember/recall | ✅ |
| v0.2 | LLM 实体/动作/摘要提取，搜索结果重排序 | ✅ |
| v0.3 | 任务记忆系统 — SQLite CRUD，beads 同步，Dashboard 面板 | ✅ |
| v0.4 | TypeScript CLI — `npx @agent-memory/init` 一键安装 | ✅ 待发布 |

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
