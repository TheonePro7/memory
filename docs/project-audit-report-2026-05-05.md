# Agent Memory 项目全面审计报告

> 生成日期：2026-05-05
> 用途：基于此报告使用 devflow 重新规划项目

---

## 一、项目现状总览

### 1.1 结构概览

```
F:\AI\memory/
├── packages/
│   ├── mcp-server/          Python MCP 服务 + CLI（核心）
│   │   ├── src/agent_memory_mcp/
│   │   │   ├── server.py        MCP 协议层（7 个工具）
│   │   │   ├── core.py          业务逻辑层（4 个函数）
│   │   │   ├── cli.py           Hook CLI 命令（5 个命令）
│   │   │   ├── processor.py     LLM 加工（提取 + 重排序）
│   │   │   ├── summarize.py     LLM 摘要生成
│   │   │   ├── audit.py         审计日志
│   │   │   └── backends/
│   │   │       ├── mem0_backend.py   ChromaDB 向量后端
│   │   │       ├── md_backend.py     Markdown 文件后端
│   │   │       └── task_backend.py   SQLite 任务后端
│   │   └── tests/            86 个测试 / 9 个文件
│   ├── dashboard/            Web 管理面板
│   │   ├── backend/src/      FastAPI 后端（4 个路由）
│   │   └── frontend/src/     React + Ant Design 前端（5 个页面）
│   ├── cli/                  TypeScript 安装 CLI
│   └── configs/              各平台 IDE 配置模板
├── docs/                     项目文档
├── scripts/                  安装/设置脚本
└── reports/                  研究报告
```

### 1.2 版本状态

| 版本 | 内容 | 状态 |
|------|------|------|
| v0.1 | 基础记忆 — ChromaDB + CLI + Dashboard + MCP | ✅ |
| v0.2 | LLM 加工 — 实体提取 + 搜索重排序 | ✅ |
| v0.3 | 任务记忆 — SQLite + beads 同步 + 看板 | ✅ |
| v0.4 | TypeScript CLI — npx @ivanston/init 一键安装 | ✅ |
| v0.5 | 架构重构 — core.py + 错误处理 + 86 测试 | ✅ |
| — | npm 发布 @ivanston/init | ⬜ |
| — | PyPI 发布 ivanston-memory-mcp | ⬜ |

### 1.3 对外配置

4 个项目已接入记忆系统：memory（自身）、devflow、WekSkill、note
各项目均已配置 MCP server + hooks（recall/summarize）+ CLAUDE.md 指令

---

## 二、Bug 清单

### 🔴 严重

| ID | 问题 | 文件 | 说明 |
|----|------|------|------|
| B01 | `delete()` 忽略 `user_id` 参数 | mem0_backend.py:174 | 知道 ID 就能删别人记忆，安全漏洞 |
| B02 | 测试断言的文件名与实际写入的文件名不一致 | test_cli.py → cli.py:28 | `context.json` vs `context.{pid}.json`，测试实际不通过 |
| B03 | 审计日志旋转文件永不清理 | audit.py:_cleanup_old | 旋转后的文件名带时间戳后缀，解析失败导致清理跳过 |

### 🟡 中等

| ID | 问题 | 文件 | 说明 |
|----|------|------|------|
| B04 | `remember()` 接受 `importance` 和 `auto_verify` 但忽略 | server.py:32-37 | 参数摆了不用，误导调用方 |
| B05 | summarize 截断对话到 8000 字符 | summarize.py:48 | 长 session 后半部分永远看不到 |
| B06 | `sync_beads()` 先插入再更新，产生垃圾事件 | task_backend.py:284-292 | "beads init: todo → done" 等假事件 |
| B07 | `processor.py` 让 LLM 输出 `is_useful` 但从不消费 | processor.py:30 | 浪费 LLM token |
| B08 | CLI 和 server 重复定义 `_append_session_log` | cli.py + server.py | 代码重复 |
| B09 | `_call_openai()` 忽略 `PROCESSOR_MODEL` / `SUMMARY_MODEL` | processor.py:108 | 用户设了环境变量也不生效 |
| B10 | `config.yaml` 从未实现但文档多处提及 | — | 文档和实现不一致 |

### 🟢 轻微

