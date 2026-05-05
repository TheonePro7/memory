# Agent Memory — 项目管理

> 做一家 Agent 记忆公司。核心产品：让 Agent 安装后自动拥有记忆能力（元认知层）。

**文档维护规则：** 每次代码变更（新功能、修复、重构、配置修改），必须在本文档的"变更记录"章节追加一条记录。这是强制要求。

---

## 目录

1. [项目定位](#1-项目定位)
2. [架构概览](#2-架构概览)
3. [版本路线图](#3-版本路线图)
4. [开发工作流](#4-开发工作流)
5. [活跃工作项](#5-活跃工作项)
6. [技术债 & 已知问题](#6-技术债--已知问题)
7. [设计决策日志](#7-设计决策日志)
8. [发布状态](#8-发布状态)
9. [变更记录](#9-变更记录)

---

## 1. 项目定位

### 1.1 使命

让每个 Claude Code 实例开箱即用地拥有持久记忆。AI 不再每次会话从零开始——它能记住你是谁、你的项目、你的偏好、你的进度。

### 1.2 核心能力

| 能力 | 说明 | 技术实现 |
|------|------|----------|
| 记忆存储 | 关键信息跨会话持久化 | ChromaDB（向量）+ SQLite（结构化） |
| 语义搜索 | 自然语言查询历史记忆 | ChromaDB + fastembed 向量化 |
| 智能加工 | LLM 自动提取实体/动作/摘要 | processor.py 调用 Anthropic/OpenAI |
| 任务管理 | 结构化任务跟踪与状态流转 | SQLite CRUD + beads 同步 |
| 一键安装 | 新项目 5 步自动激活 | TypeScript CLI + MCP 配置注入 |

### 1.3 安装方式

```bash
npx @agent-memory/init                    # 当前目录安装
npx @agent-memory/init ./my-project       # 指定项目
npx @agent-memory/init --dry-run          # 仅检测环境
npx @agent-memory/remove                  # 卸载
```

---

## 2. 架构概览

完整技术架构见 [docs/project-overview.md](project-overview.md)。此处只记录关键架构约束：

### 2.1 分层原则

```
MCP 层 (server.py)    — MCP 协议适配，薄胶水
CLI 层 (cli.py)        — Shell 命令适配，薄胶水
核心层 (core.py)        — 操作链路编排 + 业务规则（2026-05-05 新增）
后端层 (backends/)      — 存储实现（向量/SQLite）
处理器 (processor.py)   — LLM 调用
```

### 2.2 关键约束

- 业务逻辑在 `core.py`，不散落在 `server.py` 和 `cli.py`
- 后端 API 签名变更需同步更新 core.py 的调用处
- `forget()` 已实现，通过 memory_id 精确删除

---

## 3. 版本路线图

| 版本 | 内容 | 状态 | 完成日期 |
|------|------|------|----------|
| v0.1 | 基础记忆 — ChromaDB+fastembed 后端，remember/recall/summarize | ✅ 完成 | — |
| v0.2 | 记忆智能加工 — LLM 实体提取、搜索重排序、processor.py | ✅ 完成 | 2026-05-05 |
| v0.3 | 任务记忆 — SQLite CRUD、beads 同步、Dashboard 任务面板 | ✅ 完成 | — |
| v0.4 | TypeScript CLI — `npx @agent-memory/init` 一键安装 | ✅ 完成 | 2026-05-05 |
| v0.5 | 架构重构 — core.py 抽取、CLI 命令注册、死代码清理、测试覆盖 | 🔜 设计阶段 | — |
| — | npm 发布 @agent-memory/init | ⬜ 待做 | — |
| — | PyPI 发布 agent-memory-mcp | ⬜ 待做 | — |

---

## 4. 开发工作流

项目使用 **devflow** 编排 3 阶段开发流程：

| 阶段 | 名称 | 说明 |
|------|------|------|
| Phase 1 | Setup | 项目初始化：beads、gitnexus、hooks、docs、autoresearch（一次性） |
| Phase 2 | Develop | 设计→实现→审查：brainstorming → grill → probe → plans → scenario → implementation → fix → review → security |
| Phase 3 | Finish | 完成：beads 关闭、合并/PR、推送 |

### 4.1 提交规范

```
feat: 新功能
fix: 修复
chore: 配置/工具
docs: 文档
test: 测试
refactor: 重构
```

### 4.2 测试要求

- TDD 原则：先写失败测试，再实现，再验证通过
- 每次 commit 前必须验证测试通过
- 核心测试（core.py + backends + processor）覆盖率目标 80%+

---

## 5. 活跃工作项

当前 beads epic：[memory-4l3](bd show memory-4l3) — 设计缺陷修复

| 任务 | 状态 | beads ID |
|------|------|----------|
| core.py 抽取共享层 | 🔜 待做 | — |
| CLI 命令注册 + 包重构 | 🔜 待做 | — |
| 路由死代码清理 + forget() 实现 | 🔜 待做 | — |
| SQLite 连接管理修复 | 🔜 待做 | — |
| context.json 竞态修复 | 🔜 待做 | — |
| summarize 任务关联增强 | 🔜 待做 | — |
| 补充测试覆盖 | 🔜 待做 | — |

---

## 6. 技术债 & 已知问题

| ID | 问题 | 严重度 | 引入版本 | 状态 |
|----|------|--------|----------|------|
| T01 | server.py 和 main.py 代码重复 | 🔴 严重 | v0.1 | 🔄 修复中 (v0.5) |
| T02 | agent-memory CLI 命令未注册 | 🔴 严重 | v0.1 | 🔄 修复中 (v0.5) |
| T03 | router.route() 死代码 | 🟡 中等 | v0.1 | 🔄 修复中 (v0.5) |
| T04 | forget() 空实现 | 🟡 中等 | v0.1 | 🔄 修复中 (v0.5) |
| T05 | SQLite 连接异常时泄漏 | 🟡 中等 | v0.3 | 🔄 修复中 (v0.5) |
| T06 | context.json 多会话竞态 | 🟢 轻微 | v0.1 | 🔄 修复中 (v0.5) |
| T07 | summarize 关键字匹配脆弱 | 🟢 轻微 | v0.1 | 🔄 修复中 (v0.5) |
| T08 | 测试覆盖不全（mem0/md/audit/summarize） | 🟡 中等 | v0.1 | 🔄 修复中 (v0.5) |
| T09 | ChromaDB $and 语法版本依赖 | 🟢 轻微 | v0.1 | ⬜ 待做 |
| T10 | stats count 10000 条上限 | 🟢 轻微 | v0.1 | ⬜ 待做 |

---

## 7. 设计决策日志

### ADR-001：为什么 CLI 用 TypeScript 而非 Python？

- **时间：** v0.1
- **决策：** TypeScript
- **理由：** npx 无需预装 Python 环境；npm 生态更适合 CLI 分发；Python 留作后端和 MCP 服务器

### ADR-002：为什么 MCP 配置分三种模式？

- **时间：** v0.1
- **决策：** PyPI / Local / Manual 三种模式
- **理由：** 渐进降级，确保尽可能多的用户能自动安装成功

### ADR-003：为什么用 ChromaDB + SQLite 双存储？

- **时间：** v0.1
- **决策：** 双存储
- **理由：** ChromaDB 适合语义搜索，SQLite 适合结构化任务跟踪，两者互补

### ADR-004：为什么引入 core.py 共享层？

- **时间：** 2026-05-05 (v0.5)
- **决策：** 新增 `core.py` 承载业务逻辑
- **理由：** server.py 和 main.py 出现代码重复，操作链路需要命名和测试入口

### ADR-005：为什么将 python-cli 合并入 mcp-server 包？

- **时间：** 2026-05-05 (v0.5)
- **决策：** 合并为一个 pip 包
- **理由：** main.py 已通过 sys.path.insert 强耦合 mcp-server 内部模块，物理分离是假的

### ADR-006：为什么删除 router.route()？

- **时间：** 2026-05-05 (v0.5)
- **决策：** 移除路由机制
- **理由：** YAGNI — 没有多后端路由的真实需求，代码死在那里从未执行

---

## 8. 发布状态

### npm 包 `@agent-memory/init`

| 步骤 | 状态 | 说明 |
|------|------|------|
| 代码完成 | ✅ | packages/cli 已实现 |
| 测试通过 | ✅ | 8 个测试全部通过 |
| npm pack 验证 | ⬜ | 待执行 |
| npm publish | ⬜ | 待执行 |
| 安装验证 | ⬜ | 待执行 |

### PyPI 包 `agent-memory-mcp`

| 步骤 | 状态 | 说明 |
|------|------|------|
| 包结构 | 🔄 | v0.5 重构后确定最终结构 |
| pyproject.toml | 🔄 | 需要加 entry_points |
| 构建验证 | ⬜ | 待执行 |
| PyPI 发布 | ⬜ | 待执行 |

---

## 9. 变更记录

每行格式：`YYYY-MM-DD | [类型] 描述 | commit hash`

### 2026-05-05

| 类型 | 描述 | Commit |
|------|------|--------|
| feat | processor.py: LLM 实体提取 + search reranking | b80907a |
| fix | main.py 语法错误 + --process 检测简化 | 0977a1d |
| test | processor.py 单元测试 13 个 | 0bad5c4 |
| feat | recall 结果格式统一 + LLM metadata 透传 | b80907a |
| chore | pyproject.toml 补全依赖（httpx, chromadb, fastembed, fastmcp） | 0977a1d |
| chore | devflow Phase 1 安装：hooks、guardrails、docs、autoresearch | aa6a874 |
| docs | 项目概览文档（project-overview.md） | aa6a874 |
| docs | 设计审查报告 + v0.5 重构 spec | 35f84ce |

<!-- 后续变更在此行之后追加，保持最新在最上面 -->
