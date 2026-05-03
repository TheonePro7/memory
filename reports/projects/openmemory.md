# OpenMemory

> 认知记忆引擎

## 基本信息

| 字段 | 值 |
|---|---|
| **GitHub** | [CaviraOSS/OpenMemory](https://github.com/CaviraOSS/OpenMemory) |
| **⭐ Stars** | **4.1k** |
| **语言** | TypeScript (69%), Python (27%) |
| **许可证** | Apache 2.0 |
| **定位** | 认知记忆引擎——多 sector + 时序 KG |

## 定位

不仅仅是 RAG 或向量数据库。OpenMemory 跨越多个认知 sector 存储记忆，把时间作为第一维度，用复合评分（衰减+强化）而非余弦相似度做检索。

## 5 个认知 Sector

| Sector | 对应人类记忆 | 存储内容 |
|---|---|---|
| 情景 (Episodic) | 事件记忆 | 发生了什么 |
| 语义 (Semantic) | 事实记忆 | 客观知识 |
| 程序 (Procedural) | 技能记忆 | 怎么做 |
| 情感 (Emotional) | 情绪记忆 | 感觉如何 |
| 反思 (Reflective) | 元记忆 | 关于记忆的记忆 |

## 核心能力

- **时序知识图谱**：时间点真理窗口（"在某个时间点什么是真的"）
- **自适应遗忘**：衰减引擎 + 时间表
- **可解释召回**：显示"因为什么原因这条记忆被命中"
- **数据迁移工具**：从 Mem0 / Zep / Supermemory 一键迁移
- **MCP Server**：Claude/Cursor/Windsurf 集成
- **LangChain/CrewAI/AutoGen 集成**

## 收费模式

| 模式 | 说明 |
|---|---|
| **开源版** | Apache 2.0，自托管免费 |
| **云托管版** | 有云版本但具体定价未公开 |

## 优劣分析

| 维度 | 评价 |
|---|---|
| 认知完备度 | 🟢 5 个 sector ——目前最完整的认知记忆模型 |
| 时序推理 | 🟢 时间点真理窗口——知道"当时知道什么" |
| 可解释性 | 🟢 检索路径可追溯 |
| 迁移工具 | 🟢 支持 Mem0/Zep/Supermemory 一键迁移 |
| 版本化 | 🔴 无 |
| 元认知 | 🟡 反思 sector 接近但未实现 Agent 自主判断 |

## 适用场景

认知完备度要求高的 Agent——不只记住"什么"，还知道"当时的感觉"
