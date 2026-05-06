# Changelog

## v1.0.0 (2026-05-06) — 记忆管理产品版

### 新增功能

- **记忆编辑/删除 UI** — Dashboard 编辑弹窗 + 删除确认，直接操作记忆内容
- **编辑限制** — 每月 100 次免费编辑，SQLite 本地配额管理
- **裂变推荐** — 每成功邀请一位 +50 次编辑额度，支持 CLI 和 API
- **升级引导** — 配额用尽时弹出引导界面，显示邀请码和 Pro 提示
- **记忆管理层** — 同步层架构（`core.py`），`remember()` 可选广播到第三方存储
- **适配器框架** — `MemoryAdapter` 抽象基类，支持注册多个读取适配器
- **Mem0 适配器** — 读取 Mem0（Qdrant 后端）的记忆
- **Basic Memory 适配器** — 读取 Basic Memory Markdown 文件
- **记忆导出 API** — `GET /api/memories/export` 全部记忆 JSON 导出

### 架构改进

- 新增 `core.py` 共享业务逻辑层，`server.py` 作为薄胶水层
- 新增 `backends/adapters/` 模块，适配器插件化注册
- 新增 `backends/quota.py` 配额 + 裂变子系统
- Dashboard 后端新增 `routers/quota.py` 配额 API
- CLI 新增 `refer` 命令显示邀请码

### Bug 修复

- 修复 `delete()` 不校验 ID 存在的权限漏洞
- 修复 `audit.py` 日志旋转不清理旧文件
- 修复 `_append_session_log` 重复定义（抽取到 `core.py`）
- 修复测试断言文件名不匹配（`context.json` → `context.{pid}.json`）
- 修复 CLI 测试编码问题（UTF-8 显式写入）
- 移除已废弃的 `importance`/`auto_verify` 参数
- 修复配额数据库路径缓存问题（模块级常量改为运行时读取）

### 测试

- 新增：配额 + 裂变测试（4 个）
- 新增：适配器接口测试（2 个）
- 新增：`mem0_backend.update()` 测试
- 新增：`core.py` 适配器注册测试
- 全量测试 97 个全部通过

### 文档

- 更新 README：记忆管理功能介绍、编辑限制、裂变推荐、同步层、适配器
- 新增 CHANGELOG.md

## v0.5 (2026-05-05) — 架构重构

### 变更

- 全新 `core.py` 共享业务逻辑层
- `server.py` 改为薄胶水层
- CLI 命令注册统一到 `cli.py`，移除独立 `router.py`
- `python-cli/` 合并入 `mcp-server`
- 移除死代码，清理 import

### Bug 修复

- 修复 SQLite 连接未关闭（`task_backend.py`）
- 修复 context.json PID 后缀
- 修复 summarize `task_completed` 字段
- 修复 HTTP 错误处理
- 修复 hooks 路径问题
- 修复 `md_backend` 目录不存在问题
- 修复审计日志旋转问题

## v0.4 (2026-05-01) — TypeScript CLI

### 新增

- `npx @ivanston/init` 一键安装 CLI
- 5 步安装流程（检测 Python → pip → MCP 配置 → hooks → CLAUDE.md）
- `npx @agent-memory/remove` 卸载命令
- 优雅降级：每步错误独立隔离

## v0.3 (2026-04-28) — 任务记忆

### 新增

- SQLite 三表存储（tasks / task_events / task_artifacts）
- beads 增量同步
- CLI `task list|show|start|done|block` 子命令
- MCP `task_context` 工具
- Dashboard 任务看板页

## v0.2 (2026-04-20) — LLM 记忆加工

### 新增

- `remember --process` — 自动实体提取 + LLM 摘要
- `recall --process` — LLM 重排序
- 用户自备 API Key（Anthropic / OpenAI）
- 无 Key 优雅降级（纯向量模式）

## v0.1 (2026-04-15) — MVP

### 新增

- ChromaDB + fastembed 后端（多语言支持：中/英/日/韩）
- 语义搜索
- Dashboard 记忆浏览 + 统计
- CLI `remember/recall/summarize`
- MCP 集成（Claude Code 自动记忆）
- Hook 自动 recall（会话开始）+ summarize（会话结束）
- 跨项目共享（中央库 + project_id 隔离）
- `--project-id` 参数覆盖自动检测
