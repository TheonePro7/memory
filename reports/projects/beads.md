# beads (bd)

> Dolt 驱动的分布式图问题追踪器 · AI 编码 Agent 的记忆升级

## 基本信息

| 字段 | 值 |
|---|---|
| **GitHub** | [gastownhall/beads](https://github.com/gastownhall/beads) |
| **⭐ Stars** | **23k** |
| **语言** | Go (94.4%) |
| **许可证** | **MIT** |
| **Release** | v1.0.3 (2026-04-24)，累计 89 个 release |
| **Commits** | 8,704 |
| **平台** | macOS / Linux / Windows / FreeBSD |
| **安装** | `brew install beads` / `npm install -g @beads/bd` / `pip install beads-mcp` |

## 定位

"Beads - A memory upgrade for your coding agent."——Agent 不该用墨迹的 Markdown 来写计划，应该用结构化的、持久化的、可追踪的任务系统。

## 架构：Powered by Dolt

Beads 的核心是 **Dolt**（版本化 SQL 数据库）。Dolt 提供 cell-level merge、原生分支、内置 remotes 同步。

两种存储模式：

| 模式 | 数据位置 | 并发 | 适用场景 |
|---|---|---|---|
| **Embedded（默认）** | `.beads/embeddeddolt/` | 单写者（文件锁） | 个人使用，零配置 |
| **Server 模式** | `.beads/dolt/` | 多写者 | 多 Agent 并发，团队协作 |

## 核心能力

| 能力 | 说明 |
|---|---|
| **Hash 式 ID** | `bd-a1b2` 格式——多 Agent 多分支下不会合并冲突 |
| **依赖追踪** | `bd ready` 自动列出没有阻塞项的任务 |
| **分级 ID** | Epic `bd-a3f8` → Task `bd-a3f8.1` → Sub-task `bd-a3f8.1.1` |
| **知识图谱链接** | `relates_to` / `duplicates` / `supersedes` / `replies_to` |
| **消息系统** | 线程式评论、临时生命周期、邮件委托 |
| **Compaction（记忆衰减）** | 语义摘要关闭的旧任务，释放上下文窗口空间 |
| **Agent 优先输出** | JSON 格式，Agent 解析友好 |
| **Stealth 模式** | `bd init --stealth` 不污染主仓库 |
| **无 Git 模式** | `BEADS_DIR` 环境变量——不依赖 git |
| **MCP 包** | `pip install beads-mcp` 通过 MCP 协议集成 |

## 关键命令

| 命令 | 作用 |
|---|---|
| `bd ready` | 列出无阻塞的待办任务 |
| `bd create "Title" -p 0` | 创建 P0 任务 |
| `bd update <id> --claim` | 原子式认领任务 |
| `bd dep add <child> <parent>` | 链接任务（阻塞、关联、父子） |
| `bd show <id>` | 查看任务详情 + 审计追踪 |
| `bd close <id> "reason"` | 关闭任务 |
| `bd prime` | 排列任务队列 |
| `bd backup sync` | 备份同步 |

## 竞品定位

| 对比对象 | Beads 的优势 |
|---|---|
| **Markdown 计划**（CLAUDE.md/AGENTS.md） | 结构化、可查询、可版本控制、依赖感知 |
| **向量数据库 / RAG** | 不是语义存储，是结构化任务图——补位而非竞争 |
| **GitHub Issues / Jira** | Agent 原生——JSON 输出、依赖感知、CLI 原生、完全本地 |
| **空上下文窗口** | Compaction 机制——旧任务自动摘要释放空间 |

## 安装

```bash
# macOS/Linux
brew install beads

# npm（跨平台）
npm install -g @beads/bd

# MCP 包（Claude Code 集成）
pip install beads-mcp
```

## 收费模式

| 模式 | 说明 |
|---|---|
| **开源版** | MIT，完全免费 |
| **无云版** | 纯 CLI 工具，无托管服务 |
| **底层依赖** | Dolt (Apache 2.0) 也是免费 |

## 优劣分析

| 维度 | 评价 |
|---|---|
| 成熟度 | 🟢 23k ⭐，89 releases，8,704 commits，企业级质量 |
| 版本化 | 🟢 **Dolt 驱动的 cell-level merge**——竞品无出其右 |
| 记忆衰减 | 🟢 Compaction 机制——语义摘要旧任务释放上下文 |
| Agent 原生 | 🟢 JSON 输出 + MCP 包 + Claude Code 插件 |
| 跨平台 | 🟢 macOS / Linux / Windows / FreeBSD |
| 定位 | 🟡 **不是通用记忆层**——是"结构化任务追踪器"。不解决语义记忆、用户画像、事实检索 |
| 元认知 | 🔴 无 Agent 自主判断 |
| 语义检索 | 🔴 无向量/语义检索能力 |
