# Agent 记忆系统设计方案

> 2026-05-04 · v4.1
> 多后端记忆整合 + 智能路由层
> Grok 评审后优化版

---

## 一、核心认知

### 问题

现有 Agent 记忆项目都是孤岛。用户需要装多个工具、配多个配置。结果是：**装了一堆，Agent 还是记不住。**

### 方案

不做新的记忆引擎。做一个**多后端路由层**——不同种类的记忆走最擅长的后端，用户只面对一个接口。

### 原则

1. **不重复造引擎** — 已经有成熟的开源项目，我们不做第 55 个
2. **先极简再扩展** — MVP 只上两个后端，验证了再加
3. **用户只记得一个命令** — `npx @agent-memory/init`

---

## 二、架构总览

```
                    ┌─────────────────────────────────────┐
                    │            Agent 会话                │
                    │  (Claude Code / Cursor / Codex ...)  │
                    └──────────────┬──────────────────────┘
                                   │
                    ┌──────────────▼──────────────────────┐
                    │        Hook 自动化层                 │
                    │                                     │
                    │  onSessionStart → recall()          │
                    │  onUserSay("记住") → remember()      │
                    │  onSessionEnd → summarize()         │
                    │  onError → 捕获上下文 (可选)          │
                    │                                     │
                    │  (Agent 不需要"想起来"，Hook 自动触发) │
                    └──────────────┬──────────────────────┘
                                   │
                    ┌──────────────▼──────────────────────┐
                    │        路由层 (Router)               │
                    │                                     │
                    │  规则驱动 + LLM fallback             │
                    │  80% case 关键词/模式匹配即走         │
                    │  模糊 case 才调 LLM 做分类            │
                    │                                     │
                    │  "记住 XX"             → 语义 → mem0 │
                    │  "昨天讨论了什么"       → 时间 → Markdown │
                    │  模糊/多义             → LLM 分类决定  │
                    └──────┬──────────┬───────────────────┘
                           │          │
              ┌────────────┘          └────────────┐
              ▼                                    ▼
     ┌──────────────┐                   ┌──────────────┐
     │  mem0        │                   │  Markdown    │
     │  语义记忆     │                   │  时间线日志   │
     │              │                   │              │
     │  事实/偏好   │                   │  每日摘要    │
     │  项目规则    │                   │  决策记录    │
     │  用户画像    │                   │  试错历史    │
     │  Apache 2.0 │                   │  纯文件      │
     └──────────────┘                   └──────────────┘

           可选插件 (--with-*)：
           supermemory (经验检索)  ·  nocturne (层级结构)  ·  beads (任务管理)
```

---

## 三、MVP 范围

### 默认安装（`npx @agent-memory/init`）

| 组件 | 角色 | 许可证 |
|---|---|---|
| **mem0** | 语义记忆引擎（事实/偏好/规则） | Apache 2.0 |
| **Markdown** | 时间线日志（决策/试错/摘要） | 纯文件 |
| **路由层** | 规则驱动 + LLM fallback | 自有代码 |
| **Hook 自动化** | 会话开始/结束自动触发 | 自有代码 |

### 可选插件

| Flag | 组件 | 角色 | 成熟度 |
|---|---|---|---|
| `--with-experience` | supermemory | 高速经验检索（50ms, LongMemEval 81.6%） | 22.4k⭐, MIT |
| `--with-structure` | nocturne_memory | URI 层级结构记忆 | 1.0k⭐, MIT |
| `--with-tasks` | beads | 版本化任务管理 | 23k⭐, MIT |

### 路由策略

默认 recall 只并行查 2 个后端（mem0 + Markdown）。安装了可选插件后，路由层自动加入对应的后端。

---

## 四、各后端能力

### 4.1 mem0 — 语义记忆（必选）

| 维度 | 说明 |
|---|---|
| **定位** | 所有"需要记住的事实" |
| **存储内容** | 用户偏好、项目规则、技术决策、编码约定 |
| **检索方式** | 语义向量检索 + BM25 关键词 + 实体匹配 |
| **为什么选它** | 54.7k⭐, 315 releases, 最成熟的记忆 API, Apache 2.0 |
| **部署** | `pip install mem0ai` + Chroma 本地向量库 |
| **适合** | "记住用 2 空格缩进" / "这个项目用 PostgreSQL" |
| **不适合** | 时间线查询、层级结构、超高速检索 |

