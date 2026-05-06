# Agent 扫描与跨 Agent 记忆管理 — 设计文档

> **状态：** 待实施
> **优先级：** P1（UI 美化后下一个核心功能）

## 1. 概述

Agent Memory Dashboard 从"单一 Agent 的记忆管理"升级为"多 Agent 记忆指挥中心"。
用户机器上可能有多个 Agent 系统（Claude Code、Cursor、Trae、OpenClaw、LangGraph 等），
Dashboard 需要自动发现这些 Agent，检测其记忆状态，并为无记忆的 Agent 一键部署记忆系统。

## 2. 用户流程

```
Dashboard "Agent" 页面
  │
  ├── 首次进入 → 自动扫描机器上的 Agent
  │     └── 展示检测结果列表
  │
  ├── 用户勾选要管理的 Agent（跳过荒废的）
  │     └── 点击"确认管理"
  │
  ├── 扫描所选 Agent 的记忆状态
  │     ├── ✓ Claude Code → 已有记忆 (mem0)
  │     ├── ⚠ Cursor → 无记忆系统 → [一键安装]
  │     └── ⚠ Trae → 无记忆系统 → [一键安装]
  │
  ├── 管理视图（跨 Agent 记忆面板）
  │     ├── 所有已管理 Agent 的总览卡片
  │     ├── 按 Agent 筛选记忆
  │     ├── 全局搜索（搜所有 Agent 的记忆）
  │     └── 编辑/删除（指定 Agent）
  │
  └── 设置页 → Agent 连接状态 / 重新扫描
```

## 3. 功能清单

### P0 — 核心功能
1. Agent 检测引擎（扫描已安装的 Agent，覆盖 20+ 主流 Agent）
2. Agent 选择 UI（勾选要管理的 Agent）
3. 记忆状态检测（每个 Agent 有没有记忆系统）
4. 跨 Agent 记忆总览/搜索/筛选
5. 一键部署（为无记忆的 Agent 安装 Agent Memory）

### P1 — 重要功能
6. 自定义 Agent（用户添加扫描器未覆盖的 Agent）
7. 每个 Agent 的配额独立统计
8. 编辑/删除时指定 Agent

### P2 — 后续
8. 批量操作记忆
9. 数据导出/清理
10. 荒废 Agent 自动识别建议

## 4. 架构设计

### 4.1 Agent 检测引擎（新增模块）

```
packages/dashboard/backend/src/
  ├── scanners/              ← 新增
  │   ├── __init__.py
  │   ├── base.py            ← Scanner 抽象基类
  │   ├── claude_code.py     ← Claude Code 检测
  │   ├── cursor.py          ← Cursor 检测
  │   ├── trae.py            ← Trae 检测
  │   ├── openclaw.py        ← OpenClaw 检测
  │   ├── langgraph.py       ← LangGraph 检测
  │   └── registry.py        ← 扫描器注册 + 聚合引擎
  └── routers/
      └── agents.py          ← 新增 API 路由
```

**Scanner 抽象基类：**
```python
class AgentScanner(ABC):
    @property
    def name(self) -> str: ...
    @property
    def display_name(self) -> str: ...
    def detect(self) -> bool: ...          # Agent 是否安装
    def check_memory(self) -> dict: ...    # 记忆状态检测
    def get_config_path(self) -> Path | None: ...
```

**内置扫描器覆盖范围（按类别）：**

**AI 编码 IDE（MCP 兼容）：**
| Agent | 检测方式 |
|-------|---------|
| Claude Code | `~/.claude/settings.json` 是否存在 |
| Cursor | Cursor MCP 配置目录 |
| Windsurf | Windsurf MCP 配置目录 |
| Trae (字节) | Trae 安装路径 + MCP 配置 |
| VS Code / Insiders | VS Code MCP 配置 |
| GitHub Copilot | Copilot MCP 配置 |
| Cline | VS Code 扩展 + 配置目录 |
| Continue.dev | VS Code 扩展 + 配置目录 |
| Augment Code | Augment 配置目录 |

**终端 AI Agent：**
| Agent | 检测方式 |
|-------|---------|
| Codex CLI (OpenAI) | Codex 安装路径 |
| OpenClaw | OpenClaw 配置文件 |
| Aider | Python 包检测 + 配置 |
| Goose (Block) | Goose 安装路径 |
| Gemini CLI (Google) | Python 包检测 |
| OpenCode | 安装路径检测 |
| Claude Desktop | `~/.claude/config.json` |

**AI 框架（非 MCP，但有记忆需求）：**
| Agent | 检测方式 |
|-------|---------|
| LangGraph | `pip list` Python 包 |
| CrewAI | Python 包检测 |
| Dify | Dify 配置目录 |
| Mastra | Node 包检测 |

> **未来策略：** 扫描器清单会随新 Agent 发布持续更新，保持 GitHub 版本为最新。

**记忆状态检测：**
- 检查 Agent 的 MCP 配置中是否有记忆相关工具
- 检查是否存在 `~/.agent-memory/` 目录
- 检查是否存在 `~/.mem0/` 等第三方记忆系统

### 4.2 API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/agents/scan` | 扫描所有已安装 Agent（内置 + 自定义） |
| GET | `/api/agents` | 获取已管理 Agent 列表 |
| POST | `/api/agents/manage` | 确认管理选中的 Agent |
| POST | `/api/agents/{name}/deploy` | 为指定 Agent 部署记忆系统 |
| DELETE | `/api/agents/{name}` | 移除管理的 Agent |
| POST | `/api/agents/custom` | 添加自定义 Agent |
| PUT | `/api/agents/custom/{id}` | 编辑自定义 Agent |
| DELETE | `/api/agents/custom/{id}` | 删除自定义 Agent |

