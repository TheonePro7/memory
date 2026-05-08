# PRD: Dashboard 模块集成重构

## 目标用户
- 使用 Agent Memory 系统的开发者
- 每天通过 Dashboard 管理 Agent 记忆、任务、会话

## 核心痛点
Dashboard 5 个页面（总览/记忆/Agent/时间线/任务）各自独立加载数据，完全无交叉引用，用户无法在一个模块中看到其他模块的相关信息。

## 根因
三个数据存储系统（ChromaDB 记忆、SQLite 任务、Markdown 会话）之间没有任何共享 ID 或外键关联，导致页面之间无法建立联系。

## 方案
最小侵入式集成：不重构数据库、不新增存储，只在现有架构中建立松耦合关联。

1. ChromaDB 记忆元数据写入 `session_id`（YYYY-MM-DD 日期格式）
2. SQLite 新增 `memory_links` 表实现任务→记忆多对多关联
3. 前端每个页面展示来自其他模块的关联数据

## 验收标准（Acceptance Criteria）
1. 记忆写入时携带 session_id，可通过 /memories/by-session/{date} 查询
2. 任务可关联记忆（memory_links 表 + API），多个任务可关联同一记忆
3. Timeline 会话详情弹窗显示关联的记忆列表
4. Tasks 任务详情弹窗显示关联的记忆（含关系标签）
5. Overview Agent 卡片显示任务/记忆/会话三维统计
6. Memories 表格显示每条记忆的会话日期列
7. TypeScript 类型检查通过（tsc --noEmit），Vite 构建成功