### 4.2 Markdown — 时间线日志（必选）

| 维度 | 说明 |
|---|---|
| **定位** | "发生了什么，为什么" |
| **存储内容** | 会话摘要、关键决策、试错过程 |
| **检索方式** | 日期 + 文件名 + grep |
| **为什么选它** | 零依赖、人类可读、git 可版本化 |
| **适合** | "上周五讨论了什么" / "为什么选了方案 A" |
| **不适合** | 语义搜索、高速检索 |

### 4.3 supermemory — 高速经验检索（可选）

| 维度 | 说明 |
|---|---|
| **定位** | 已解决问题的快速复用 |
| **存储内容** | 过去问题的解法、最佳实践、代码模式 |
| **检索方式** | 混合搜索（向量 + 全文 + 重排序） |
| **为什么选它** | 22.4k⭐, LongMemEval 81.6%, 50ms 响应, MIT |
| **适合** | "这个 bug 之前怎么修的" / "那个 API 怎么用来着" |
| **不适合** | 用户偏好、任务管理 |

### 4.4 nocturne_memory — 层级结构记忆（可选）

| 维度 | 说明 |
|---|---|
| **定位** | 有层级关系的结构化记忆 |
| **存储内容** | 项目架构 → 模块 → 文件 → 函数 |
| **检索方式** | URI 图路由：`project://auth/service/session` |
| **为什么选它** | 1.0k⭐, MIT, 唯一做 URI 层级路径的项目 |
| **适合** | "auth 模块下有哪些文件" / "session 服务的依赖是什么" |
| **不适合** | 模糊语义搜索 |

### 4.5 beads — 任务管理（可选）

| 维度 | 说明 |
|---|---|
| **定位** | "要做什么，做到哪了" |
| **存储内容** | 任务、依赖、优先级、完成状态 |
| **检索方式** | CLI 命令 |
| **为什么选它** | 23k⭐, MIT, Dolt 版本化 |
| **适合** | "当前待办是什么" / "这个任务依赖什么" |
| **不适合** | 任何记忆/认知层面的存储 |

---

## 五、路由层设计

### 5.1 路由机制

**规则驱动（80% case）+ LLM fallback（20% 模糊 case）**

```python
def route(text: str) -> RoutePlan:
    # 第一步：规则匹配（关键词 + 模式）
    if re.search(r"记住|注意", text):
        return "mem0"          # 偏好/事实 → mem0
    if re.search(r"昨天|上次|之前|上周", text):
        return "markdown"      # 时间线 → Markdown
    if re.search(r"待办|任务|卡在", text):
        return "beads"         # 任务 → beads（如果安装了）
    if re.search(r"架构|目录|模块", text):
        return "nocturne"      # 结构 → nocturne（如果安装了）
    if re.search(r"解法|修复|解决", text):
        return "supermemory"   # 经验 → supermemory（如果安装了）

    # 第二步：LLM fallback（仅当规则不命中时）
    return llm_classify(text)
```

### 5.2 recall 策略

| 安装模式 | 并行查询后端 | 说明 |
|---|---|---|
| 默认 (mem0 + Markdown) | mem0 + Markdown | 语义 + 时间线 |
| + supermemory | mem0 + Markdown + supermemory | 加入经验检索 |
| + nocturne | mem0 + Markdown + nocturne | 加入层级检索 |
| + beads | mem0 + Markdown + beads (task) | 加入任务查询 |

### 5.3 融合排序

多后端返回结果后，按优先级 + 时间衰减排序：

| 来源 | 基础权重 | 衰减 |
|---|---|---|
| supermemory（高速命中） | 1.0 | 无 |
| mem0（语义命中） | 0.8 | 相关性 < 0.5 降权 |
| Markdown（时间线命中） | 0.6 | 超过 30 天 ×0.5 |
| nocturne（层级命中） | 0.7 | 路径不匹配降权 |

---

## 六、MCP 工具设计

