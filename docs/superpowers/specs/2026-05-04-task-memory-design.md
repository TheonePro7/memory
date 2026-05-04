# v0.3 任务记忆 — 设计文档

> 独立的任务记忆系统，自动记录 Agent 开发过程。用户已有 beads 数据同步接入，Agent 自动感知任务上下文。

## 动机

当前 Agent 只有"情景记忆"（存事实）。但开发工作需要追踪任务进度、决策历史、阻塞点。v0.3 增加"任务记忆"层。

**为什么不做 beads 迁移而是同步？**
- devflow 等技能深度绑定 beads，不能替代
- beads 存在但 Agent 不会自动使用它——用户不提示 `bd ready`，Agent 就不会查
- 我们的角色是**查缺补漏**：beads 有数据，我们来桥接、丰富、让 Agent 自动感知

## 产品哲学：查缺补漏的三步走

```
Step 1：检测 beads      → 项目有 .beads/，自动识别
Step 2：同步到 SQLite    → 增量读取 beads 任务状态
Step 3：Agent 自动感知   → 会话开始自动 recall 当前任务
                          Agent 不再需要用户提示就知道"正在做什么"
```

同步方向：**只读 beads，不写 beads**。beads 仍然是 devflow 的工作流源头，我们只读取 `.beads/issues.jsonl` 来做同步。

## 架构

```
~/.agent-memory/
├── chroma/              # 情景记忆（已有）
├── tasks.db             # 任务记忆（新增）
├── context.json         # 会话上下文缓存（已有）
└── current_session.txt  # 当前会话文本（已有）
```

### 存储方案

SQLite，三张表：

**tasks** — 任务主体

| 字段 | 类型 | 说明 |
|---|---|---|
| id | TEXT UUID | 主键 |
| source | TEXT | beads / agent-memory |
| source_id | TEXT | beads 中的原始 ID |
| title | TEXT | 任务标题 |
| status | TEXT | todo / in_progress / done / blocked |
| priority | TEXT | low / medium / high |
| project_id | TEXT | 项目隔离 |
| tags | TEXT | 逗号分隔 |
| created_at | TEXT ISO8601 | 创建时间 |
| updated_at | TEXT ISO8601 | 最后更新时间 |

**task_events** — 任务事件流

| 字段 | 类型 | 说明 |
|---|---|---|
| id | INTEGER | 主键自增 |
| task_id | TEXT | 关联任务 |
| type | TEXT | status_change / decision / blocker / note |
| content | TEXT | 事件描述 |
| created_at | TEXT ISO8601 | 发生时间 |

**task_artifacts** — 产出物（commit、PR、文件）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | INTEGER | 主键自增 |
| task_id | TEXT | 关联任务 |
| kind | TEXT | commit / pr / file |
| reference | TEXT | commit hash / PR URL / 文件路径 |
| created_at | TEXT ISO8601 | 时间 |

### beads 同步（替代"迁移"）

**初次同步：** session start 时检测 `.beads/issues.jsonl`，有则导入到 SQLite。

**增量同步：** 每次 session start 时检查 `.beads/issues.jsonl` 的 mtime 是否有变化，有则增量读取新数据。

**同步逻辑：**
1. 读取 `.beads/issues.jsonl` 所有 issues
2. 对每条 issue，检查 SQLite 中是否已有 `source=beads AND source_id=<id>`
3. 没有则插入（创建任务 + 初始事件 `status_change → 初始状态`）
4. 有则对比 status 是否变化，变化了追加事件 `status_change → 新状态`
5. beads 关闭的任务（`done` 或 `cancelled`）也正常同步，SQLite 保留完整事件链

**存储位置：** 同步后 `.beads/` 原样保留不动。devflow 的 `bd` 命令照常工作。

### 自动记录（丰富层）

beads 只记录了任务标题和状态。我们在这个基础上追加：

**触发时机 1：会话 summarize**
summarize 时提取"做了什么→决策→阻塞"信息，关联到同步过来的 beads 任务。

