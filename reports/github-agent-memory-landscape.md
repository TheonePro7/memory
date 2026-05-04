# GitHub Agent 记忆生态全图 (2026.5)

> 全覆盖调查 · 基于 GitHub topic 搜索 `agent-memory` (633 repos)、`ai-memory` (892 repos)、`long-term-memory` (304 repos)、`memory-management`、`agent-context` 多维度交叉验证

---

## 一、生态总览

| 分类 | 数量（已知） | 代表项目 |
|---|---|---|
| 10k+ ⭐ 头部 | 9 个 | claude-mem, mem0, OpenViking, supermemory, dolt, Letta, cognee, Memori, memU |
| 1k-10k ⭐ 腰部 | 20+ 个 | MemOS, hindsight, julep, OpenMemory, EverOS, MemMachine, vault-ai 等 |
| 1k ⭐ 以下 | 600+ 个 | LightMem, memorix, powermem, nocturne_memory, AgentRecall-MCP 等 |
| 23.0k | beads (bd) | 版本化任务记忆 | Dolt 驱动的分布式图问题追踪器 |

---

## 二、项目全景（按 ⭐ 排序）

### ⭐ 10 万级（超级头部）

暂无。

### ⭐ 7 万级

| 项目 | ⭐ | 简介 | 技术栈 | 核心创新 |
|---|---|---|---|---|
| **thedotmack/claude-mem** | **71.4k** | Claude Code 的持久记忆压缩系统。自动捕获编码会话并用 AI 压缩，下次会话注入相关上下文 | TypeScript, SQLite, Chroma | 5 个生命周期 Hook、Endless Mode（仿生记忆架构）、10 倍 token 节省、254 个 release |

### ⭐ 5 万级

| 项目 | ⭐ | 简介 | 技术栈 | 核心创新 |
|---|---|---|---|---|
| **mem0ai/mem0** | **54.7k** | Universal memory layer。记住用户偏好，随时间自适应，持续学习 | Python, 多 Vector DB | 4 级记忆 (user/session/agent/composite)、315 releases、21+ 框架集成、4 种部署模式 |

### ⭐ 2-3 万级

| 项目 | ⭐ | 简介 | 技术栈 | 许可证 |
|---|---|---|---|---|
| **volcengine/openviking** | **23.4k** | **上下文数据库**——文件系统范式组织 Agent 记忆。`viking://` 协议管理层级上下文 | Python (85%), Rust | AGPLv3 |
| **dolthub/dolt** | **22.5k** | **Git for Data**——MySQL 兼容的版本化数据库。beads 的存储基座 | Go | Apache 2.0 |
| **supermemoryai/supermemory** | **22.4k** | 记忆引擎 + 混合搜索。LongMemEval #1 (81.6%)，50ms 响应 | TypeScript | MIT |
| **letta-ai/letta** | **22.4k** | 状态化 Agent 平台（原 MemGPT）。git-backed memory + Context Constitution | Python | Apache 2.0 |

### ⭐ 1-2 万级

| 项目 | ⭐ | 简介 | 技术栈 |
|---|---|---|---|
| **topoteretes/cognee** | **17.0k** | 企业级记忆层：KG + Vector + 多模态 + 30+ 数据源 | Python |
| **MemoriLabs/Memori** | **14.1k** | Agent-native 记忆基础设施，LLM-agnostic。LoCoMo 81.95% | Python |
| **NevaMind-AI/memU** | **13.5k** | 24/7 主动 Agent 记忆，面向 OpenClaw 等持续运行 Agent | Python |
| **vectorize-io/hindsight** | **11.9k** | **仿生记忆系统**：World + Experiences + Mental Models。LongMemEval SOTA | Python |

### ⭐ 5k-10k

