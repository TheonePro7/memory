# Hindsight

> Biomimetic Agent Memory

## 基本信息

| 字段 | 值 |
|---|---|
| **GitHub** | [vectorize-io/hindsight](https://github.com/vectorize-io/hindsight) |
| **⭐ Stars** | **11.9k** |
| **语言** | Python |
| **许可证** | MIT |
| **论文** | [arxiv.org/abs/2512.12818](https://arxiv.org/abs/2512.12818) |
| **定位** | 仿生记忆系统——LongMemEval SOTA |

## 定位

用仿生数据结构组织 Agent 记忆。不是另一个向量检索方案，而是把记忆分为三种生物启发类型。

## 三类记忆

| 类型 | 类比 | 内容 |
|---|---|---|
| **World** | 语义记忆 | 客观事实、知识 |
| **Experiences** | 情景记忆 | Agent 自身历史 |
| **Mental Models** | 心智模型 | 通过反思原始记忆形成的"理解" |

## 三项操作

| 操作 | 功能 | 技术实现 |
|---|---|---|
| **Retain** | 写入 | LLM 提取事实/实体/时态数据/关系，后台存储 |
| **Recall** | 检索 | 四种策略并行：语义+关键词+图+时间 → RRF 融合 → Cross-encoder 重排 |
| **Reflect** | 反思 | 深层分析，从已有记忆形成新的连接和洞察 |

## Benchmark

LongMemEval 上**标注 SOTA**，由 Virginia Tech 的 Sanghani Center 独立复现验证。

## 优劣分析

| 维度 | 评价 |
|---|---|
| 评测可信度 | 🟢 第三方独立复现验证 |
| 架构创新 | 🟢 Mental Models 是独特的——不仅仅存储，还"理解" |
| 集成方式 | 🟢 两行代码替换 LLM client |
| 部署 | 🟢 Docker + 内嵌模式 + 云 |
| 版本化 | 🔴 无 |
| 元认知 | 🟡 Reflect 操作接近元认知，但还不是 Agent 自主判断 |

## 收费模式

| 模式 | 说明 |
|---|---|
| **开源版** | MIT，自托管免费 |
| **Hindsight Cloud** | 由 Vectorize 托管，有免费层和付费层 |

## 适用场景

需要"深度理解而非只是检索"的 Agent 记忆，评测可靠度要求高的场景
