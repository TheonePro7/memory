# Agent 记忆系统 MVP — 实现规格

> 2026-05-04
> 状态: 待评审

---

> **UI 更新：** Ant Design → 浅色精致主题，思源黑体（Noto Sans CJK SC）
> **状态更新：** 代码已全部完成，需要修复可运行性问题

## 1. 概述

### 1.1 产品定位

一个命令让 Agent 拥有持久记忆。不做新的记忆引擎，整合已有开源项目（mem0），通过 Hook 自动化让 Agent 不需要"想"就自动使用记忆。

### 1.2 MVP 范围

| 包含 | 不包含 |
|---|---|
| mem0 语义记忆 | supermemory 经验检索 |
| Markdown 时间线日志 | nocturne 层级结构记忆 |
| 规则驱动路由层 | beads 任务管理 |
| Hook 自动化 | LLM 路由分类（MVP 只用规则） |
| Ant Design Dashboard | 多用户/权限系统 |
| CLI 安装/卸载 | 云服务/团队协作 |
| 多 Agent 配置适配 | |

### 1.3 核心指标

- 安装: `npx @agent-memory/init` → 1 分钟内可用
- 记住: 用户说"记住X" → 零摩擦写入
- 回忆: 用户询问 → 规则路由 → 2 秒内返回
- 遗忘: 用户不需要知道底层是 mem0

---

## 2. 项目结构

```
f:\AI\memory\
├── packages/
│   ├── mcp-server/           # Python MCP 服务
│   │   ├── src/
│   │   │   ├── __init__.py
│   │   │   ├── server.py     # FastMCP 入口 + 工具注册
│   │   │   ├── router.py     # 规则驱动路由
│   │   │   ├── backends/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── mem0_backend.py  # mem0 封装
│   │   │   │   └── md_backend.py    # Markdown 封装
│   │   │   ├── summarize.py  # LLM 会话摘要
│   │   │   └── audit.py      # 审计日志
│   │   ├── requirements.txt
│   │   └── pyproject.toml
│   │
│   ├── cli/                  # TypeScript 安装器
│   │   ├── src/
│   │   │   ├── index.ts      # 入口
│   │   │   ├── install.ts    # init 命令
│   │   │   ├── remove.ts     # remove 命令
│   │   │   └── utils.ts      # 配置读写/路径
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── python-cli/            # Python CLI (Hook 调用的 shell 命令)
│   │   ├── src/
│   │   │   ├── __init__.py
│   │   │   ├── main.py       # recall / summarize 命令入口
│   │   │   │                   # 直接 import mcp-server 的后端代码
│   │   └── pyproject.toml
│   │
│   └── dashboard/            # Ant Design 可视化
│       ├── backend/
│       │   ├── src/
│       │   │   ├── main.py       # FastAPI 入口
│       │   │   ├── routers/
│       │   │   │   ├── memories.py  # 记忆 CRUD
│       │   │   │   ├── sessions.py  # 会话时间线
│       │   │   │   └── stats.py     # 统计
│       │   │   └── config.py
│       │   └── requirements.txt
│       └── frontend/
│           ├── src/
│           │   ├── App.tsx
│           │   ├── pages/
│           │   │   ├── Overview.tsx
│           │   │   ├── Memories.tsx
│           │   │   ├── Timeline.tsx
│           │   │   └── Settings.tsx
│           │   └── components/
│           ├── package.json
│           └── tsconfig.json
│
├── memory/            # Markdown 日志目录（运行时生成）
├── .memory/           # Chroma 数据目录（运行时生成）
├── docs/              # 文档
├── design/            # 设计文件
└── CLAUDE.md
```

---

## 3. MCP 服务（Python）

### 3.1 技术栈

| 组件 | 选型 | 理由 |
|---|---|---|
| MCP 框架 | FastMCP | 轻量，原生 MCP 协议 |
| 记忆引擎 | mem0ai | 54.7k⭐, Apache 2.0, 最成熟 |
| 向量库 | Chroma（mem0 自带） | 本地文件存储，零运维 |
| LLM 摘要 | Claude API / OpenAI API | 用户已有 key，fallback 到原始文本 |

### 3.2 MCP 工具

#### remember()

```python
def remember(
    content: str,
    tags: list[str] = [],
    importance: int = 5,
    auto_verify: bool = False,
    project_id: str | None = None
) -> dict
```

| 参数 | 说明 |
|---|---|
| content | 要记住的内容 |
| tags | 分类标签 |
| importance | 1-10，> 8 强制后台验证 |
| auto_verify | 后台 LLM 去噪（Hook 自动提取时启用） |
| project_id | 项目隔离 |

行为：
- 路由层判断内容类型
- 写入 mem0（带 user_id + project_id scoping）
- 写入 audit log
- 返回记忆 ID

#### recall()

```python
def recall(
    query: str,
    limit: int = 10,
    project_id: str | None = None
) -> list[dict]
```

行为：
- 路由层判断查询类型
- 默认并行查 mem0 + Markdown
- 融合排序后返回

#### summarize()

```python
def summarize(context: str) -> dict
```