```
Session 内容：讨论了登录页 bug，决定改用 JWT 方式
→ 查找 beads 中是否有"修复登录页"任务
→ 有 → 追加事件：decision: "改用 JWT"
→ 没有 → 自主创建任务 + 记录事件
```

**触发时机 2：git commit hook**
检测当前是否有活跃任务，有则自动关联 commit。

```
git commit -m "feat: add JWT authentication"
→ 自动关联到当前活跃任务
→ 记录产出物：commit abc1234
```

**触发时机 3：用户主动记录**
CLI 命令手动记录。

```bash
agent-memory task start "修复登录页"
agent-memory task block "依赖 API 还没好"
agent-memory task done
```

### Agent 自动任务感知

**session start hook 增强：** `recall` 现在不只返回情景记忆，还返回当前活跃任务。

```
onSessionStart:
  1. recall 情景记忆（已有）
  2. 检测 .beads/ 并同步（增量）
  3. 查 SQLite：当前项目是否有 in_progress 任务
  4. 有 → 注入到 context.json
  5. 无 → 跳过

context.json 新增字段：
{
  "active_tasks": [
    {"title": "修复登录页", "status": "in_progress",
     "events": ["改用 JWT"], "artifacts": ["commit abc1234"]}
  ]
}
```

**MCP 工具新增：**

```python
@mcp.tool()
def task_context(project_id: str | None = None) -> dict:
    """返回当前项目的任务概览（活跃任务 + 最近完成）。"""
```

Agent 拿到这个工具后，用户不需要说"查一下 beads"，Agent 在相关语境下自动调用。

### 升级路径：从 beads 到完全使用我们的系统

```
阶段 1：检测 + 同步
  beads 照常运作，我们同步数据
  用户无感知，Agent 开始自动知道任务

阶段 2：我们的记忆更丰富后
  beads 只有标题+状态
  我们有：任务事件流 + 决策记录 + 产出物关联
  用户发现我们的系统更好用

阶段 3：引导切换
  recall 结果中提示：
  "任务关联 beads 记录。你的 beads 数据已同步到任务记忆，
   试试 agent-memory task list 查看完整事件流。"
```

### Dashboard

新增"任务"页面，三个视图切换：
- **看板** — 按 status 列展示（todo / in_progress / done / blocked），标记来源（beads / agent-memory）
- **时间线** — 按事件流展示，决策链可见
- **关联** — 点击任务显示关联的事件和产出物

搜索时同时查 ChromaDB 和 SQLite，混合排序返回。

### CLI 变更

```bash
# hooks 自动触发（用户无感知）

# 手动命令
agent-memory task list                    # 当前项目所有任务 (= bd ready)
agent-memory task list --status blocked   # 只看阻塞的
agent-memory task show <id>               # 任务详情 + 事件流（含 beads 同步来源）
agent-memory task start "标题"             # 开始新任务
agent-memory task done                    # 完成当前任务
agent-memory task block "原因"             # 标记阻塞
```

### 搜索集成

`recall` 默认返回情景记忆 + 活跃任务。`recall --with-tasks` 返回所有关联任务。

```
recall "登录页问题"
→ 情景记忆: "修复了登录页 bug"
→ 活跃任务: "修复登录页" [in_progress]
   - 决策: 改用 JWT
   - 产出: commit abc1234
```

## 降级策略

- 无 SQLite 依赖（Python 内置 sqlite3）
- beads 文件不存在或格式异常 → 跳过同步，不报错
- 同步失败（文件锁、格式错误）→ 记录日志，下次再试

## 不做的事情

- ❌ 写 beads 文件（只读不写，devflow 的工作流不变）
- ❌ 实时协作（多人编辑任务）
- ❌ 任务依赖图（依赖另一个任务完成才能开始）
- ❌ PR 自动关联 GitHub（只记录 commit hash，不调 GitHub API）