### 4.3 前端变更

| 文件 | 改动 |
|------|------|
| `App.tsx` | 导航栏增加 "Agent" 入口 |
| `pages/Agents.tsx` | **新建** Agent 管理页面 |
| `pages/Memories.tsx` | 搜索栏增加 Agent 筛选器 |
| `pages/Settings.tsx` | Agent 状态面板填充真实数据 |

**Agent 页面布局（Vercel 暗色风格）：**

```
┌─────────────────────────────────────────────┐
│ Agent                              [+ 添加] │
│                                              │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────┐ │
│ │ 已检测 22 个  │ │ 已管理 3 个   │ │ 有记忆 2  │ │
│ └─────────────┘ └─────────────┘ └─────────┘ │
│                                              │
│ ── 自动检测 ──                                │
│ ┌─────────────────────────────────────────┐ │
│ │ ☑ Claude Code          ● 有记忆  已管理 │ │
│ │ ☑ Cursor               ○ 无记忆  部署→ │ │
│ │ ☐ Trae (可能已荒废)     -        忽略   │ │
│ │ ☑ Windsurf             ○ 无记忆  部署→ │ │
│ │ ☐ OpenClaw             -        忽略   │ │
│ │ ☐ VS Code              -        忽略   │ │
│ │ ...                                    │ │
│ └─────────────────────────────────────────┘ │
│                                              │
│ ── 自定义 Agent ──                            │
│ ┌─────────────────────────────────────────┐ │
│ │ ☑ MyBot                ○ 无记忆  部署→ │ │
│ └─────────────────────────────────────────┘ │
│                                              │
│         [确认管理选中的 N 个 Agent]           │
└─────────────────────────────────────────────┘
```

### 4.4 一键部署逻辑

部署 Agent Memory 到目标 Agent 的流程：

```python
def deploy(agent_name: str) -> dict:
    # 1. 读取目标 Agent 的 MCP 配置目录
    # 2. 写入 agent-memory MCP 服务器配置
    # 3. 写入 hooks（recall/summarize）
    # 4. 更新 CLAUDE.md（如有）
    # 5. 验证配置生效
    # 6. 返回部署结果
```

### 4.5 一键部署（直接用 Agent Memory 的 CLI 安装器）

实际上，部署功能不需要重新实现——**直接调用 `npx @agent-memory/init` 到目标目录**。但需要做的是：

1. 找到目标 Agent 的项目目录
2. 在该目录执行一键安装

```python
def deploy(agent_name: str, target_dir: str) -> dict:
    try:
        result = subprocess.run(
            ["npx", "@agent-memory/init", target_dir],
            capture_output=True, text=True, timeout=60
        )
        return {"success": result.returncode == 0, "output": result.stdout}
    except Exception as e:
        return {"success": False, "error": str(e)}
```

### 4.6 跨 Agent 记忆筛选

在现有 `/api/memories` 端点的 `project_id` 筛选基础上，改为 `agent` 筛选：

```
GET /api/memories?q=xxx&agent=claude-code&limit=50
```

如果 `agent` 参数为空，返回所有 Agent 的记忆。

需要后端在存储记忆时记录 `agent` 来源字段。

### 4.7 自定义 Agent

用户可以通过 UI 添加扫描器未覆盖的 Agent：

```
Agent 页面 → [添加自定义 Agent]
  │
  ├── Agent 名称（必填）
  ├── 类型（IDE / 终端 / 框架 / 其他）
  ├── MCP 配置目录（可选）
  ├── 项目目录（可选）
  ├── 检测命令（可选）— 如 `which my-agent`
  └── 图标（可选，自动生成首字母图标）
```

**实现方式：**
- 自定义 Agent 存储在一个 SQLite 表 `custom_agents` 中
- 扫描时：先运行内置扫描器，再加载自定义扫描器
- 自定义 Agent 同样支持：记忆检测 → 一键部署 → 跨 Agent 管理

**数据结构：**
```json
{
  "id": "uuid",
  "name": "My Custom Agent",
  "type": "terminal",
  "mcp_config_dir": "/path/to/.mcp",
  "project_dir": "/path/to/project",
  "detect_command": "which my-agent",
  "icon": null,
  "created_at": "2026-05-07T00:00:00Z"
}
```

## 5. 数据模型

在现有记忆的 metadata 中增加字段：

```json
{
  "agent": "claude-code",
  "agent_version": "0.1.0",
  "managed_by": "agent-memory"
}
```

已有记忆不需要批量迁移——按需补充即可。

## 6. 不做的范围

- 不做 Agent 之间的记忆同步/共享
- 不做 Agent 自动卸载记忆系统
- 不做荒废 Agent 自动清理（用户手动选择即可）

## 7. 设计决策

| 决策 | 选择 | 理由 |
|------|------|------|
| 检测方式 | 文件/配置扫描 | 无需安装 Agent SDK，非侵入式 |
| 部署方式 | 复用 npx @agent-memory/init | 避免重复实现安装逻辑 |
| 筛选方式 | metadata.agent 字段 | 与现有架构一致，改动最小 |
| Agent 来源标记 | 存储时自动注入 | 用户无感，默认当前 Agent |