| 项目 | ⭐ | 简介 | 技术栈 |
|---|---|---|---|
| **MemTensor/MemOS** | **8.9k** | AI 记忆操作系统。图记忆 + 多模态 + Skill memory，声称 72% token 节省 | TypeScript |
| **julep-ai/julep** | **6.6k** | "Firebase for AI agents"——持久记忆 + 工具编排 + 并行执行 + 可靠错误处理 | Python/Jupyter |

### ⭐ 1k-5k

| 项目 | ⭐ | 简介 | 关键差异 |
|---|---|---|---|
| **EverMind-AI/EverOS** | 4.4k | 自进化 Agent 记忆平台 | **HyperMem (92.73% LoCoMo)**，ACL 2026 |
| **CaviraOSS/OpenMemory** | 4.1k | 认知记忆引擎：5 个认知 sector + 时序 KG + 自适应遗忘 | TypeScript, Python |
| **MemMachine/MemMachine** | 3.5k | 通用记忆层：Working + Episodic + Profile 三层记忆 | Python, Neo4j |
| **pashpashpash/vault-ai** | 3.4k | ChatGPT 长期记忆（OpenAI + Pinecone） | Go, React |
| **plastic-labs/honcho** | 3.2k | 构建 stateful agent 的记忆库 | Python |
| **memodb-io/memobase** | 2.7k | **用户画像记忆**：结构化 profile + 时间线事件 | Python |
| **FlowElement-ai/m_flow** | 2.5k | 生物启发的认知记忆引擎（Graph RAG 新范式） | Python |
| **kayba-ai/agentic-context-engine** | 2.2k | "让 Agent 从经验中学习" | Python |
| **lucidrains/titans-pytorch** | 2.0k | Titans——Transformer 记忆架构的 PyTorch 实现 | Python |
| **trustgraph-ai/trustgraph** | 2.0k | 图原生上下文开发平台 | Python |
| **agentset-ai/agentset** | 2.0k | 开源 RAG 平台：22+ 文件格式、内置引用、深度研究 | TypeScript |
| **doobidoo/mcp-memory-service** | 1.8k | 自托管 MCP 记忆服务器。KG + ONNX 本地嵌入 + 5ms 检索 | Python |
| **zilliztech/memsearch** | 1.6k | **Markdown 即记忆**：Claude Code 原生插件，跨 Agent 共享 | Python |
| **memohai/Memoh** | 1.6k | 记忆管理工具 | 待确认 |
| **BAI-LAB/MemoryOS** | 1.4k | **EMNLP 2025 Oral**：记忆操作系统，分层人物记忆 | Python |
| **Bitterbot-AI/bitterbot-desktop** | 1.4k | 本地优先 AI Agent + 持久记忆 + 情商 | TypeScript |
| **Dataojitori/nocturne_memory** | 1.0k | **URI 图路由记忆**：轻量、可回滚、可视化 LTM MCP 服务器 | TypeScript |

### ⭐ 1k 以下（值得关注）