| ID | 问题 | 文件 | 说明 |
|----|------|------|------|
| B11 | `recall()` 重排序硬编码 `min(limit, 5)` | core.py:79 | 超出 5 条不重排 |
| B12 | `cmd_recall()` 硬编码查询"当前项目上下文" | cli.py:18 | 无法自定义 |
| B13 | 模块名 `mem0_backend.py` 误导——实际用 ChromaDB | — | 历史遗留命名 |
| B14 | `_init_db()` 每次 CRUD 都调 | task_backend.py | `CREATE TABLE IF NOT EXISTS` 每次执行 |
| B15 | 记忆内容去重缺失 | mem0_backend.py:add() | 相同内容重复存储 |
| B16 | 记忆更新机制缺失 | 整个后端 | 只能 add，不能 update |
| B17 | 记忆新鲜度评分缺失 | 整个后端 | 旧的新的权重一样 |

---

## 三、功能缺失

### 3.1 存储层缺失

| 功能 | 说明 | 重要度 |
|------|------|--------|
| **内容去重** | 存之前检测语义相似度，重复则跳过或覆盖 | P0 |
| **更新机制** | 同话题覆盖旧记录，而不是不断追加 | P0 |
| **新鲜度评分** | 搜索时新记忆权重更高 | P1 |
| **冲突检测** | 两条矛盾记忆同时存在时标记出来 | P2 |
| **版本溯源** | 知道哪条是过时的 | P2 |
| **config.yaml 解析** | 文档说有但代码里没有 | P2 |

### 3.2 搜索/召回层缺失

| 功能 | 说明 | 重要度 |
|------|------|--------|
| **时间过滤** | 按时间范围搜索 | P1 |
| **标签过滤** | `list_all` 不支持 tags 参数 | P1 |
| **分页** | `list_all` 和 `search` 都没有分页 | P1 |
| **多后端融合排序** | mem0 + md 结果合并排序 | P2 |
| **模糊匹配** | 拼写容错 | P3 |

### 3.3 CLI 缺失

| 功能 | 说明 | 重要度 |
|------|------|--------|
| `agent-memory forget` | MCP 有但 CLI 没有 | P1 |
| `agent-memory stats` | 无统计命令 | P2 |
| `agent-memory audit` | 无审计命令 | P2 |
| 子命令 `--help` | 每个子命令缺帮助信息 | P2 |

### 3.4 自动化缺失

| 功能 | 说明 | 重要度 |
|------|------|--------|
| **自动记忆** | Agent 主动识别重要信息并存储（CLAUDE.md 刚加上） | P0 |
| **summarize 工作** | `current_session.txt` 刚修好，需验证 | P0 |
| **会话上下文采集** | MCP server 无工具采集完整对话 | P1 |

---

## 四、文档和实际不一致

| 文档声称 | 实际情况 | 严重度 |
|----------|----------|--------|
| 支持 `config.yaml` 配置 | 没有 YAML 解析代码 | 🟡 |
| 架构图显示 `routers/` 目录 | 该目录已在 v0.5 移除 | 🟢 |
| `importance` 和 `auto_verify` 参数 | 接收但忽略 | 🟡 |
| Dashboard 记忆浏览可用 | v0.5 后 import 路径断裂 + `list_all` 缺失——刚修复 | 🔴 |

---

## 五、测试覆盖分析

### 5.1 统计数据

| 指标 | 值 |
|------|-----|
| 测试文件数 | 9 |
| 声称测试数 | 86 ✅（验证通过）|
| 生产代码行数 | ~1000 |
| 测试代码行数 | ~845 |
| 核心模块覆盖率 | 全部覆盖（每模块至少 1 个测试）|

### 5.2 零覆盖率的函数

| 函数 | 所属模块 | 行数 |
|------|----------|------|
| `_call_anthropic()` | processor.py | ~25 |
| `_call_openai()` | processor.py | ~23 |
| `_with_claude()` | summarize.py | ~28 |
| `_with_openai()` | summarize.py | ~27 |
| `_parse_llm_response()` | summarize.py | ~20 |
| `cmd_remember()` | cli.py | ~28 |
| `cmd_summarize()` | cli.py | ~28 |
| `_rotate_if_needed()` | audit.py | ~5 |
| `_cleanup_old()` | audit.py | ~10 |
| `list_all()` | mem0_backend.py | ~32 |
| **_append_session_log()** | cli.py + server.py | ~8 |
| **总计** | **约 230 行（20-25%）** | |

