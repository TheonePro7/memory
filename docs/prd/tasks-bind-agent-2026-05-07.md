# PRD: Tasks 绑定到具体 Agent

## 为什么做

当前 Tasks 看板是全局无主的设计，所有任务混合在一起，没有关联到产生它们的 Agent。当多 Agent 共存时（devflow、WekSkill、note 项目），任务无法隔离、无法按 Agent 筛选，看板失去了实际使用价值。

## 目标

让每个 Agent 拥有独立的任务空间。用户查看某个 Agent 时，看到的是这个 Agent 专属的任务看板。

## 用户故事

1. 作为 Dashboard 用户，我能在 Tasks 页面顶部选择要查看的 Agent，看板只显示该 Agent 的任务
2. 作为 Dashboard 用户，我能在 Agent 详情页点击"查看任务"跳转到该 Agent 的任务看板
3. 作为 Dashboard 用户，我创建任务时能指定属于哪个 Agent，任务自动关联 Agent
4. 作为开发者，API 支持按 agent 参数筛选任务列表

## 验收标准

1. [ ] Tasks 页面顶部有 Agent 下拉选择器，选项来自 /api/agents 接口
2. [ ] 选择 Agent 后看板只显示该 Agent 的任务
3. [ ] 创建任务 Modal 中有 Agent 选择字段
4. [ ] Agent 详情页有"查看任务"入口，跳转到 /tasks?agent=<id>
5. [ ] URL 中带 `?agent=` 参数时自动选中对应 Agent
6. [ ] 后端 /api/tasks 支持 `agent` 查询参数筛选
7. [ ] TypeScript build 通过，Vite build 通过
8. [ ] 数据库迁移向后兼容（无 agent 参数时行为不变）

## 设计约束

- 数据库层面：`tasks` 表加 `agent` 列，默认为空，不加 NOT NULL 约束（向后兼容）
- API 层面：`agent` 参数可选，不传时返回所有任务
- 前端层面：Agent 选择器放在筛选栏左侧，URL 参数与筛选状态同步
