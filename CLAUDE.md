# Agent Memory — Project Rules

## 项目定位

做一家 Agent 记忆公司。核心产品：让 Agent 安装后自动拥有记忆能力（元认知层）。

MVP：`npx @agent-memory/init` — 一键激活 Agent 记忆的 CLI 工具。

## 知识库

所有研究笔记在 Obsidian vault：`F:\AI\note\💡 个人思考\Agent 记忆项目\`
- 01_信号采集/ — 关键信号索引
- 02_技术研究/ — beads 深度拆解、集成模板
- 03_实战输出/ — 四层记忆架构、组合实战
- 04_产品规划/ — MVP 设计、竞品扫描、策略日志

## 核心原则

0. **全程使用中文交流** — 所有输出、注释、消息全部用中文，禁止用英文回复
1. 先想清楚，再写代码 — 产品定义锁死前不写代码
2. 产品即过程 — 手动流程的自动化 = 产品
3. AI 是自己的第一个用户 — 用自身验证产品效果
4. 不堆窗口，建索引 — 分层记忆是工程基线
5. 做产品公司，不做顾问公司

## 技术栈

- 基础设施：beads (bd) — 版本化任务记忆
- 代码理解：GitNexus — 代码知识图谱
- 目标平台：VS Code (Claude Code)、Cursor
- 集成方式：MCP + CLAUDE.md 注入
- 语言：TypeScript (CLI)、Python (研究/原型)

## 开发工作流

使用全局 skill **devflow** 编排 8 阶段开发流程（Phase -1 到 6）。说"优化"或"分析"会自动触发 Phase -1 项目体检。说"开发""实现""做个功能"等会自动触发全流程。
详细流程见 `.claude/workflow.md`（如有）或参考 skill 定义。

## 当前状态

- [x] 市场调研、竞品扫描、技术研究
- [x] 产品定位与 MVP 设计
- [x] CLI 工具 — remember / recall / summarize 命令可用
- [x] Hook 自动 recall（会话开始）和 summarize（会话结束）
- [x] ChromaDB+fastembed 后端，支持中文搜索，Dashboard 可访问
- [x] 任务记忆系统 — SQLite 后端，beads 同步，Dashboard 任务面板
- [x] TypeScript CLI — `npx @agent-memory/init` 一键安装（5 步流程，优雅降级，8 个测试）
- [ ] npm 发布 @agent-memory/init
- [ ] PyPI 发布 agent-memory-mcp


<!-- BEGIN BEADS INTEGRATION v:1 profile:minimal hash:ca08a54f -->
## Beads Issue Tracker

This project uses **bd (beads)** for issue tracking. Run `bd prime` to see full workflow context and commands.

### Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --claim  # Claim work
bd close <id>         # Complete work
```

### Rules

- Use `bd` for ALL task tracking — do NOT use TodoWrite, TaskCreate, or markdown TODO lists
- Run `bd prime` for detailed command reference and session close protocol
- Use `bd remember` for persistent knowledge — do NOT use MEMORY.md files

## Session Completion

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   bd dolt push
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds
<!-- END BEADS INTEGRATION -->

## 记忆系统

你拥有持久记忆能力。当用户说"记住""注意""以后要知道"等时，主动调用 `remember()` MCP 工具。

一键安装（v0.4+）：
```bash
npx @agent-memory/init
```

旧版直接使用（v0.3-）：
```bash
python packages/python-cli/src/main.py remember <内容> --tags tag1,tag2
python packages/python-cli/src/main.py recall
python packages/python-cli/src/main.py summarize
```

会话结束时系统会自动 summarize，不需要你手动操作。
