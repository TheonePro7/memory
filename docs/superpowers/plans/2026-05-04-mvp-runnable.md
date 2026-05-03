# MVP 可运行修复计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让现有代码能编译运行，实现 CLI 编译 → MCP 服务 → Dashboard 的完整链路

**Architecture:** monorepo（npm workspaces），CLI 是 TypeScript，MCP 和 Dashboard 后端是 Python，Dashboard 前端是 React+Vite+Ant Design

**Tech Stack:** TypeScript, Python FastMCP + FastAPI, React 18 + Ant Design + Vite, mem0ai + Chroma

---

### Task 1: 编译 CLI 安装器

**Files:**
- Create: `packages/cli/dist/index.js`（编译产物，但 `dist/` 在 `.gitignore` 中，仅验证）

- [ ] **Step 1: 安装 monorepo 依赖（如果还没装）**

```bash
cd "f:\AI\memory\.worktrees\feat-mvp-memory-system"
npm install
```

Expected: 成功，无报错

- [ ] **Step 2: 编译 CLI**

```bash
cd "f:\AI\memory\.worktrees\feat-mvp-memory-system"
npx tsc -p packages/cli/tsconfig.json
```

Expected: 命令成功退出，`packages/cli/dist/index.js` 生成

- [ ] **Step 3: 验证产物**

```bash
ls -la packages/cli/dist/index.js
```

Expected: 文件存在，> 0 bytes（`dist/` 在 gitignore 中，不提交）

---

### Task 2: 清理 Dashboard Frontend 残留 .js 文件

**Files:**
- Delete: `packages/dashboard/frontend/src/App.js`
- Delete: `packages/dashboard/frontend/src/main.js`
- Delete: `packages/dashboard/frontend/src/pages/Overview.js`
- Delete: `packages/dashboard/frontend/src/pages/Memories.js`
- Delete: `packages/dashboard/frontend/src/pages/Timeline.js`
- Delete: `packages/dashboard/frontend/src/pages/Settings.js`

**原因：** 之前从 .tsx 编译出的 .js 文件被误提交了。Vite 使用 TypeScript 编译器直接处理 .tsx 文件，不需要这些 .js 文件。它们的存在可能混淆导入解析。

- [ ] **Step 1: 删除所有 .js 文件**

```bash
cd "f:\AI\memory\.worktrees\feat-mvp-memory-system"
rm packages/dashboard/frontend/src/App.js
rm packages/dashboard/frontend/src/main.js
rm packages/dashboard/frontend/src/pages/Overview.js
rm packages/dashboard/frontend/src/pages/Memories.js
rm packages/dashboard/frontend/src/pages/Timeline.js
rm packages/dashboard/frontend/src/pages/Settings.js
```

- [ ] **Step 2: 提交**

```bash
git rm packages/dashboard/frontend/src/App.js packages/dashboard/frontend/src/main.js packages/dashboard/frontend/src/pages/Overview.js packages/dashboard/frontend/src/pages/Memories.js packages/dashboard/frontend/src/pages/Timeline.js packages/dashboard/frontend/src/pages/Settings.js
git commit -m "chore: remove stale .js files from dashboard frontend"
```

---

### Task 3: 删除已提交的 `__pycache__` 目录

**Files:**
- Delete: `packages/dashboard/backend/src/__pycache__/`
- Delete: `packages/dashboard/backend/src/routers/__pycache__/`
- Delete: `packages/mcp-server/src/backends/__pycache__/`

**原因：** .pyc 文件不应提交到 git（已有 `.gitignore` 规则禁止，但历史提交中包含它们）

- [ ] **Step 1: 从 git 中删除并清理本地 `__pycache__` 目录**

```bash
cd "f:\AI\memory\.worktrees\feat-mvp-memory-system"
git rm -r --cached packages/dashboard/backend/src/__pycache__/
git rm -r --cached packages/dashboard/backend/src/routers/__pycache__/
git rm -r --cached packages/mcp-server/src/backends/__pycache__/
rm -rf packages/dashboard/backend/src/__pycache__/
rm -rf packages/dashboard/backend/src/routers/__pycache__/
rm -rf packages/mcp-server/src/backends/__pycache__/
```