行为：
- Hook onSessionEnd 自动触发
- 调 LLM 生成结构化摘要（summary + facts）
- 摘要追加到 `memory/YYYY-MM-DD.md`
- 事实提取写入 mem0
- LLM 失败 → 原始文本直接落 Markdown

#### 辅助工具

```python
def forget(pattern: str, backend: str | None = None) -> dict
def memory_stats() -> dict
def audit_log(days: int = 7) -> list[dict]
```

### 3.3 路由层

仅规则驱动，不做 LLM 分类：

| 关键词 | 路由 | 说明 |
|---|---|---|
| "记住""注意""以后要知道" | mem0 | 显式记住指令 |
| "昨天""上次""之前""上周" | Markdown | 时间线查询 |
| "待办""任务""卡在" | mem0（暂不接 beads） | 任务查询存 mem0 |
| 默认 | mem0 | 语义检索 |

规则不命中时默认走 mem0 语义搜索。

### 3.4 配置

```yaml
# ~/.agent-memory/config.yaml
user_id: default
project_id: null
memory_dir: ./memory
chroma_dir: ./.memory/chroma

llm:
  provider: auto  # claude | openai | none
  api_key_env: ANTHROPIC_API_KEY  # 或 OPENAI_API_KEY

mcp:
  transport: stdio  # stdio | sse
  port: 8710
```

---

## 4. CLI 安装器（TypeScript）

### 4.1 命令

```bash
npx @agent-memory/init                    # 安装 MVP
npx @agent-memory/init --with-experience  # + supermemory（v2）
npx @agent-memory/init --with-structure   # + nocturne（v3）
npx @agent-memory/init --with-tasks       # + beads（v4）
npx @agent-memory/remove                  # 干净卸载
agent-memory dashboard                    # 启动可视化
```

### 4.2 init 执行步骤

| 步骤 | 动作 | 失败处理 |
|---|---|---|
| 1 | 检测 Python/pip 是否可用 | 提示安装 |
| 2 | pip install mem0ai | 提示手动安装，不中止 |
| 3 | 创建 memory/ + .memory/ 目录 | 已存在跳过 |
| 4 | 写入 ~/.agent-memory/config.yaml | 已存在跳过 |
| 5 | 配置 MCP（写入 settings.local.json） | 报错 |
| 6 | 配置 Hook（写入 hooks.json） | 报错 |
| 7 | 写入 CLAUDE.md（追加引导指令） | 追加非覆盖 |
| 8 | 可选: 安装 dashboard 依赖 | 只在 dashboard 命令时安装 |

### 4.3 卸载

| 步骤 | 动作 |
|---|---|
| 1 | 移除 MCP 配置 |
| 2 | 移除 Hook 配置 |
| 3 | 移除 CLAUDE.md 注入行 |
| 4 | 保留 memory/ + .memory/ 数据 |

### 4.4 CLAUDE.md 引导

```markdown
## 记忆系统

你拥有持久记忆能力。当用户说"记住""注意""以后要知道"等时，主动调用 remember() 工具。
会话结束时系统会自动 summarize，不需要你手动操作。
```

---

## 5. Dashboard（React + Ant Design）

### 5.1 技术栈

| 层 | 选型 | 理由 |
|---|---|---|
| UI 框架 | Ant Design | 生态最大，专业组件 |
| 字体 | 思源黑体 (Noto Sans CJK SC) | 开源可商用，中文显示优秀 |
| 主题 | 浅色精致（白色/浅灰底色，细边框，克制阴影） | 质感、舒适 |
| 前端框架 | React 18 + TypeScript | 生态最大 |
| 后端 | FastAPI（Python） | 共享 MCP 的 mem0 配置 |
| 构建 | Vite | 快 |

### 5.2 Ant Design 主题配置

通过 `ConfigProvider` 覆盖默认 token：

```typescript
const theme = {
  token: {
    colorPrimary: '#1a1a2e',
    colorBgContainer: '#ffffff',
    colorBgLayout: '#f8f9fa',
    colorBorderSecondary: '#edf0f5',
    borderRadius: 10,
    fontFamily: '"Noto Sans CJK SC", "Source Han Sans SC", -apple-system, "PingFang SC", sans-serif',
    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
  },
};
```

### 5.2 页面

#### Overview（总览）

- 统计卡片：记忆总数、会话数、今日新增
- 趋势图：记忆增长曲线（recharts）
- 最近记忆列表（最近 5 条）

#### Memories（记忆浏览）

- 表格 + 卡片视图切换
- 搜索框（语义搜索）
- 筛选：标签 / 日期 / 重要度
- 分页
- 删除操作

#### Timeline（时间线）

- 按日期分组的会话摘要
- 点击展开查看详情
- Markdown 渲染

#### Settings（设置）

- user_id 修改
- project_id 配置
- API key 测试连接
- Dashboard 端口配置

### 5.3 API

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | /api/memories | 记忆列表（搜索/筛选/分页） |
| GET | /api/memories/:id | 单条记忆 |
| DELETE | /api/memories/:id | 删除记忆 |
| GET | /api/stats | 统计概览 |
| GET | /api/sessions | 会话时间线 |
| GET | /api/sessions/:date | 某天会话详情 |

