# Mem0

> Universal Memory Layer

## 基本信息

| 字段 | 值 |
|---|---|
| **GitHub** | [mem0ai/mem0](https://github.com/mem0ai/mem0) |
| **⭐ Stars** | **54.7k** |
| **语言** | Python |
| **许可证** | Apache 2.0 |
| **Release** | 315 个 release，最新 v2.7.x (2026.4) |
| **部署** | 库 (pip/npm) / 自托管 (Docker) / 云 (mem0.ai) |

## 定位

"Universal memory layer for AI Agents"——给 AI 助手提供智能记忆层，记住用户偏好、随时间自适应、持续学习。

## 核心能力

- **4 级记忆**：User / Session / Agent / Compound
- **自动提取**：从对话中提取关键信息（偏好、事实、任务状态），去重、合并已有记忆
- **重要性评分**：LLM 对每条记忆打分，低分自动归档
- **实体链接**：跨记忆的实体提取和关联
- **多信号检索**：语义 + BM25 关键词 + 实体匹配 平行评分融合
- **图增强 (Mem0g)**：2026 年新增图结构变体，多跳关系问题显著改善

## Benchmark

| 指标 | Mem0 (selective) | Mem0g (graph) | Full-Context |
|---|---|---|---|
| LLM Score | 66.9% | 68.4% | 72.9% |
| 中位延迟 | **0.71s** | 1.09s | 9.87s |
| p95 延迟 | 2.1s | — | 17.12s |
| Token/对话 | **~1,800** | ~1,800 | ~26,000 |

## 集成生态（21+）

**Agent 框架**：LangChain、LangGraph、CrewAI、Dify、OpenAI Agents SDK、LlamaIndex、Mastra、Vercel AI SDK

**模型平台**：OpenAI、Anthropic、Google、DeepSeek、vLLM、Ollama

**向量存储**：Pinecone、Qdrant、Weaviate、Chroma、Milvus、pgvector

**MCP**：Claude Code OpenMemory MCP、Google ADK

## 优劣分析

| 维度 | 评价 |
|---|---|
| 成熟度 | 🟢 最大生态，315 个 release，21+ 集成 |
| 易用性 | 🟢 API 调用即用 |
| 记忆持久度 | 🟢 跨会话持久化 |
| 延迟 | 🟢 0.71s 中位，远低于 full-context |
| 版本控制 | 🔴 无版本化（无法回滚/分支） |
| 元认知 | 🔴 无 Agent 自主判断——靠 LLM 被动提取 |
| 隐私 | 🟡 自托管可选，云服务模式需信任提供商 |

## 收费模式

| 模式 | 定价 | 说明 |
|---|---|---|
| **开源版** | 免费 | Apache 2.0，pip/npm 安装，自托管 |
| **Mem0 Free** | 免费 | 10K 记忆，社区支持 |
| **Mem0 Pro** | **$19/mo** | 50K 记忆，优先支持 |
| **Mem0 Pro+** | **$249/mo** | 无限记忆，自定义嵌入，SSO |
| **Enterprise** | 定制 | 私有部署，SLA，白标 |

## 适用场景

给自己的 Agent 产品加记忆层的首选 API
