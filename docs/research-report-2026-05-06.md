# Agent 记忆赛道市场调研报告

> 报告日期：2026-05-06
> 说明：本报告为纯市场调研，不涉及任何特定产品的架构或实现方案。调研范围涵盖全球开源项目、科学界研究、国内外产品格局。

---

## 目录

1. [赛道定义与边界](#1-赛道定义与边界)
2. [全球开源生态](#2-全球开源生态)
3. [科学界研究动态](#3-科学界研究动态)
4. [国内产品格局](#4-国内产品格局)
5. [国际商业产品](#5-国际商业产品)
6. [范式分类与技术路线](#6-范式分类与技术路线)
7. [市场空白分析](#7-市场空白分析)
8. [赛道趋势判断](#8-赛道趋势判断)
9. [附录](#9-附录)

---

## 1. 赛道定义与边界

### 1.1 什么是 Agent 记忆

Agent 记忆是指 AI Agent 在会话之间保持信息连续性、积累经验、避免重复错误的能力。与 RAG（检索增强生成）不同，Agent 记忆关注的是 Agent 自身经验的持久化，而非外部知识库的检索。

### 1.2 赛道边界

本调研覆盖的范围：
- AI Agent 的长期记忆存储与检索
- Agent 跨会话上下文保持
- 记忆的结构化提取、更新、衰减
- 人-Agent 记忆协同管理

不覆盖：
- 基础 RAG 系统（专注外部知识检索）
- 会话上下文窗口优化（专注单次会话）
- 模型层记忆机制（如 Transformer 的上下文学习）
- 向量数据库本身（如 Pinecone、Weaviate）

### 1.3 赛道成熟度

该赛道形成于 2024 年下半年，2025-2026 年快速膨胀。标志性事件：
- 2024：Mem0 开源，迅速增长至 48K ⭐
- 2025 H1：MemGPT 更名 Letta，融资 $10M
- 2025 H2：Zep 开源 Graphiti
- 2026 Q1：Mem0 融资 $24M Series A
- 2026 Q2：Hindsight 达到 91.4% LongMemEval SOTA

---

## 2. 全球开源生态

### 2.1 主要开源项目一览

| 项目 | ⭐ | 语言 | 首次发布 | 最近更新 | 开源协议 |
|------|-----|------|---------|---------|---------|
| Mem0 | 48K | Python | 2024 | 2026-04 | Apache 2.0 |
| Zep/Graphiti | 24K | Python | 2024 | 2026 | Apache 2.0 |
| Letta (MemGPT) | 21K | Python | 2024 | 2026-04 | Apache 2.0 |
| Cognee | 12.5K | Python | 2024 | 2026 | Apache 2.0 |
| Hindsight | 4K | Python | 2026-02 | 2026-04 | MIT |
| LangMem | 1.3K | Python | 2025 | 2026 | MIT |
| Basic Memory | — | Python | 2025 | 2026 | MIT |
| Matrix Origin Memoria | — | — | 2025 | 2026 | 已开源 |

### 2.2 Mem0（48K ⭐）

**定位：** Universal Memory Layer for AI Agents

**技术特征：**
- 多向量库支持（19 个后端，含 Qdrant、ChromaDB、Pinecone 等）
- 多框架集成（21 个框架，含 LangChain、CrewAI、Dify 等）
- 支持 User/Session/Agent 三级记忆
- 实体提取与链接
- 混合检索（语义 + BM25 + 实体增强）

**2026 年 4 月重大更新：**
- 新记忆算法：单次 ADD-only 提取，不做 UPDATE/DELETE
- 宣称在 LoCoMo 上从 71.4 提升到 91.6（+20pp）
- 宣称在 LongMemEval 上从 67.8 提升到 93.4（+26pp）
- Agent 生成的事实与用户内容等权重存储

**商业模式：** 开源库 + 云服务（app.mem0.ai）
- Free：10K mems
- $19/mo：50K mems
- $249/mo Pro
- SOC 2 & HIPAA 合规

**社区活跃度：** 高。48K ⭐，活跃的 GitHub Discussions，官方博客持续更新。

### 2.3 Zep / Graphiti（24K ⭐）

**定位：** Context Engineering Platform

**技术特征：**
- 时间知识图谱（Graphiti）——事实携带时间窗口
- 能追踪事实的"随时间演变"
- 支持查询"在时间 T 我们知道什么"
- 三 SDK：Python、TypeScript、Go
- 检索延迟 <200ms（云）

**商业模式：** 开源 + 云。Community Edition 已弃用。自托管功能不全。

**社区活跃度：** 高。制作了"从 Mem0 迁移到 Zep"的工具，主动抢竞品用户。

### 2.4 Letta（21K ⭐，原 MemGPT）

**定位：** OS 虚拟内存式 Agent Runtime

**技术特征：**
- 三层架构：Core（工作记忆）→ Recall（对话历史）→ Archival（长期存储）
- 2026 年推出 Letta Code 桌面应用
- Context Repositories：Git 版本化 Agent 记忆
- 模型无关部署（支持多模型提供商）
- Agent 技能系统
- Letta Evals + Context-Bench + Recovery-Bench 评估体系

**商业模式：** 开源 + 云。未披露具体定价。

**社区活跃度：** 中高。有桌面应用、评估体系、云服务。

### 2.5 Hindsight（4K ⭐）

**定位：** 多策略混合记忆系统

**技术特征：**
- 四策略并行：语义 + BM25 + 图 + 时间
- `reflect` 合成操作（LLM 驱动的事实提取）
- 单 Docker 命令自托管，无需外部数据库
- SOTA：91.4% LongMemEval（公开最高）

**商业模式：** 纯开源。无商业化迹象。

**社区活跃度：** 低。新项目（2026-02），4K ⭐，无 GUI 无云服务。

### 2.6 Cognee（12.5K ⭐）

**定位：** Enterprise Memory Layer

**技术特征：**
- 知识图谱 + 向量 + 多模态（文本/图片/音频）
- 30+ 数据源连接器
- 完全本地运行
- 企业级合规

**商业模式：** 开源 + 云。€7.5M Seed（Berlin）。

**社区活跃度：** 中。

### 2.7 Basic Memory

**定位：** 文件级透明记忆

**技术特征：**
- 记忆存储在 Markdown 文件中
- 用户可读、可编辑
- 通过文件同步（如 Dropbox、iCloud）实现跨设备

**商业模式：** Bootstrapped。开源 + 云。

**社区活跃度：** 低但口碑好。以"透明"为差异化。

### 2.8 开发趋势总结

观察到的趋势：
1. **全都在做存储 API**——所有项目的核心都是"存进去、搜出来"
2. **全都在比 Benchmark**——LoCoMo、LongMemEval、BEAM 是三大基准
3. **GUI 几乎不存在**——除了 Basic Memory（用文件系统当 GUI）外，没有项目提供完整的管理界面
4. **Agent 执行力无人关注**——所有项目关注检索质量，不关注 Agent 检索后是否实际使用了记忆

---

## 3. 科学界研究动态

### 3.1 研究热点

当前学术界在 Agent 记忆方向的研究集中在以下领域：

#### 3.1.1 长上下文 vs 外部记忆

核心争论：**1M+ 上下文窗口是否取代外部记忆？**

- Mem0 通过博客和 BEAM Benchmark 主张"1M 上下文不够"
- 模型厂商（OpenAI、Anthropic、Google）在推百万级上下文窗口
- 学术界尚无定论。但普遍认为：上下文窗口和外部记忆不是替代关系，而是互补关系

#### 3.1.2 记忆评估基准

| 基准 | 描述 | 当前 SOTA |
|------|------|----------|
| LoCoMo | 长对话一致性 | Mem0 91.6（2026-04） |
| LongMemEval | 长期记忆准确性 | Hindsight 91.4% |
| BEAM (1M) | 百万上下文窗口下的记忆 | Mem0 64.1 |

#### 3.1.3 记忆的模型层研究

研究方向：
- 模型权重层面的持久记忆（不是外部存储）
- 通过强化学习将记忆嵌入模型内部
- 代表性：MemoraX（深圳忆纪元科技）的"内生记忆"路线

### 3.2 未解决的科学问题

1. **什么是值得记住的？** — 没有通用理论判断哪些信息值得持久化
2. **新旧记忆如何融合？** — 矛盾信息如何解决，没有标准方案
3. **记忆的遗忘机制？** — 什么情况下应该遗忘，人工设定还是自动衰减
4. **记忆的迁移？** — 在任务 A 学到的记忆如何迁移到任务 B

学术界研究这些问题，但尚未有公认的解决方案。

### 3.3 学术界 vs 工业界的分化

| | 学术界 | 工业界 |
|--|--------|--------|
| 关注点 | 模型层记忆机制 | 系统层记忆架构 |
| 时间线 | 5-10 年 | 现在 |
| 产出 | 论文 + Benchmark | 产品 + API |
| 问题 | 怎么让模型自己记住 | 怎么在模型外面搭记忆系统 |
| 关系 | 不冲突。学术界研究"大脑"，工业界做"外挂硬盘" |

---

## 4. 国内产品格局

### 4.1 概览

国内在 Agent 记忆赛道的参与者少于海外，但资金实力更强。

| 项目 | 公司/团队 | 融资 | 阶段 | 定位 |
|------|----------|------|------|------|
| EverMind | 陈天桥（盛大创始人）+ 前华为首席科学家邓亚峰 | 未披露 | 学术级 | 长期记忆平台 |
| MemoraX AI | 深圳忆纪元科技（前华为决策推理实验室主任郝建业） | 千万美元 Seed | 早期 | 内生记忆 |
| MemoryLake | 质变科技 | 未披露 | 早期 | 多模态记忆 |
| Matrix Origin Memoria | 矩阵起源 | 未披露 | 已开源 | Git for Memory |

### 4.2 EverMind

**背景：**
- 盛大创始人陈天桥 + 前华为首席科学家邓亚峰联手
- 2026 年 2 月发起"Memory Genesis 2026"全球黑客大赛，奖金 $80,000
- 得到 OpenAI 支持

**产品：** EverMemOS Cloud
- 多个 benchmark 达到 SOTA
- 学术级长期记忆方案

**判断：** 有大佬背书、有学术实力、有社区运营。但还处于"实验室→大赛"阶段，没有商业化产品。

### 4.3 MemoraX AI（深圳忆纪元科技）

**背景：**
- 创始人郝建业：前华为决策推理实验室主任、MIT 博士后
- 2026 年 4 月融资千万美元（光源资本 + 钟鼎资本）

**技术路线：** 内生记忆
- 通过强化学习把记忆嵌入模型底层
- 不是外部数据库方案
- 宣称训练效率提升数百倍，跨场景复用

**方向：** B2B（金融/医疗/法律）+ B2C（个人助手）

**判断：**
- 团队背景强（华为 AI 核心人物）、资金充足
- 技术路线不同（内生 vs 外挂），与所有其他竞品不直接竞争
- 预计 12 个月后出标准化产品
- **是目前看到最有威胁的竞品**

### 4.4 MemoryLake（质变科技）

**定位：** 首个大规模多模态 AI 记忆平台
**宣称：** 能省 91% token，支持文本/图片/音视频
**判断：** 更像是"token 优化工具"而不是"记忆产品"。

### 4.5 Matrix Origin Memoria（矩阵起源）

**定位：** "Git for Memory"——Agent 可信记忆框架
**判断：** 与 beads 的思路最接近（版本化记忆），偏数据层，没有应用层。

### 4.6 国内市场竞争判断

| 特征 | 海外 | 国内 |
|------|------|------|
| 数量 | 10+ 家 | 4 家 |
| 资金 | $50M+ | 千万美元起 |
| 团队背景 | 技术创业者 | 大厂 VP 级 + 学术界领军人物 |
| 商业化程度 | 有定价、有云服务 | 基本未商业化 |
| 技术路线 | 存储 API | 内生记忆 + 学术研究 |

---

## 5. 国际商业产品

### 5.1 Mem0 Cloud

- Free：10K mems
- $19/mo（50K mems）
- $249/mo Pro
- SOC 2 & HIPAA 合规
- 浏览器扩展（跨 ChatGPT、Perplexity、Claude）
- Claude Code、Codex、Cursor、Windsurf 插件

### 5.2 Zep Cloud

- 云服务状态：Community Edition 已弃用
- 功能不全的自托管选项
- 定价不友好

### 5.3 Letta Cloud

- Letta Code 桌面应用（本地运行 Agent）
- 云服务存在但具体定价未披露
- 桌面 + 云 + 移动（Remote Environments）

### 5.4 商业趋势总结

1. **开源获客 → 云服务变现** — 所有玩家都是这个模式
2. **定价差距大** — 从免费到 $249/mo，说明市场尚未形成统一价格锚
3. **自托管 vs 云的两难** — Zep 的 Community Edition 弃用说明自托管不赚钱
4. **浏览器扩展是新的战场** — Mem0 已经入场

---

## 6. 范式分类与技术路线

### 6.1 三个范式

根据 virenmohindra（2026）的分析：

| 范式 | 谁决定"记住什么" | 代表 | 优势 | 劣势 |
|------|-----------------|------|------|------|
| 系统管理提取 | 系统自动提取 | Mem0, Graphiti, Cognee | 输出干净、结构化 | 写入成本高 |
| Agent 自管理 | Agent 自己判断 | Letta (MemGPT) | 灵活、优雅 | 依赖 Agent 自律性 |
| 压缩与检索 | 系统压缩历史 | SimpleMem, memsearch | Token 高效 | 牺牲保真度 |

### 6.2 技术路线分类

| 技术路线 | 代表项目 | 核心原理 |
|----------|---------|---------|
| 纯向量检索 | Mem0, LangMem | Embedding + 向量距离搜索 |
| 向量 + 知识图谱 | Zep/Graphiti, Cognee | 向量 + 实体关系图 |
| 多策略混合 | Hindsight | 语义 + BM25 + 图 + 时间并行融合 |
| 内生记忆 | MemoraX | 强化学习将记忆嵌入模型权重 |
| 文件系统 | Basic Memory | Markdown 文件，人类可读 |
| 版本化数据 | beads, Memoria | Git 式版本控制 |

### 6.3 四层记忆架构映射

学术界和工业界普遍接受的记忆分层模型：

| 层 | 功能 | 覆盖的竞品 |
|----|------|-----------|
| 工作记忆 | 当前会话上下文 | 所有模型厂商 |
| 情景记忆 | 跨会话摘要+向量检索 | Mem0, Zep, Hindsight, Cognee |
| 任务记忆 | 结构化任务追踪 | beads, Memoria, Letta |
| 长期知识 | 结构化知识积累 | StructMem, EverMind, MemoraX |

**情景记忆层竞争最拥挤**，任务记忆层和长期知识层基本空白。

---

## 7. 市场空白分析

### 7.1 空白 1：没有人类管理接口

所有人提供的是存储接口：

```
add(content) — 存一条数据
search(query) → list — 搜相关数据
delete(id) — 删一条数据
```

没有人提供人类可以使用的管理接口：

```
browse() → list — 浏览所有记忆，含来源追溯
review(id) → detail — 查看单条记忆的完整上下文
correct(id, new) — 修正错误记忆
manage(filter) → batch — 批量清理、导出、整理
```

### 7.2 空白 2：没有 Agent 执行力

所有项目关注"检索质量"（Benchmark 分数），不关注"Agent 实际使用了没有"。
- 没有项目追踪 recall 后 Agent 是否使用了记忆
- 没有项目提供"Agent 无法忽视记忆"的机制
- 所有项目都是"图书馆员"，不是"教练"

### 7.3 空白 3：没有人可管理

全球 20+ 竞品中，没有项目提供完整的管理界面。
- 没有记忆编辑/删除 UI
- 没有记忆来源追溯
- 没有批量清理
- 没有人类纠错机制

### 7.4 空白 4：没有情景+任务统一

- Mem0 做情景记忆不做任务
- beads 做任务记忆不做情景
- 没有人统一两种记忆类型

### 7.5 空白 5：没有四层全栈

所有竞品只切一层：
- Mem0 → 情景记忆
- Letta → 工作 + 情景（但耦合在运行时里）
- beads → 任务记忆
- EverMind / MemoraX → 长期知识

没有人提供从工作记忆到长期知识的完整记忆管线。

---

## 8. 赛道趋势判断

### 8.1 短期趋势（6-12 个月）

1. **混合搜索成为标配** — BM25 + 语义 + 实体已是 Mem0 和 Hindsight 的标准配置
2. **Agent 执行力将受到关注** — 随着"存得够准了"，注意力会转向"用得够不够"
3. **人机协同管理出现** — 记忆不能只是 Agent 的，人要能参与管理
4. **Benchmark 竞赛趋缓** — 分数接近天花板后，差异化转向产品体验

### 8.2 中期趋势（12-24 个月）

1. **上游内置记忆** — 模型厂商可能内建简单记忆能力，挤压第三方空间
2. **内生记忆产品化** — MemoraX 如成功，可能改写赛道规则
3. **整合并购** — 头部项目收购补全功能
4. **行业分化** — 通用记忆 vs 垂直行业记忆（医疗、法律、金融）

### 8.3 长期不确定性

1. 模型层记忆突破是否会淘汰外挂记忆？
2. 开源商业化模型是否可持续？
3. 用户是否愿意为"Agent 记忆力更好"付费？

### 8.4 关键时间节点

| 时间 | 事件 | 影响 |
|------|------|------|
| 2026-06 | Mem0 有可能推出产品化更新 | ⚠️ |
| 2026-12 | MemoraX 预计出产品 | 🔴 |
| 2027 | 模型厂商可能内置记忆 | 🔴 |
| 未定 | Hindsight 可能商业化 | 🟡 |

---

## 9. 附录

### 9.1 信息来源

- 各项目 GitHub 仓库（2026-05 数据）
- 各项目官方博客与公告
- [The State of Agent Memory (2026)](https://blog.virenmohindra.me/p/the-state-of-agent-memory-2026) — 10 个仓库的深度代码分析
- [State of AI Agent Memory 2026 (Mem0)](https://mem0.ai/blog/state-of-ai-agent-memory-2026) — Mem0 官方生态报告
- [Best AI Agent Memory Systems in 2026: 8 Frameworks Compared](https://vectorize.io/articles/best-ai-agent-memory-systems)
- [Basic Memory vs Mem0 vs Letta](https://basicmemory.com/blog/basic-memory-vs-mem0-vs-letta)
- [Hindsight 91.4% LongMemEval](https://github.com/EZFRICA/ux-driven-agent-memory)
- [MemoraX AI 完成千万美元种子轮融资](https://www.chinaz.com/ainews/27522.shtml)
- [EverMind launches EverMemOS Cloud](https://www.tmtpost.com/7867773.html)

### 9.2 术语表

| 术语 | 释义 |
|------|------|
| LoCoMo | Long Context Consistency 基准 |
| LongMemEval | 长期记忆准确性基准 |
| BEAM | Billion-context Evaluation and Analysis of Memory |
| SOTA | State of the Art（当前最优） |
| Graph RAG | 基于知识图谱的检索增强生成 |
| BM25 | 传统关键词检索算法 |
| ADD-only | 只追加不更新的存储策略 |