| 项目 | ⭐ | 简介 |
|---|---|---|
| **24kchengYe/MemoMind** | 691 | Claude Code 本地记忆系统——100% 私密、GPU 加速、零云依赖 |
| **oceanbase/powermem** | 653 | OceanBase 出品。向量+全文+图混合检索 + Ebbinghaus 遗忘曲线。LoCoMo 78.70% |
| **neo4j-labs/create-context-graph** | 539 | Neo4j 出的基于图推理记忆的 AI Agent 脚手架 |
| **cortexkit/magic-context** | 493 | 缓存感知无限上下文 + 跨会话记忆 + 后台历史压缩 |
| **AVIOS2/memorix** | 419 | **跨 Agent MCP 记忆层**：Cursor/Claude Code/Codex/GitHub Copilot 全兼容 |
| **TeleAI-UAGI/Awesome-Agent-Memory** | 391 | **电信/中国电信**出品。LLM/MLLM 记忆的 curated 论文基准系统列表 |
| **zjunlp/LightMem** | 814 | **ICLR 2026** 论文。轻量高效记忆增强生成。预压缩+主题分割+分层摘要 |
| **angelnicolasc/graymatter** | 349 | 三行代码给 AI Agent 持久记忆——声称减少 90% token 消耗 |
| **aayoawoyemi/Ori-Mnemos** | 285 | 本地优先持久 Agent 记忆——递归记忆利用 (RMH) |
| **Goldentrii/AgentRecall-MCP** | 251 | **Think-Execute-Reflect** 质量循环——给 Agent 跨会话大脑 |
| **LycheeMem/LycheeMem** | 237 | 轻量 LLM Agent 长期记忆 |
| **iamtouchskyer/memex** | 194 | **Zettelkasten（卡片盒）** 式持久记忆——Claude Code/Cursor/Copilot/Codex 全兼容 |
| **neo4j-labs/agent-memory** | 168 | Neo4j 出品的图原生记忆系统——对话 → 知识图谱 |
| **eiondb/eion** | 153 | **多 Agent 系统共享记忆存储** |
| **kevin-hs-sohn/hipocampus** | 148 | 即插记忆线束——3 层记忆 + 压缩树 + 混合搜索 |
| **JasonDocton/lucid-memory** | 146 | "跟人脑一样工作的记忆"——声称比 Pinecone 快 13 倍，比 RAG 省 5 倍 |

### 🏠 内部/未开源项目

| 项目 | 定位 | 技术栈 |
|---|---|---|
| **gastownhall/beads** | **23.0k** | **Dolt 驱动的分布式图问题追踪器**——Agent 记忆升级。Compaction（语义衰减）、Hash ID、依赖追踪、MCP 包 | Go (94%) | MIT |

---

## 三、项目分类矩阵

### 按技术路线分类

#### A 类：记忆 API/库（通用存储+检索）
`mem0` · `supermemory` · `cognee` · `Memori` · `hindsight` · `MemMachine` · `MemOS`  
`honcho` · `memobase` · `m_flow` · `agentic-context-engine` · `semantica` · `memoh`

#### B 类：编码 Agent 记忆插件/工具
`claude-mem` · `memsearch` · `memorix` · `memex` · `MemoMind` · `eion`

#### C 类：MCP 记忆服务器
`mcp-memory-service` · `nocturne_memory` · `OpenMemory` · `MemoryOS` (MCP mode)  
`AgentRecall-MCP` · `powermem` · `LightMem` · `lucid-memory`

#### D 类：Agent 平台（记忆内置）
`Letta` · `julep` · `everOS` · `memU` · `Bitterbot`

#### E 类：认知/生物启发架构
`hindsight` (3 类记忆) · `m_flow` (Graph RAG) · `OpenMemory` (5 sector)  
`HeLa-Mem` (Hebbian) · `HyperMem` (超图) · `MemoryOS` (OS 隐喻)

#### F 类：文件系统范式
`OpenViking` (`viking://`) · `nocturne_memory` (URI 图路由)

#### G 类：以知识图谱为基座
`trustgraph` · `neo4j-labs/agent-memory` · `neo4j-labs/create-context-graph`  
`VeritasGraph` · `Awesome-GraphMemory`

#### H 类：版本化/时态记忆
**`beads`** (Dolt 版控) · `Letta` (git-backed, 2026.2) · `dolt` (基础设施)

#### I 类：学术论文驱动
`HyperMem` (ACL 2026) · `LightMem` (ICLR 2026) · `MemoryOS` (EMNLP 2025)  
`StructMem` (ACL 2026) · `HeLa-Mem` (ACL 2026) · `APEX-MEM` (ACL 2026)

#### J 类：中国生态
`OpenViking` (火山引擎/字节) · `TeleAI Awesome-Agent-Memory` (中国电信)  
`powermem` (OceanBase) · `LycheeMem` · `Magic-context`  

---

## 四、Benchmark 数据汇总

### LoCoMo 基准