- [ ] **Step 2: 提交**

```bash
git commit -m "chore: remove committed __pycache__ directories"
```

---

### Task 4: 添加思源黑体 + Ant Design 主题配置

**Files:**
- Modify: `packages/dashboard/frontend/src/App.tsx` — 添加 `ConfigProvider` 主题
- Modify: `packages/dashboard/frontend/index.html` — 添加 Google Fonts CDN 链接

- [ ] **Step 1: 在 App.tsx 中包裹 ConfigProvider 并配置主题**

修改 `packages/dashboard/frontend/src/App.tsx`：

```tsx
// 导入 ConfigProvider
import { ConfigProvider, Layout, Menu } from "antd";

// 在文件顶部添加主题配置（现有内容上方）
const theme = {
  token: {
    colorPrimary: "#1a1a2e",
    colorBgContainer: "#ffffff",
    colorBgLayout: "#f8f9fa",
    colorBorderSecondary: "#edf0f5",
    borderRadius: 10,
    fontFamily: '"Noto Sans CJK SC", "Source Han Sans SC", -apple-system, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
    boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
  },
};
```

然后将现有的 JSX 包裹在 `<ConfigProvider theme={theme}>` 中。

- [ ] **Step 2: 在 index.html 中添加 Google Fonts CDN 链接**

修改 `packages/dashboard/frontend/index.html`，在 `<head>` 中添加：

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@300;400;500;600;700&display=swap" rel="stylesheet">
```

- [ ] **Step 3: 提交**

```bash
git add packages/dashboard/frontend/src/App.tsx packages/dashboard/frontend/index.html
git commit -m "feat(dashboard): add Ant Design theme and Noto Sans SC font"
```

---

### Task 5: 编译并验证 Dashboard 前端

- [ ] **Step 1: 编译前端**

```bash
cd "f:\AI\memory\.worktrees\feat-mvp-memory-system\packages\dashboard\frontend"
npx vite build
```

Expected: `dist/` 目录生成，无编译错误（`dist/` 在 gitignore 中，不提交）

---

### Task 6: 验证 MCP 服务器可导入

**Files:**
- Read only: `packages/mcp-server/src/server.py`

- [ ] **Step 1: 验证 MCP 模块可导入**

```bash
cd "f:\AI\memory\.worktrees\feat-mvp-memory-system"
python -c "
import sys
sys.path.insert(0, 'packages/mcp-server/src')
from server import mcp
print('MCP server imports OK')
print('Tools:', list(mcp._tool_manager._tools.keys()))
"
```

Expected: 打印工具列表（remember, recall, summarize, forget, memory_stats, audit_log）

---

### Task 7: 验证 Dashboard 后端可启动

**Files:**
- Read only: `packages/dashboard/backend/src/main.py`

- [ ] **Step 1: 后端启动测试**

```bash
cd "f:\AI\memory\.worktrees\feat-mvp-memory-system"
python -c "
import sys
sys.path.insert(0, 'packages/mcp-server/src')
sys.path.insert(0, 'packages/dashboard/backend/src')
from main import app
print('Dashboard backend imports OK')
print('Routes loaded:', [r.path for r in app.routes])
"
```

Expected: 打印 API 路由列表

---

### Task 8: 跟踪 `package-lock.json` 并提交

**Files:**
- Add: `package-lock.json`（根目录，npm workspace 生成的 lock 文件）

**原因：** Lock 文件应被版本跟踪以确保可重现的安装，它不在 `.gitignore` 中

- [ ] **Step 1: 添加并提交**

```bash
cd "f:\AI\memory\.worktrees\feat-mvp-memory-system"
git add package-lock.json
git commit -m "chore: track package-lock.json"
```

---

## 实现后检查清单

- [ ] CLI TypeScript 编译成功
- [ ] Dashboard 前端残留 `.js` 文件已删除
- [ ] `__pycache__` 不再被 git 跟踪
- [ ] Ant Design 主题已配置（思源黑体 + 浅色主题）
- [ ] Dashboard 前端编译成功
- [ ] MCP 服务器可导入
- [ ] Dashboard 后端可导入
- [ ] `package-lock.json` 已跟踪