```python
remember(
    content: str,              # 要记住的内容
    tags: list[str] = [],      # 分类标签
    importance: int = 5,       # 1-10
    auto_verify: bool = False, # 后台验真
    project_id: str = None     # 项目隔离
)
# 路由：规则 → 自动选择后端
# 重要度 > 8 永远走 verify

recall(
    query: str,                # 自然语言问题
    limit: int = 10,           # 返回条数
    project_id: str = None     # 项目隔离
)
# 路由：规则 + LLM fallback → 并行查询 → 融合排序

summarize(context: str)
# Hook 自动调用 → LLM 生成摘要 → 写入 Markdown + 提取事实存 mem0
# LLM 失败 → 原始文本直接追加到 Markdown

forget(pattern: str, backend: str = None)
# 根据模式匹配删除记忆
# backend=None 时在所有已安装后端中搜索删除

task(action: str, **kwargs)
# 仅在 --with-tasks 时注册 → 转发 beads CLI

memory_stats() -> dict
# 各后端的记忆统计

audit_log(days: int = 7) -> list[dict]
# 所有操作的审计日志
```

---

## 七、自动化层（Hook）

| 时机 | Hook 动作 | 路由 |
|---|---|---|
| **onSessionStart** | `recall("当前项目上下文")` | 并行查 mem0 + Markdown |
| **用户说"记住"** | `remember(内容)` | 规则路由到对应后端 |
| **onSessionEnd** | `summarize(会话)` | 摘要→Markdown, 事实→mem0 |
| **onError** | 捕获异常上下文 | 可选存到 supermemory |

**失败处理**：
- recall 失败 → 静默，不影响会话启动
- summarize LLM 失败 → 原始会话文本直接追加到 Markdown

---

## 八、安装与分发

```bash
npx @agent-memory/init                         # MVP: mem0 + Markdown + Router + Hooks
npx @agent-memory/init --with-experience       # + supermemory
npx @agent-memory/init --with-structure        # + nocturne
npx @agent-memory/init --with-tasks            # + beads
npx @agent-memory/remove                       # 干净卸载
```

### init 执行步骤

| 步骤 | 动作 | 失败处理 |
|---|---|---|
| 1 | pip install mem0ai | 提示手动安装 |
| 2 | pip install supermemory/nocturne/beads | 仅在对应 flag 时执行 |
| 3 | 创建 memory/ 目录 + .memory/ 目录 | 已存在跳过 |
| 4 | 配置 MCP 服务（写入 MCP 配置文件） | 写入失败报错 |
| 5 | 配置 Hook（写入 hooks.json） | 写入失败报错 |
| 6 | 写入 CLAUDE.md 引导指令 | 追加非覆盖 |

### CLAUDE.md 引导

```markdown
## 记忆系统

你拥有持久记忆能力。当用户说"记住""注意""以后要知道"等时，主动调用 remember() 工具。
会话结束时系统会自动 summarize，不需要你手动操作。
```

---

## 九、商用合规

| 组件 | 许可证 | 关系 | 风险 |
|---|---|---|---|
| **mem0** | Apache 2.0 | MCP 调用，不修改 | ✅ 安全 |
| **supermemory** | MIT | MCP 调用，不修改 | ✅ 安全 |
| **nocturne_memory** | MIT | MCP 调用，不修改 | ✅ 安全 |
| **beads** | MIT | CLI 调用，不修改 | ✅ 安全 |
| **我们的 MCP 服务** | 专有 | 全部自有代码 | ✅ 完全所有 |

**义务**：NOTICE 文件声明所有引用项目。

**安全底线**：
- 所有操作写 audit log（时间、来源、操作类型、内容摘要）
- user_id + project_id 强制隔离
- 不存储密码、密钥等敏感信息
- forget() 工具方便清理不需要的记忆

---

## 十、实现优先级

| 阶段 | 范围 | 后端数 | 价值 |
|---|---|---|---|
| **MVP** | mem0 + Markdown + Router + Hooks | 2 | "教一次就记住" + "上次做了什么" |
| **v2** | + supermemory (--with-experience) | 3 | 高速经验复用 |
| **v3** | + nocturne (--with-structure) | 4 | 层级结构记忆 |
| **v4** | + beads (--with-tasks) | 5 | 任务管理 |

---

## 十一、一句话

**先两个后端走通"教一次就记住"，再逐步加高级后端。路由层用规则兜住 80% case，LLM 只处理模糊的 20%。**