| 系统 | 得分 | Token 成本 | 备注 |
|---|---|---|---|
| EverCore (EverOS) | **93.05%** | — | 自进化记忆 |
| HyperMem (EverOS) | 92.73% | — | ACL 2026 论文 |
| Memori | 81.95% | ~1,294/query | 全上下文 5% 的 token |
| PowerMem (OceanBase) | 78.70% | ~900/query | 1.44s p95 |
| Full-Context (baseline) | 72.9% | ~26,000/query | p95 17.12s（不可用） |
| Mem0g (graph) | 68.4% | ~1,800 | — |
| Mem0 (selective) | 66.9% | ~1,800 | 0.71s 中位延迟 |
| OpenAI Memory | 52.9% | — | — |

### OpenViking LoCoMo10 提交任务

| 系统 | Task Completion | Token Cost |
|---|---|---|
| OpenClaw (baseline) | 35.65% | 24.6M |
| + LanceDB | 44.55% | 51.6M |
| **+ OpenViking** | **52.08%** | **4.3M** |

### LongMemEval

| 系统 | 得分 |
|---|---|
| Hindsight | **未公布具体值，标注 SOTA**（Virginia Tech 独立复现） |
| Supermemory | 81.6% |
| EverCore (EverOS) | 83.00% |

---

## 五、关键发现

1. **GitHub 上 Agent 记忆相关仓库总量超过 1,800 个**（去重后），涵盖 agent-memory(633)、ai-memory(892)、long-term-memory(304)、memory-management(2,868，含大量系统工具)
2. **头部集中度极高**：top 3 (claude-mem 71.4k, mem0 54.7k, OpenViking 23.4k) 占总 ⭐ 的 60%+
3. **9 个 10k+ ⭐ 项目**各有不同的哲学：claude-mem（插件化）、mem0（API 化）、OpenViking（文件系统化）、supermemory（混合搜索）、Letta（Agent 平台化）、cognee（企业级）、Memori（无侵入）、memU（主动 Agent）、hindsight（生物仿生）
4. **中国生态活跃**：OpenViking(23.4k)、TeleAI Awesome(391⭐)、powermem(653⭐) 等
5. **beads (23k ⭐) 是 Dolt 驱动的任务图记忆**——独占"版本化任务追踪"定位，compaction 机制是记忆衰减的工程实现。Letta 的 git-backed memory (2026.2) 方向接近但实现不同（文件级 vs Dolt cell-level）
6. **元认知层仍是空白**——所有项目解决的是"存什么"和"怎么查"，没有项目解决"Agent 自主判断该记什么/何时检索/何时遗忘"

---

## 六、值得关注的新项目

| 项目 | 亮点 |
|---|---|
| **nocturne_memory** (1.0k ⭐) | URI 图路由 + 自演化 CRUD + 条件触发 + 跨平台人格。设计感最强的新项目 |
| **memex** (194 ⭐) | Zettelkasten（卡片盒笔记法）用于 Agent 记忆。人文+工程的罕见结合 |
| **graymatter** (349 ⭐) | Go 语言，三行代码集成，声称 90% token 削减 |
| **lucid-memory** (146 ⭐) | "比 Pinecone 快 13 倍，比 RAG 省 5 倍" |
| **AgentRecall-MCP** (251 ⭐) | Think-Execute-Reflect 三重循环，最接近"元认知"概念的实现 |
| **MemoMind** (691 ⭐) | 本地 + 隐私 + GPU 加速，面向 Claude Code |

---

*补充说明：以上数据来自 GitHub topic 页面分页扫描（每页 20 项），三组关键词（agent-memory/ai-memory/long-term-memory）交叉获取。因 GitHub topic 分页限制，约 80% 的项目（主要分布在 500⭐ 以下）不在扫描范围内。已扫描的项目覆盖了几乎所有 ⭐ 1k+ 和大部分 ⭐ 500+ 的记忆项目。*
