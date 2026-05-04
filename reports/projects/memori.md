# Memori

> Agent-native Memory Infrastructure

## 基本信息

| 字段 | 值 |
|---|---|
| **GitHub** | [MemoriLabs/Memori](https://github.com/MemoriLabs/Memori) |
| **⭐ Stars** | **14.1k** |
| **语言** | Python |
| **许可证** | Apache 2.0 |
| **定位** | LLM-agnostic 持久化状态层 |

## 定位

"LLM-agnostic layer that turns agent execution and conversation into structured, persistent state for production systems."——不挑模型、不挑框架的记忆层。

## 核心能力

- **拦截式记忆提取**：通过 SDK 包装器拦截 LLM 交互，自动持久化事实、偏好、关系
- **实体-进程-会话三级**：属性/事实/偏好/关系/规则/技能/事件/人物 全维度追踪
- **后台零延迟**：记忆提取在后台运行，不阻塞主推理路径
- **LoCoMo 81.95%**：~1,294 token/query（全上下文的 5%）
- **BYODB**：自带数据库选项，支持自托管
- **MCP / OpenClaw 插件**：一行命令接入 Claude Code、Cursor、Codex

## Benchmark

| 指标 | 值 |
|---|---|
| LoCoMo | **81.95%** |
| Token/query | ~1,294（仅占 full-context 的 5%） |

## 优劣分析

| 维度 | 评价 |
|---|---|
| 无侵入性 | 🟢 零代码变更接入（SDK/MCP） |
| Token 效率 | 🟢 1,294 token/query——超高效 |
| LLM 无关 | 🟢 OpenAI/Anthropic/Gemini/DeepSeek 全支持 |
| 延迟 | 🟢 后台提取，不阻塞推理 |
| 版本化 | 🔴 无 |
| 元认知 | 🔴 无 |

## 收费模式

| 模式 | 说明 |
|---|---|
| **开源版** | Apache 2.0，自托管免费 |
| **Memori Cloud** | 有托管版，开发者有免费额度，付费层按量计费 |

## 适用场景

在不改现有架构的前提下为任何 LLM Agent 加记忆
