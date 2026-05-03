# Claude Code 记忆组合：头部项目横评

> 2026-05-04 · 你的 Claude Code 该用哪些记忆方案——不考虑"偏好"，只看事实数据

---

## 一、Claude Code 可用的头部记忆项目

能在 Claude Code 上直接用的、且 ⭐ 超过 1 万的记忆项目：

| 项目 | ⭐ | Claude Code 接入方式 | 作用 |
|---|---|---|---|
| **claude-mem** | **71.4k** | Plugin (Hook) + MCP | 自动捕获压缩→下次会话注入 |
| **mem0** | **54.7k** | MCP (OpenMemory MCP) | 用户画像 + 跨会话事实检索 |
| **OpenViking** | **23.4k** | MCP | 三级上下文文件系统 |
| **supermemory** | **22.4k** | MCP 插件 | 混合搜索 + 个性化 |
| **Memori** | **14.1k** | MCP | 无侵入后台记忆提取 |
| **memU** | **13.5k** | MCP | 持续 Agent 记忆 |
| **hindsight** | **11.9k** | MCP | 仿生 3 类记忆 + LongMemEval SOTA |

这些都是 1 万 ⭐ 以上的项目，都有 Claude Code 集成能力。

---

## 二、为什么 claude-mem (71.4k ⭐) 是 #1

claude-mem 的数据：

| 指标 | 值 |
|---|---|
| ⭐ Stars | **71.4k** |
| Release | **254 个**（最新 v12.5.0, 2026-05-02） |
| Commits | **1,826** |
| 专门为谁做的 | **Claude Code**（也支持 Gemini CLI / OpenCode） |
| 接入方式 | **Plugin Hook + MCP** 双通道 |
| 记忆单元 | SQLite (存储) + Chroma (语义索引) + MCP (搜索 API) |
| token 节省 | **~10 倍**（hook 过滤 + 渐进披露） |
| 隐私 | `<private>` 标签 + 本地 SQLite |
| 寿命 | Endless Mode (beta)——仿生记忆架构用于延长会话 |

它解决的问题：Claude Code 每次会话从头开始，claude-mem 用 5 个 Hook 自动捕获 → AI 压缩 → 下次注入。开发者不需要做任何事，装了就有效果。

---

## 三、正确的分层组合（头部版）

### 正确方案：claude-mem + mem0 + beads

```
claude-mem (71.4k ⭐)
    ↓ Plugin Hook 自动捕获 + AI 压缩
会话级工作记忆
    ↓
mem0 (54.7k ⭐)
    ↓ MCP 调用记忆 API
跨会话用户画像 + 事实检索
    ↓
beads (23k ⭐)
    ↓ CLI + MCP 包
版本化任务追踪 + Compaction
```

每层职责：

| 层 | 工具 | 管什么 |
|---|---|---|
| **会话捕获** | claude-mem | 自动记住每次 Claude Code 会话做了什么，压缩后下次注入 |
| **用户画像** | mem0 | 记住你的编码偏好（缩进风格、命名约定、常用库），跨项目 |
| **任务追踪** | beads | 版本化的任务图——依赖追踪、历史回溯、Compaction 释放上下文 |

---

## 四、为什么之前没推荐 claude-mem

我说实话：犯了三个错误。

**错误 1：被"轻量"偏好误导**

我之前推荐 total-recall (197⭐) 和 auto-memory (140⭐) 是因为它们的"设计哲学"更清晰（Write Gate / 自动 CLAUDE.md）。但 claude-mem 有 71.4k ⭐、254 个 release——它的设计哲学是**"装了就忘掉"**，不需要用户理解 Gate 机制，这也是合理的设计。

**错误 2：低估了 usability 的价值**

claude-mem 的核心洞察是"用户不想管记忆"。Hook 自动捕获 → AI 压缩 → 注入，全程零操作。total-recall 需要用户手动 `/recall-write`、`/recall-promote`——设计再优雅，用户不操作就是白搭。

**错误 3：忽略了 Mem0 的 Claude Code 集成**

Mem0 在 2026 年 2 月已经发布了 Claude Code 的 5 分钟集成指南（OpenMemory MCP）。54.7k ⭐、315 个 release、21+ 框架集成——这才是成熟的记忆 API，不是小项目。

---

## 五、修正后的最终推荐

### 如果你想"装了就忘掉"（推荐）

```bash
# Step 1: claude-mem — 自动捕获一切
/plugin marketplace add thedotmack/officially-sponsored
/plugin install claude-mem@officially-sponsored
# 或者 standalone:
git clone https://github.com/thedotmack/claude-mem.git
cd claude-mem && ./install.sh

# Step 2: mem0 — 跨会话用户记忆（5 分钟 MCP 设置）
# 参照 mem0.ai 的 Claude Code 集成指南

# Step 3: beads — 版本化任务追踪
brew install beads
bd init
```

效果：
- 每次编码会话自动记录 → 下次自动注入上下文（claude-mem）
- 编码风格和项目偏好跨会话记忆（mem0）
- 任务图版本化，`bd show` 任意历史状态（beads）

### 如果你只想选一个

**claude-mem (71.4k ⭐)**——它是最多人在 Claude Code 上实际用着的记忆方案。装了之后 Claude Code 从"每次失忆"变成"记住你是谁"。

### 组合对比（修正版）

| 维度 | ⭐ | claude-mem + mem0 + beads | auto-memory + total-recall + beads |
|---|---|---|---|
| 总 ⭐ | | **148k** | **23.3k** |
| 社区验证 | | 🟢 三个项目合计 148k ⭐，生产验证 | 🟡 total-recall 197⭐，社区很小 |
| 自动化程度 | | 🟢 Hook 全自动捕获，零操作 | 🟡 需要手动 `/recall-write` |
| 语义检索 | | 🟢 Chroma 向量索引 | 🟡 纯关键词 |
| token 节省 | | 🟢 ~10 倍（渐进披露） | 🟡 ~1500 tokens Counter |
| 版本化 | | 🟢 beads (Dolt) | 🟢 beads (Dolt) |
| 元认知 | | 🔴 无（留给你的产品） | 🟡 Write Gate 雏形 |
