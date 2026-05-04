# memsearch

> Markdown 即记忆

## 基本信息

| 字段 | 值 |
|---|---|
| **GitHub** | [zilliztech/memsearch](https://github.com/zilliztech/memsearch) |
| **⭐ Stars** | **1.6k** |
| **语言** | Python |
| **许可证** | MIT |
| **作者** | Zilliz（Milvus 向量数据库的母公司） |

## 定位

"Persistent, unified memory layer for all your AI agents, backed by Markdown and Milvus."——以 Markdown 文件为"真实来源"，Milvus 为语义索引。Claude Code 原生插件。

## 核心能力

- **Markdown 是真源头**：每次对话后自动摘要→追加到每日 `.md` 文件（`memory/YYYY-MM-DD.md`）
- **Milvus 影子索引**：Markdown 分块→ONNX 本地嵌入（bge-m3）→ Milvus 向量索引
- **3 层渐进召回**：搜索返回 ranked chunks → 展开 Markdown 段落 → 查看原始对话
- **跨 Agent 共享**：Claude Code、Codex CLI、OpenClaw、OpenCode 共享同一仓库
- **Claude Code 插件**：`/plugin marketplace add zilliztech/memsearch`
- **自然语言触发**：可直接问"我们聊过的 Redis TTL 是多少"

## 收费模式

| 模式 | 说明 |
|---|---|
| **开源版** | MIT，完全免费 |
| **依赖** | Milvus 需要自托管或使用 Zilliz Cloud（Zilliz 的云服务） |

## 优劣分析

| 维度 | 评价 |
|---|---|
| 透明度 | 🟢 Markdown 可读可编辑可版本控制 |
| Claude Code 集成 | 🟢 原生插件，体验最佳 |
| 跨 Agent | 🟢 多个编码 Agent 共享记忆 |
| 检索速度 | 🟡 依赖 Milvus 部署 |
| 元认知 | 🔴 无自动判断，需要用户主动 `/memory-recall` |

## 适用场景

Claude Code / Codex / OpenClaw 用户——需要跨 Agent 共享、Markdown 透明可审计的记忆
