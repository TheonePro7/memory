# Supermemory

> Memory Engine + 混合搜索

## 基本信息

| 字段 | 值 |
|---|---|
| **GitHub** | [supermemoryai/supermemory](https://github.com/supermemoryai/supermemory) |
| **⭐ Stars** | **22.4k** |
| **语言** | TypeScript (61.9%), MDX, Python |
| **许可证** | MIT |
| **关键词** | LongMemEval #1 |

## 定位

"Memory and context layer for AI"——记忆引擎 + 混合搜索。区别于纯 RAG（"RAG 检索的是文档块，无状态，同一结果给所有人"），同时做知识库检索和个性化记忆。

## 核心能力

- **事实提取**：从对话中提取偏好、项目细节，过滤噪音
- **用户画像构建**：稳定长期事实 + 近期活动（~50ms 响应）
- **时序逻辑**：信息过期自动处理，矛盾自动消解（"我搬去旧金山了"自动覆盖"我住在纽约"）
- **混合搜索**：知识库检索 + 个性化记忆在单查询中合并
- **MCP 插件**：Claude Code、Cursor、Windsurf、VS Code、OpenCode、OpenClaw
- **框架集成**：Vercel AI SDK、LangChain、LangGraph、OpenAI Agents SDK、Mastra

## Benchmark

| 指标 | 值 |
|---|---|
| **LongMemEval** | **81.6%** (排名 #1) |
| LoCoMo | 表现强劲 |
| ConvoMem | 表现强劲 |
| 响应时间 | ~50ms |
| MemoryBench | 自建开源评测框架 |

## 优劣分析

| 维度 | 评价 |
|---|---|
| Benchmark | 🟢 LongMemEval #1，自带 MemoryBench 评测框架 |
| 范式 | 🟢 "记忆≠RAG" 的分层定位清楚 |
| 响应速度 | 🟢 50ms — 比 Mem0 (0.71s) 快 |
| 生态 | 🟢 MCP 插件 + 框架集成较全 |
| 版本控制 | 🔴 无版本化 |
| 元认知 | 🔴 无 Agent 自主判断 |
| 语言栈 | 🟡 TypeScript 为主，Python 生态可能兼容性差 |

## 收费模式

| 模式 | 说明 |
|---|---|
| **开源版** | MIT，自托管免费 |
| **Supermemory Cloud** | 有托管版，定价未公开 |

## 适用场景

需要同时做"知识库 RAG + 用户个性化记忆"的产品
