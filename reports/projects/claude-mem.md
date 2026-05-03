# claude-mem

> Claude Code 持久记忆插件

## 基本信息

| 字段 | 值 |
|---|---|
| **GitHub** | [thedotmack/claude-mem](https://github.com/thedotmack/claude-mem) |
| **⭐ Stars** | **71.4k** |
| **语言** | TypeScript (86.4%) |
| **许可证** | AGPL-3.0 |
| **Release** | v12.5.0 (2026-05-02)，累计 254 个 release |
| **作者** | Alex Newman (@thedotmack) |

## 定位

Claude Code 的持久记忆压缩系统。自动捕获 Claude 在编码会话中做的一切，用 AI 压缩数据，并在未来会话中注入相关上下文。

## 核心能力

- **持久记忆**：会话上下文自动跨会话存活
- **渐进式披露**：分层记忆检索显示 token 成本
- **5 个生命周期 Hook**：SessionStart / UserPromptSubmit / PostToolUse / Stop / SessionEnd
- **Worker 服务**：HTTP API (port 37777)，10 个搜索端点，Web 查看器 UI
- **MCP 搜索工具**：4 个工具遵循 3 层工作流（搜索 → 时间线 → 获取观察），带来约 10 倍 token 节省
- **Chroma 向量 DB**：混合语义 + 关键词搜索
- **SQLite 数据库**：存储会话、观察、摘要，支持 FTS5 全文搜索
- **隐私机制**：`<private>` 标签包裹的内容不会存入记忆
- **无限模式 (beta)**：用于延长会话的仿生记忆架构
- **多 IDE 支持**：Claude Code、Gemini CLI、OpenCode、OpenClaw

## 技术架构

```
Claude Code 会话
    ↓ Hook 拦截
claude-mem Worker (localhost:37777)
    ├── SQLite (会话/观察/摘要)
    ├── Chroma (语义索引)
    └── MCP Server (搜索 API)
    ↓
下次会话注入上下文
```

## 优劣分析

| 维度 | 评价 |
|---|---|
| 易用性 | 🟢 Claude Code 插件即装即用 |
| 记忆持久度 | 🟢 跨会话自动持久化 |
| 延迟 | 🟡 Worker 服务在本地运行，检索有额外调用 |
| 隐私 | 🟢 `<private>` 标签 + 本地 SQLite |
| 版本控制 | 🔴 无版本化记忆（无法回滚/分支） |
| 元认知 | 🔴 无 Agent 自主判断记什么 |
| 扩展性 | 🟡 Chrome + SQLite，单机部署 |

## 收费模式

| 模式 | 说明 |
|---|---|
| **开源版** | AGPL-3.0，完全免费自托管 |
| **无付费版** | 纯开源社区项目，无付费版本 |

## 适用场景

Claude Code / Cursor 用户需要一个"装了就忘记"的记忆插件