### 5.3 测试质量评估

| 模块 | 质量 | 说明 |
|------|------|------|
| test_core.py | ✅ 好 | 有意义的单元测试，mock 断言精准 |
| test_task_backend.py | ✅ 好 | 集成风格，增量同步和幂等性验证扎实 |
| test_processor.py | ✅ 好 | JSON 解析覆盖全，分支覆盖完整 |
| test_server.py | ⚠️ 一般 | mock 太厚，基本是烟雾测试 |
| test_mem0_backend.py | ⚠️ 一般 | 集成测试扎实但 `list_all` 零覆盖 |
| test_cli.py | ❌ 弱 | 多个函数只验证"不崩" |
| test_summarize.py | ❌ 弱 | 只测了 fallback，LLM 路径全空 |
| test_audit.py | ❌ 弱 | 烟雾测试，旋转/清理逻辑零覆盖 |
| test_md_backend.py | ⚠️ 一般 | 每个函数一个用例，非常薄 |

### 5.4 交叉缺口

| 缺口 | 说明 |
|------|------|
| 错误路径 | 几乎所有 `except` 块都未测试 |
| 并发访问 | 零覆盖 |
| 跨项目隔离 | 没有验证 project_id 过滤 |
| 跨后端集成 | 所有集成测试都用 mock |
| 测试隔离 | 无 conftest.py，无 cleanup fixture |
| 真实 MCP 启动 | `mcp.run()` 从未测试 |

---

## 六、产品级问题

### 6.1 记忆就是"只写不查"

当前架构本质问题：

```
用户说"记住 XXX"  →  ChromaDB.add()           ✅ 能存
用户说"记住 XXX"  →  同样的内容再存一遍         ❌ 不去重
查记忆            →  10 条里 3 条重复            ❌ 有噪音
查记忆            →  旧观点和更新观点共存         ❌ 不溯源
信息更新          →  只能追加，不能覆盖          ❌ 不更新
```

### 6.2 用户感知

- **记忆浏览** — 刚修好显示问题，但旧的 11 条没时间戳
- **自动记忆** — CLAUDE.md 刚加上，等待验证效果
- **summarize** — 刚修好 session 日志写入，等待验证
- **跨项目** — 4 个项目配置完成，但还没产生真正有用的记忆
- **Dashboard** — 整体可用但粗糙（内容显示、时间、分页）

### 6.3 生产化缺失

| 要求 | 状态 |
|------|------|
| npm publish @ivanston/init | ⬜ |
| PyPI publish ivanston-memory-mcp | ⬜ |
| 错误监控/报警 | ❌ |
| 数据备份/恢复 | ❌ |
| 性能基准测试 | ❌ |
| Windows 兼容性验证 | ⚠️ 部分验证 |
| 跨版本升级迁移 | ❌ |
| 安装向导/文档 | ⚠️ 有基本文档 |

---

## 七、建议优先级

### P0 — 马上要做

1. **记忆去重** — `remember()` 时语义相似度检测，重复不存
2. **记忆更新** — 同话题覆盖旧记录
3. **验证自动记忆** — 重开其他项目 session 确认自动记忆生效
4. **验证 summarize** — 确认 session 结束后有摘要记忆产生

### P1 — 下一批

5. **新鲜度评分** — 搜索时新记忆加权
6. **修复 🔴 严重 Bug** — B01 user_id 无视、B02 测试断言、B03 日志不清理
7. **补测试** — 零覆盖率函数优先
8. **标签/时间过滤** — search 和 list_all 支持过滤器

### P2 — 产品完善

9. **CLI 补齐** — forget、stats、audit 命令
10. **config.yaml** — 实现或从文档移除
11. **冲突检测** — 矛盾记忆标记
12. **Dashboard 优化** — 分页、过滤、详情展示
13. **npm + PyPI 发布**

---

## 八、代码统计

| 指标 | 值 |
|------|-----|
| Python 源文件 | 11（核心层） |
| Python 测试文件 | 9 |
| TypeScript 源文件 | 4（CLI） |
| React 页面 | 5（Dashboard） |
| FastAPI 路由 | 4 |
| MCP 工具 | 7 |
| SQLite 表 | 3 |
| 测试总数 | 86 |
| 生产代码(~) | 1000 行 |
| 测试代码(~) | 845 行 |
