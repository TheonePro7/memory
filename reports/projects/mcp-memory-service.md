# mcp-memory-service

> 自托管 MCP 记忆服务器

## 基本信息

| 字段 | 值 |
|---|---|
| **GitHub** | [doobidoo/mcp-memory-service](https://github.com/doobidoo/mcp-memory-service) |
| **⭐ Stars** | **1.8k** |
| **语言** | Python |
| **许可证** | Apache 2.0 |
| **定位** | 开源持久记忆——MCP + REST + CLI，自托管 |

## 定位

"Persistent Shared Memory for AI Agent Pipelines."——通过 MCP 协议为任何 MCP 兼容客户端（Claude Desktop、Claude Code、Cursor 等）提供自托管持久记忆。

## 核心能力

- **MCP 协议**：Claude Desktop / Claude Code 一键连接
- **REST API**：15 个端点，适配 LangGraph/CrewAI/AutoGen 等非 MCP 框架
- **知识图谱**：类型化因果关系（cause/fixes/contradicts）
- **ONNX 本地嵌入**：数据不离站
- **自主压缩**：旧记忆通过衰减和压缩自动管理
- **混合搜索**：BM25 + 向量 + 融合重排
- **多 Agent 共享**：X-Agent-ID 标记记忆归属
- **Remote MCP**：支持 claude.ai 浏览器集成（OAuth 2.0 + SSE）
- **检索 ~5ms**，1.8k ⭐

## 收费模式

| 模式 | 说明 |
|---|---|
| **开源版** | Apache 2.0，完全自托管免费 |
| **可选云同步** | 通过 Cloudflare 同步到团队协作（可选付费） |

## 优劣分析

| 维度 | 评价 |
|---|---|
| 隐私 | 🟢 ONNX 本地嵌入，数据完全离站 |
| 兼容性 | 🟢 MCP + REST 双通道，覆盖所有框架 |
| 检索速度 | 🟢 ~5ms |
| 知识图谱 | 🟢 因果关系建模（cause/fixes/contradicts） |
| 版本化 | 🔴 无 |
| 元认知 | 🔴 无 |

## 适用场景

需要完全本地/离线部署的隐私敏感型 Agent 记忆
