# Agent Memory — 项目全景

## 一句话

让 AI Agent 拥有记忆能力的元认知层产品。安装后 Agent 自动记住项目上下文、决策、错误，不再每次会话都"失忆"。

## 核心架构

```
┌──────────────────────────────────────────────┐
│                  Agent (Claude Code)           │
│  ┌──────────┐  ┌──────────┐  ┌─────────────┐ │
│  │ MCP 协议  │  │  CLI 调用  │  │ Hook 自动触发 │ │
│  └────┬─────┘  └────┬─────┘  └──────┬──────┘ │
└───────┼──────────────┼───────────────┼────────┘
        ▼              ▼               ▼
┌──────────────────────────────────────────────┐
│               记忆系统核心                       │
│                                                │
│  ┌──────────────────┐  ┌───────────────────┐  │
│  │  向量存储后端      │  │  Markdown 日志后端  │  │
│  │  ChromaDB+fastembed│  │  memory/*.md      │  │
│  │  ~/.agent-memory/  │  │  (项目本地)        │  │
│  └────────┬─────────┘  └───────────────────┘  │
│           │                                    │
│  ┌────────▼─────────┐                          │
│  │  LLM 加工（可选）  │                          │
│  │  实体提取/重排序   │                          │
│  └──────────────────┘                          │
└──────────────────────────────────────────────┘
        │
        ▼
┌──────────────────────────────────────────────┐
│              Dashboard (Web UI)               │
│  总览 / 记忆浏览(项目筛选) / 时间线 / 设置     │
│  FastAPI + React + Ant Design                │
│  http://localhost:8712                        │
└──────────────────────────────────────────────┘
```

### 存储策略

| 数据类型 | 存储位置 | 用途 |
|---|---|---|
| 向量记忆 | `~/.agent-memory/chroma/` | 语义搜索，所有项目共享，project_id 隔离 |
| 会话摘要 | `memory/*.md` | 时间线日志，每个项目独立 |
| 上下文缓存 | `~/.agent-memory/context.json` | Session start 时的快速 recall 输出 |

---

## 版本路线图

### v0.1 MVP「跑起来」✅ 已完成

**目标：** 核心链路可运行 `remember → recall → dashboard 展示`

**已实现：**

- [x] 向量存储 — ChromaDB + fastembed，支持中文多语言搜索
- [x] CLI 工具 — `remember` / `recall` / `summarize` 三个命令
- [x] Dashboard — 记忆浏览、统计、时间线、项目筛选
- [x] Hook 集成 — 会话开始自动 recall，结束自动 summarize
- [x] MCP 服务 — 通过 FastMCP 协议暴露记忆读写能力
- [x] 跨项目共享 — 中央库 + project_id 隔离，不同项目互不干扰
- [x] 安装脚本 — setup.ps1 / setup.sh 一键安装
- [x] 移除 mem0 依赖 — ChromaDB 直连，零外部 API 依赖

**技术栈：** Python (ChromaDB + fastembed + FastMCP + FastAPI) / TypeScript React (Ant Design + Vite)

### v0.2 记忆智能「加工」🔜 当前开发中

**目标：** 利用 LLM 提升记忆质量和搜索精度

**规划中：**

- [ ] **存时加工（`remember --process`）** — 写入前调 LLM 提取实体、生成摘要、过滤无价值内容
- [ ] **查时重排序（`recall --process`）** — 向量搜索后 LLM 重排序，提升召回质量
- [ ] **降级策略** — 无 API Key 时纯向量运行，不报错
- [ ] 设计文档已完成，待实现

**新增依赖：** 用户自备 API Key（Anthropic / OpenAI），可选

### v0.3 任务记忆「结构」⏳ 待规划

**目标：** 引入 beads，让 Agent 记住任务进度和决策历史

- [ ] beads 集成 — 版本化任务图
- [ ] 任务状态追踪 — 进行中/已完成/阻塞的任务可见
- [ ] 决策日志 — 关键决策及其理由可追溯
- [ ] Dashboard 任务视图

### v0.4 开发者体验「一键」⏳ 待规划

**目标：** `npx @agent-memory/init` 三秒激活

- [ ] TypeScript CLI — `npx @agent-memory/init` 一键安装
- [ ] 跨编辑器支持 — Cursor、Windsurf 等 MCP 兼容编辑器
- [ ] 安装体验优化 — 首次模型下载进度、智能检测项目类型

### v0.5+ 长期记忆「深度」⏳ 待探索

**目标：** 四层记忆架构完整实现

- [ ] 工作记忆 ↔ 情景记忆的衰减/压缩机制
- [ ] 长期记忆（LTM）沉淀
- [ ] 记忆冲突自动检测与合并
- [ ] 跨会话关联推理

---

## 当前开发阶段（v0.2）

正在实现 LLM 记忆加工功能，设计文档已出：[docs/superpowers/specs/2026-05-04-llm-memory-processing-design.md](../docs/superpowers/specs/2026-05-04-llm-memory-processing-design.md)

```
remember "修复了登录页" --process
  → LLM 提取: entities=["登录页"], actions=["修复 bug"]
  → 存在 ChromaDB metadata

recall "页面问题" --process
  → 向量搜索 10 条 → LLM 重排序取 top 5
  → 附带关联推荐
```

## 技术决策记录

| 决策 | 选择 | 放弃 | 原因 |
|---|---|---|---|
| 向量数据库 | ChromaDB | mem0 | mem0 v2 强制 LLM 依赖，ChromaDB 零外部依赖 |
| 嵌入模型 | paraphrase-multilingual-mpnet-base-v2 | BAAI/bge-m3 | bge-m3 不被 fastembed 支持 |
| 存储路径 | 中央库 `~/.agent-memory/` | 项目本地 `.memory/` | 支持跨项目共享，统一管理 |
| 会话摘要 | 本地 Markdown | 纯向量存储 | 方便人工阅读和 git 跟踪 |
| LLM 加工 | 用户自备 API Key | 内置 Key | 零成本起步，不绑定供应商 |

## 目录结构

```
memory/
├── packages/
│   ├── mcp-server/       # MCP 服务（记忆读写）
│   │   └── src/
│   │       ├── server.py           # FastMCP 入口
│   │       ├── backends/
│   │       │   ├── mem0_backend.py # ChromaDB 向量后端
│   │       │   └── md_backend.py   # Markdown 日志后端
│   │       ├── summarize.py        # 会话摘要生成
│   │       └── config.py           # 配置
│   ├── python-cli/       # CLI 工具
│   │   └── src/main.py   # remember / recall / summarize
│   ├── dashboard/        # Web 管理界面
│   │   ├── backend/      # FastAPI 后端
│   │   └── frontend/     # React + Ant Design
│   └── cli/              # TypeScript CLI（v0.4）
│       └── src/
├── scripts/
│   ├── setup.ps1         # Windows 安装
│   └── setup.sh          # Linux/macOS 安装
├── .claude/
│   ├── settings.local.json   # MCP 配置
│   └── hooks.json            # 自动记忆 hooks
├── docs/
│   └── superpowers/
│       ├── specs/        # 设计文档
│       └── plans/        # 实现计划
└── README.md
```
