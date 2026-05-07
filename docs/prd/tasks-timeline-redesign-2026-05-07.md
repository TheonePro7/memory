# 任务 & 时间线重设计 — PRD

## 为什么做

当前 Tasks 和 Timeline 两个功能页面的可用性极差：
- Tasks: 只能看不能动，无法创建、编辑、删除、改状态，等于一个只读报表
- Timeline: 只能看最近 30 天，不能搜索、筛选、删除，远不如直接看文件系统

## 目标用户

Agent Memory Dashboard 的日常操作用户（开发者/AI Agent 管理员）。

## 需求详情

### Tasks 页面 — 从只读表格 → 可操作的任务管理

#### P0（不做产品不能用）

1. **创建任务** — 页面上方加"新建任务"按钮，弹出 Modal 填标题/优先级/标签，调用后端已实现的 `POST /api/tasks`
2. **修改任务状态** — 表格中的状态 Tag 改为可点击的下拉菜单（Select），或者点击后循环切换（todo → in_progress → done → todo），调用已实现的 `POST /api/tasks/{id}/status`
3. **删除任务** — 每行末尾加删除按钮（垃圾桶图标），确认弹窗后调用 `DELETE /api/tasks/{id}`（**后端需要新增**）
4. **后端实现 delete_task** — `task_backend.py` 新增 `delete_task()` 函数 + `DELETE /api/tasks/{id}` 路由

#### P1（严重影响体验）

5. **后端实现 update_task** — `task_backend.py` 新增 `update_task(id, title, priority, tags)` 函数 + `PUT /api/tasks/{id}` 路由
6. **编辑任务详情** — 详情 Modal 中标题、优先级、标签可编辑，保存后调 `PUT /api/tasks/{id}`
7. **优先级展示 + 筛选** — 表格新增优先级列，Tag 颜色编码（high=红, medium=黄, low=灰），筛选器增加优先级选项
8. **空状态创建引导** — 表格空时显示"创建第一个任务"按钮

#### P2（锦上添花）

9. **详情 Modal 的事件添加** — Modal 中加"添加事件"文本框 + 按钮
10. **搜索任务** — 加标题搜索框
11. **列排序** — Table 的 sorter 支持
12. **跳转 source** — beads 来源的任务显示可点击的 issue 链接

### Timeline 页面 — 从只读列表 → 可操作的会话管理

#### P1（严重影响体验）

1. **后端新增 delete_session** — `md_backend.py` 新增 `delete_session(date)` + `DELETE /api/sessions/{date}` 路由
2. **删除会话** — 每条 session 末尾加删除按钮（含确认），调 `DELETE /api/sessions/{date}`
3. **搜索会话** — 顶栏加搜索框，后端暴露 `GET /api/sessions/search?q=...`（复用 `md_backend.grep()`）
4. **日期区间选择** — 顶部加日期选择器代替写死的 `days=30`

#### P2（锦上添花）

5. **跳转详细页** — 每条 session 加"查看完整"链接，调 `GET /api/sessions/{date}` 在新 Modal 显示
6. **markdown 渲染** — session 内容中检测代码块语法高亮、链接可点击
7. **导出** — 导出全部或选中的会话

## 不做

- 看板视图（Kanban）— 太复杂，v0.6 不做
- 拖拽排序 — 技术成本高，收益有限
- 批量操作 — 等基础 CRUD 稳定后再做
- 乐观 UI 更新 — 当前不必要

## 成功标准

1. 用户能在 Tasks 页面创建 → 查看 → 编辑 → 删除任务
2. 用户能在 Tasks 页面一键切换任务状态
3. 用户能在 Timeline 页面搜索和删除会话
4. 所有操作有正确的 loading/error/success 反馈
5. TypeScript build 通过
6. Vite build 通过
