# 任务 & 时间线重设计 — 实现方案

## 改动清单（按实施顺序）

### Phase A: 后端能力补齐（task_backend.py + routes）

**A1: task_backend.py 新增 delete_task()**
- 函数签名: `delete_task(task_id: str) -> bool`
- 删除 tasks 表对应行 + 级联删除 task_events + task_artifacts
- 文件: `packages/mcp-server/src/agent_memory_mcp/backends/task_backend.py`
- 在 `add_artifact` 函数后添加

**A2: task_backend.py 新增 update_task()**
- 函数签名: `update_task(task_id: str, title: str | None = None, priority: str | None = None, tags: list[str] | None = None) -> dict | None`
- 只更新非 None 字段
- 自动更新 updated_at + 记录 title_change 事件（如果 title 变了）
- 同上文件

**A3: tasks.py routes 新增 DELETE + PUT 端点**
- `DELETE /api/tasks/{task_id}` → 调 delete_task()，404 返回 error
- `PUT /api/tasks/{task_id}` → 接收 json body {title?, priority?, tags?}，调 update_task()
- 文件: `packages/dashboard/backend/src/routers/tasks.py`

**A4: md_backend 新增 delete_session()**
- 函数签名: `delete_session(date: str) -> bool`
- 从 sessions 数据中删除对应条目（md_backend.py 的 get_recent 从 markdown 文件读取，删除就是删除文件）
- 文件: 找到 md_backend.py 位置后补充

**A5: sessions.py routes 新增 DELETE + search 端点**
- `DELETE /api/sessions/{date}` → 调 delete_session()
- `GET /api/sessions/search?q=...&days=...` → 调 md_backend.grep()
- 文件: `packages/dashboard/backend/src/routers/sessions.py`

### Phase B: 前端 Tasks 重构

**B1: 新建任务功能**
- 页面顶部加"新建任务"按钮 → Modal（标题 input + 优先级 select + 标签 input）
- 调 `POST /api/tasks` → 成功后刷新列表 + message.success
- okButtonProps loading 防重复

**B2: 行内状态切换**
- 状态列的 Tag 改为可点击的 Select（小号 inline Select）
- onChange 调 `POST /api/tasks/{id}/status`
- 成功后更新本地数据（不重新 fetch），message.success
- 加 try/catch 失败时回退

**B3: 行内删除**
- actions 列加删除按钮（DeleteOutlined），调用 `DELETE /api/tasks/{id}`
- Modal.confirm 确认
- 成功后移除行 + message.success

**B4: 详情 Modal 可编辑**
- 标题 → 可编辑 Input
- 优先级 → 可编辑 Select
- 标签 → 可编辑 Select mode="tags" 或 Input
- 保存按钮调 `PUT /api/tasks/{id}`
- okButtonProps loading

**B5: 优先级列 + 筛选**
- 表格新增 priority 列（width=80），color-coded Tag
- 筛选器区域加优先级 Select

### Phase C: 前端 Timeline 重构

**C1: 日期区间选择**
- 顶部加 Select（最近 7 天 / 30 天 / 90 天）替代硬编码 days=30
- onChange 重新 fetch

**C2: 搜索会话**
- 顶部加搜索 Input，300ms debounce
- 调 `GET /api/sessions/search?q=...`
- 搜索时显示搜索中状态，结果可点展开

**C3: 删除会话**
- 每条 session 右上方加删除按钮（小垃圾桶图标）
- Modal.confirm 确认 → 调 `DELETE /api/sessions/{date}`
- 成功后移除该项 + message.success

### Phase D: 聚合数据

执行 seed tasks 修复后端数据。

## 文件改动汇总

| 文件 | 改动类型 |
|------|---------|
| packages/mcp-server/src/agent_memory_mcp/backends/task_backend.py | 新增 delete_task, update_task |
| packages/dashboard/backend/src/routers/tasks.py | 新增 DELETE, PUT 端点 |
| packages/dashboard/backend/src/routers/sessions.py | 新增 DELETE, search 端点 |
| packages/dashboard/frontend/src/pages/Tasks.tsx | 全面重构 — 创建/编辑/删除/状态切换/优先级 |
| packages/dashboard/frontend/src/pages/Timeline.tsx | 搜索/删除/日期筛选 |

## 不做（已排除）

- 看板视图
- 批量操作
- Markdown 渲染
- 拖拽排序
- 乐观 UI 更新
