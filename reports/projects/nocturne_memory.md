# nocturne_memory

> URI 图路由记忆 · MCP LTM 服务器

## 基本信息

| 字段 | 值 |
|---|---|
| **GitHub** | [Dataojitori/nocturne_memory](https://github.com/Dataojitori/nocturne_memory) |
| **⭐ Stars** | **1.0k** |
| **语言** | TypeScript |
| **许可证** | MIT |
| **定位** | 轻量、可回滚、可视化的 LTM MCP 服务器 |

## 定位

"lightweight, rollbackable, and visual Long-Term Memory Server for MCP Agents."——以 URI 图路由替代向量 RAG，每条记忆有唯一 URI 路径。

## 核心能力

- **URI 图路由**：`core://agent/identity` 层次路径，非平坦向量嵌入
- **自演化 CRUD**：Agent 自主管理记忆，自动版本快照供回滚
- **条件触发**：每条记忆带触发条件，Agent 在上下文中而非随机召回
- **词汇表自动超链接**：关键词跨节点互链
- **系统启动身份协议**：核心记忆启动时自动加载，Agent"醒来就知道自己是谁"
- **跨平台灵魂**：Claude/Gemini/GPT/Cursor/Copilot 全兼容
- **可视化面板**：React 前端浏览/编辑/审计/回滚
- **双后端**：本地 SQLite / PostgreSQL 多设备同步
- **Docker 部署**

## 收费模式

| 模式 | 说明 |
|---|---|
| **开源版** | MIT，完全免费 |
| **无云版** | 纯自托管设计 |

## 优劣分析

| 维度 | 评价 |
|---|---|
| 设计哲学 | 🟢 URI 图路由——最有哲学深度的设计 |
| 可回滚 | 🟢 版本快照（接近 beads 的方向但不同实现） |
| 条件触发 | 🟢 条件触发机制是元认知的雏形 |
| 跨平台 | 🟢 不是只锁一个模型 |
| 生态 | 🟡 1.0k ⭐，较小 |
| 成熟度 | 🟡 较新，工程成熟度待验证 |

## 适用场景

对"Agent 记忆设计哲学"感兴趣——URI 图路由范式可能影响下一代记忆方案
