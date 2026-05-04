# Claude Code 记忆组合深度分析

> 2026-05-04 · 基于 CLI 插件生态、MCP 协议兼容性、你的技术栈和产品定位的综合分析

---

## 一、Claude Code 记忆能力边界

Claude Code 目前接入外部记忆有**三条路径**：

| 路径 | 方式 | 典型工具 |
|---|---|---|
| **Plugin 系统** | `/plugin marketplace add` → hooks 拦截 | total-recall, claude-code-auto-memory |
| **MCP 协议** | `claude mcp add` → 本地 MCP 服务 | memsearch, mcp-memory-service |
| **CLAUDE.md 注入** | 文件读写 → 项目级规则 | 手动维护, auto-memory 插件 |

**关键限制**：
- Claude Code 没有官方的记忆 API（不像 OpenAI Assistants）
- 所有方案都是"注入式"——记忆文本在每次请求时塞入 system prompt
- 没有原生记忆持久化（必须依赖外部工具或文件系统）

---

## 二、Claude Code 可用记忆工具全景

### 2.1 专用插件（Plugin）

| 项目 | ⭐ | 核心机制 | 安装方式 |
|---|---|---|---|
| **total-recall** | 197 | 4 层记忆 (Counter/Pantry/Daily Notebook/Storage Closet) + Write Gate | `/plugin marketplace add davegoldblatt/recall-marketplace` |
| **claude-code-auto-memory** | 140 | 自动维护 CLAUDE.md——追踪文件变更，自动更新项目记忆 | `/plugin marketplace add severity1/severity1-marketplace` |
| **omem** | 192 | 持久记忆 + 团队空间共享 | 待确认 |
| **ClawMem** | 150 | 设备端记忆层 (Hooks + MCP + 混合 RAG) | 待确认 |
| **memory-lancedb-pro-skill** | 229 | LanceDB 生产级长期记忆 | Claude Code skill |

### 2.2 MCP 通用记忆服务

| 项目 | ⭐ | 核心机制 |
|---|---|---|
| **memsearch** | 1.6k | Markdown 是真源头，Milvus 影子索引。Claude Code 原生插件 |
| **mcp-memory-service** | 1.8k | 自托管 MCP 服务器，ONNX 本地嵌入，~5ms 检索 |
| **nocturne_memory** | 1.0k | URI 图路由，自演化 CRUD，条件触发，跨平台 |
| **OpenMemory** | 4.1k | 5 认知 sector，时序 KG，MCP 服务器 |

---

## 三、分层组合方案

基于你的四层架构（工作记忆/情景记忆/任务记忆/长期知识），推荐的分层组合：

### 方案 A：全插件栈（零外部依赖，纯本地）

```
CLAUDE.md (项目规则)           ← 已有
    +
claude-code-auto-memory        ← 自动维护 CLAUDE.md，追踪文件变更
    +
total-recall                   ← 4 层记忆：Counter → Pantry → Daily → Archive
    (CLAUDE.local.md + memory/ 目录)
    +
beads (bd) (23k ⭐)              ← Dolt 驱动的版本化任务图，已经成熟可用
```

**安装**：
```bash
# 1. auto-memory
claude plugin marketplace add severity1/severity1-marketplace
claude plugin install auto-memory@severity1-marketplace

# 2. total-recall
claude plugin marketplace add davegoldblatt/recall-marketplace
claude plugin install recall@recall-marketplace
```

**优点**：
- 🟢 纯 Markdown 文件，透明可控，不锁供应商
- 🟢 auto-memory 零 token 开销（Hook 不产生输出）
- 🟢 total-recall 的 Write Gate 防止记忆膨胀——只有"改变未来行为"的信息才被存档
- 🟢 beads (23k ⭐) 补齐版本化——Dolt 驱动的任务图，89 个 release，生产级
- 🟢 **与你的产品方向一致**：`npx @agent-memory/init` 可以一键预装这套组合

**缺点**：
- 🟡 Markdown 文件多了后检索效率下降
- 🟡 无向量检索，纯关键词匹配
- 🟡 beads 是 Go 写的——你的技术栈是 TS/Python，二次开发需跨语言

**token 成本**：~0（auto-memory 零 token，total-recall 仅注入 ~1500 tokens Counter）

---

### 方案 B：Markdown + 语义检索（混合）

```
CLAUDE.md (项目规则)
    +
memsearch (Milvus 语义索引)
    .memsearch/memory/YYYY-MM-DD.md  ← 每日自动摘要，Markdown 是真源头
    +
claude-code-auto-memory              ← 同时维护 CLAUDE.md
    +
beads (版本化任务图)
```

**安装**：
```bash
claude plugin marketplace add zilliztech/memsearch  # 或 /plugin marketplace add zilliztech/memsearch 如果支持
claude mcp add memsearch ...  # 备选
```

**优点**：
- 🟢 Markdown 是真源头——可读、可编辑、可版本控制
- 🟢 每日摘要自动写入 Markdown，不需要手动管理
- 🟢 Milvus 做语义索引，比纯关键词精准
- 🟢 跨 Agent 共享（Claude Code、Codex、OpenClaw 都能用同一记忆仓库）
- 🟢 自然语言触发：直接问"我们上次决定的 Redis TTL 是多少"

**缺点**：
- 🟡 需要 Milvus 部署（可以是嵌入式）
- 🟡 无 Write Gate，所有对话都被记录（记忆膨胀风险）
- 🟡 每日摘要可能遗漏重要上下文转折

