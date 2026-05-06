# v0.4 TypeScript CLI — 设计文档

> `npx @agent-memory/init` 一键激活 Agent 记忆的 CLI 工具

## 动机

目前 Agent 记忆系统的安装方式需要用户克隆整个仓库并手动运行 setup 脚本。这对终端用户不友好，也无法形成"产品即服务"的体验。v0.4 将安装流程封装为一个 npm 包，用户只需一行命令即可激活记忆。

### 核心原则

- **一行命令** — `npx @agent-memory/init`，不需要克隆仓库
- **优雅降级** — 每个步骤独立，失败不阻断后续，结束时汇总结果
- **场景兼容** — 既可为已有项目安装记忆，也可初始化新项目

## 架构

```
@agent-memory/init (npm 包)
├── src/
│   ├── index.ts          # 入口 — 命令路由
│   ├── install.ts        # 安装主流程
│   ├── remove.ts         # 卸载
│   ├── utils.ts          # 文件操作 / 路径 / 子进程
│   └── vendor/           # 内置 Python 代码（回退用）
│       └── mcp-server/
```

### 分发策略

| 组件 | 发布渠道 | 安装方式 |
|------|----------|----------|
| CLI 工具 | npm (`@agent-memory/init`) | `npx @agent-memory/init` |
| MCP 服务器 | PyPI (`agent-memory-mcp`) | `pip install agent-memory-mcp` |
| MCP 服务器（回退） | npm 内置 | 从 vendor/ 解压到项目目录 |

### CLI 参数

```bash
npx @agent-memory/init                           # 当前目录安装
npx @agent-memory/init /path/to/project          # 指定路径安装
npx @agent-memory/init --dry-run                 # 仅检测环境
npx @agent-memory/remove                         # 卸载
npx @agent-memory/remove /path/to/project        # 从指定项目卸载
```

## 安装流程

```
Step 1: 解析目标目录
  - 参数路径存在 → 使用它
  - 无参数 → 使用 CWD
  - 目录不存在 → 报错退出

Step 2: 检测环境
  - python3 --version (需 ≥ 3.10)
  - pip3 (或 python3 -m pip)
  - 失败 → 提示手动安装 Python，继续

Step 3: 安装 Python 依赖（优雅降级）
  - 1st try: pip install agent-memory-mcp
  - 2nd try: 从 vendor/ 复制到 .agent-memory/mcp-server/，pip install -r requirements.txt
  - 3rd try: 输出 pip 命令让用户手动安装
  - 记录安装方式（决定后续 MCP 配置路径）

Step 4: 写 Claude Code 配置
  - .claude/settings.local.json
    → mcpServers.agent-memory 配置
    → 路径根据 Step 3 的安装方式决定（PyPI 包用 python -m，本地用文件路径）
  - .claude/hooks.json
    → onSessionStart: agent-memory recall
    → onSessionEnd: agent-memory summarize
  - CLAUDE.md
    → 追加记忆系统段落（已有则跳过）
  - ~/.agent-memory/config.yaml
    → 用户标识 / 项目标识
  - hooks 命令检查
    → Python CLI 未安装时，hooks 中的 `agent-memory recall/summarize` 会失败
    → 解决方案：在 .claude/hooks.json 中写为 `python -m agent_memory_mcp recall`（PyPI 模式）
    → 或写 fallback shell 脚本检测 CLI 是否可用

Step 5: 报告结果
  - 全部成功 → 绿色 ✓
  - 部分失败 → 黄色 ⚠️ 列出需手动处理的项目
```

### MCP 配置方式

**情况 A — PyPI 安装成功：**

```json
{
  "mcpServers": {
    "agent-memory": {
      "command": "python",
      "args": ["-m", "agent_memory_mcp"]
    }
  }
}
```

**情况 B — 本地副本安装：**

```json
{
  "mcpServers": {
    "agent-memory": {
      "command": "python",
      "args": [".agent-memory/mcp-server/server.py"]
    }
  }
}
```

## 错误处理

- **每个步骤独立执行** — Python 安装失败仍会尝试写配置
- **非破坏性写入** — 配置合并而非覆盖（已有 hooks 保留，settings.local.json 合并 mcpServers）
- **卸载清理** — `remove` 命令撤销所有写入（保留记忆数据文件）
- **--dry-run 模式** — 仅检测环境，不写任何文件

## Versions

| 版本 | CLI npm | MCP PyPI |
|------|---------|----------|
| v0.1.0 | 首个发布 | 首个发布 |

CLI 和 MCP 服务器版本号独立，但建议同步发布以避免兼容性问题。

## 不做的事情

- ❌ 不在 init 时安装 Dashboard（用户可选后续启动）
- ❌ 不处理 Python 版本管理（pyenv 等用户自行管理）
- ❌ 不提供 GUI 安装界面
- ❌ 不支持 Windows 以外的平台（先验证 macOS/Linux 流程再扩展）

## 降级策略

- 无 Python 环境 → 输出清晰提示和安装链接，退出码 0
- pip 安装部分失败 → 黄色警告，告知哪些依赖需要手动安装
- 目标目录已有记忆配置 → 检测后跳过重复步骤，仅更新差异
- 写入权限不足 → 提示用户用 sudo 或手动创建
