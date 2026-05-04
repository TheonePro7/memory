# MemMachine

> 通用记忆层

## 基本信息

| 字段 | 值 |
|---|---|
| **GitHub** | [MemMachine/MemMachine](https://github.com/MemMachine/MemMachine) |
| **⭐ Stars** | **3.5k** |
| **语言** | Python |
| **许可证** | Apache 2.0 |
| **定位** | 可扩展/可互操作的记忆层 |

## 定位

"Universal memory layer for AI Agents"——三行代码集成，三层记忆架构。

## 三层记忆

| 层级 | 功能 | 存储 |
|---|---|---|
| Working | 短期工作记忆 | 内存 |
| Episodic | 持久对话上下文 | 图 (Neo4j) |
| Profile | 长期用户事实/偏好 | SQL |

## 集成

- **框架**：LangChain、LangGraph、CrewAI、LlamaIndex、n8n、Dify、FastGPT
- **接口**：Python SDK / TypeScript SDK / REST API / MCP Server
- **LLM**：OpenAI、Anthropic、Bedrock、Ollama

## 收费模式

| 模式 | 说明 |
|---|---|
| **开源版** | Apache 2.0，自托管免费 |
| **云服务** | 有托管版，具体定价未公开 |

## 优劣分析

| 维度 | 评价 |
|---|---|
| 易用性 | 🟢 "5 行代码"集成 |
| 三层架构 | 🟢 标准分层，覆盖完整 |
| 集成广度 | 🟢 7 个框架 + 4 个 LLM 平台 |
| 差异化 | 🟡 标准分层，无突出创新 |
| 版本化 | 🔴 无 |
| 元认知 | 🔴 无 |

## 适用场景

快速给现有 Agent 加标准三层记忆