**token 成本**：~1,600 tokens/对话（memsearch 的每日摘要）

---

### 方案 C：自托管 MCP + 知识图谱（隐私优先）

```
CLAUDE.md (项目规则)
    +
mcp-memory-service (知识图谱 + ONNX 本地嵌入)
    ↓
claude mcp add → REST API / MCP 协议
    +
claude-code-auto-memory
    +
beads (版本化任务图)
```

**安装**：
```bash
docker run -d -p 8080:8080 doobidoo/mcp-memory-service
claude mcp add memory-service --url http://localhost:8080
```

**优点**：
- 🟢 完全本地，ONNX 嵌入数据不离站
- 🟢 知识图谱的因果关系建模（`cause/fixes/contradicts`）比 flat 向量检索智能
- 🟢 ~5ms 检索，极快
- 🟢 MCP + REST 双通道，不挑 Agent
- 🟢 Remote MCP 支持 claude.ai 浏览器集成

**缺点**：
- 🟡 需要 Docker + 自托管服务
- 🟡 没有 Claude Code 专用插件，需要通过 MCP 通用通道
- 🟡 知识图谱维护成本高于纯 Markdown

**token 成本**：~0（MCP 服务注入而非 prompt 注入）

---

### 方案 D：极致轻量（一步到位）

```
total-recall (Counter ~1500 tokens) 
    + 
claude-code-auto-memory (零 token)
```

就两个插件，5 分钟装完。适合不想折腾、只想 "Claude 下次记得我是谁" 的场景。

---

## 四、方案对比

| 维度 | A: 全插件 | B: Markdown+向量 | C: 自托管 MCP | D: 极致轻量 |
|---|---|---|---|---|
| **安装复杂度** | 🟢 5 min | 🟡 15 min | 🔴 30 min+ | 🟢 5 min |
| **检索精度** | 🟡 关键词 | 🟢 语义 | 🟢 图谱+语义 | 🟡 关键词 |
| **隐私** | 🟢 全本地 | 🟢 全本地 | 🟢 ONNX 本地 | 🟢 全本地 |
| **记忆膨胀风险** | 🟢 Write Gate | 🟡 全记录 | 🟡 需配置 | 🟢 Write Gate |
| **透明性** | 🟢 Markdown | 🟢 Markdown | 🟡 数据库 | 🟢 Markdown |
| **跨 Agent 共享** | 🔴 否 | 🟢 是 | 🟢 是 | 🔴 否 |
| **版本化** | 🟢 beads (23k ⭐) | 🟢 beads (23k ⭐) | 🟢 beads (23k ⭐) | 🔴 无 |
| **与产品方向对齐** | 🟢 高度对齐 | 🟢 高度对齐 | 🟡 一般 | 🟡 一般 |
| **每日 token 成本** | ~1,500 | ~1,600 | ~0 | ~1,500 |

---

## 五、我的推荐：方案 A + 过渡路径

### 为什么是方案 A

结合你的 CLAUDE.md 看：

> **AI 是自己的第一个用户** — 用自身验证产品效果
> **不堆窗口，建索引** — 分层记忆是工程基线

方案 A 最对齐：

1. **auto-memory** 自动维护 CLAUDE.md — 这正好是你 MVP (`npx @agent-memory/init`) 要自动化的第一个操作
2. **total-recall** 的 Write Gate 机制——只有"真正重要的信息"才被存档——这就是**元认知层**（Agent 自主判断该记什么）的雏形
3. **beads (23k ⭐)** 补齐版本化——Dolt 驱动的任务图，89 release，而且 Compaction 机制（语义衰减）正好是记忆固结的工程实现
4. 全是 Markdown 文件——透明、可控、Git 可版本化

### 过渡路径

| 阶段 | 做什么 | 为什么 |
|---|---|---|
| **现在** | auto-memory + total-recall | 立即提升 Claude Code 跨会话一致性，感受"有记忆"和"没记忆"的差异 |
| **今天** | `brew install beads` 或 `npm install -g @beads/bd` | beads 不是你的产品，是已经成熟的 23k ⭐ 开源项目——直接装来用 |
| **本周** | `bd create` / `bd dep add` / `bd close` 跑一遍 | 亲手感受 beads 的 Dolt 版控、依赖追踪、compaction 机制，理解它的设计哲学 |
| **MVP 发布** | `npx @agent-memory/init` 一键预装 **beads + auto-memory + total-recall** | 用户不需要自己组合三个工具——你帮他们组好 |
| **V2** | 在 beads 的 Dolt 基座上建**元认知层** | beads 提供了存储基座（版本化、cell-level merge、compaction），你在上面建"Agent 自主判断记什么" |

### bead 是什么定位

beads 不是你的竞争对手，它是你的**基础设施**：

```
你的产品（元认知层）
    ↓ 使用
beads (23k ⭐ — Dolt 驱动的任务图)
    ↓ 使用
Dolt (22.5k ⭐ — 版本化数据库)
```

- beads 管"任务追踪 + 版本化 + compaction"
- Dolt 管"cell-level merge + 时态查询 + 分支语义"
- **你的产品管"Agent 自主判断该记什么、何时检索、何时遗忘"**

三层各自解决不同问题，不冲突。

### 一句话

> **先装 auto-memory + total-recall + beads，25 分钟让 Claude Code 拥有三层完整记忆；元认知层等你来建。**