### 5.4 启动方式

```bash
agent-memory dashboard
# 或
npx @agent-memory/init --dashboard
```

启动 FastAPI 服务，前端打包为静态文件由 FastAPI 托管。默认端口 8712，浏览器自动打开 `http://localhost:8712`。

---

## 6. Hook 自动化

### 6.1 Hook 实现机制

Hook 是 shell 命令，不能直接调 MCP 协议。因此需要一个 `agent-memory` Python CLI 脚本（与 MCP 服务共享同一套后端代码），安装 mem0 时一并安装。

```json
{
  "onSessionStart": ["agent-memory recall"],
  "onSessionEnd": ["agent-memory summarize"]
}
```

`agent-memory` CLI 命令：
- `agent-memory recall` — 读取最近记忆上下文，写入临时文件供 MCP 注入
- `agent-memory summarize` — 读取当前会话日志，生成摘要写入 Markdown + mem0

不需要 onToolCall hook——用户说"记住"时由 MCP 的 remember() 工具处理，通过 CLAUDE.md 引导 Agent 主动调用。

### 6.2 其他 Agent 配置

| Agent | 文件 | 内容 |
|---|---|---|
| Cursor | .cursorrules | 规则引导 Agent 调 MCP |
| OpenClaw | MCP 配置 | 标准 MCP 协议 |
| Codex CLI | MCP 配置 | 标准 MCP 协议 |

所有 Agent 指向同一个 MCP 服务。

---

## 7. 数据流

### 7.1 记住

```
用户: "记住用 2 空格缩进"
  → Hook 检测到"记住"关键词
  → MCP remember(content="用 2 空格缩进", tags=["coding-style"])
  → 路由规则: "记住" → mem0
  → mem0.add("用 2 空格缩进", user_id="default", metadata={project_id: "my-project"})
  → audit.log("remember", {content_summary: "缩进规则", backend: "mem0"})
  → 返回 {id: "mem0-uuid-xxx", status: "stored"}
```

### 7.2 回忆

```
用户: "我之前说过缩进规则吗"
  → MCP recall(query="缩进规则")
  → 路由规则: 默认 → mem0
  → mem0.search("缩进规则", user_id="default")
  → 返回 [{content: "用 2 空格缩进", importance: 5, ...}]
  → 注入对话上下文
```

### 7.3 会话结束

```
会话结束
  → Hook onSessionEnd
  → MCP summarize(当前对话内容)
  → LLM 生成: {summary: "...", facts: ["用 2 空格缩进", "项目用 PostgreSQL"]}
  → 摘要写入 memory/2026-05-04.md
  → 事实写入 mem0
  → 完成
```

---

## 8. 错误处理

| 场景 | 行为 |
|---|---|
| recall 失败 | 静默，不影响会话 |
| summarize LLM 失败 | 原始文本直接写 Markdown |
| mem0 不可用 | 记录错误日志，不影响 Agent 正常使用 |
| pip install 失败 | CLI 提示手动安装，不中止 |
| Hook 未配置 | CLI 提示但安装继续 |
| 配置写入失败 | CLI 报错，显示配置文件路径 |

---

## 9. 实现顺序（当前状态：代码已完成，需修复可运行性）

### Phase 1: CLI 安装器编译

| 任务 | 说明 |
|---|---|
| 安装 `packages/cli/` 依赖 | `npm install` |
| 编译 TypeScript | `npx tsc`，生成 `dist/index.js` |

### Phase 2: MCP 服务器验证

| 任务 | 说明 |
|---|---|
| 验证 Python 依赖完整 | mem0ai, fastmcp, httpx, pyyaml |
| 启动测试 | 运行 server.py，测试 remember/recall 链路 |

### Phase 3: Dashboard 修复

| 任务 | 说明 |
|---|---|
| 安装前端依赖 | `npm install` (packages/dashboard/frontend) |
| 安装后端依赖 | `pip install fastapi uvicorn pyyaml` |
| 启动验证 | 后端 + 前端联调 |
| Ant Design 主题定制 | 配置思源黑体 + 浅色主题 |
| 移除多余 `.js` 文件 | 清理 src 目录中残留的旧 `.js` 文件 |

### Phase 4: 端到端验证

| 任务 | 说明 |
|---|---|
| MCP 写入 | 用 remember 写入测试记忆 |
| Dashboard 读取 | 确认记忆展示在页面 |
| Timeline 展示 | 确认会话历史显示 |

---

## 10. 商用合规

| 组件 | 许可证 | 关系 |
|---|---|---|
| mem0ai | Apache 2.0 | pip 调用，不修改 |
| FastMCP | MIT | pip 调用 |
| Ant Design | MIT | npm 依赖 |
| FastAPI | MIT | pip 调用 |
| React | MIT | npm 依赖 |
| MCP 服务代码 | 专有 | 自有版权 |
| CLI 代码 | 专有 | 自有版权 |
| Dashboard 代码 | 专有 | 自有版权 |

NOTICE 文件需声明 mem0ai (Apache 2.0)。
