# 一键安装脚本 + README 实现计划

> **For agentic workers:** 直接按 Task 顺序执行，每个 Task 完成后提交。

**目标：** 别人 `git clone` 后用一条命令跑起整个系统

**架构：** setup 脚本自动处理依赖安装、MCP 配置写入、前端构建

**涉及文件：**
- `scripts/setup.ps1` — Windows 安装脚本
- `scripts/setup.sh` — Linux/macOS 安装脚本
- `README.md` — 项目根目录快速开始文档

---

### Task 1: 创建 setup.ps1（Windows）

**文件：** `scripts/setup.ps1`

- [ ] 脚本内容：

```powershell
param(
    [switch]$NoDashboard
)

$ErrorActionPreference = "Stop"
$ROOT = Split-Path -Parent $PSScriptRoot

Write-Host "=== Agent Memory 安装 ===" -ForegroundColor Cyan

# 1. Python 依赖
Write-Host "[1/4] 安装 Python 依赖..." -ForegroundColor Yellow
pip install -r "$ROOT\packages\mcp-server\requirements.txt"
pip install -r "$ROOT\packages\dashboard\backend\requirements.txt"

# 2. Dashboard 前端
if (-not $NoDashboard) {
    Write-Host "[2/4] 构建 Dashboard 前端..." -ForegroundColor Yellow
    Push-Location "$ROOT\packages\dashboard\frontend"
    npm install
    npx vite build
    Pop-Location
} else {
    Write-Host "[2/4] 跳过 Dashboard 前端构建" -ForegroundColor Gray
}

# 3. MCP 配置
Write-Host "[3/4] 配置 MCP 服务..." -ForegroundColor Yellow
$mcpConfig = @{
    mcpServers = @{
        "agent-memory" = @{
            command = "python"
            args = @("$ROOT\packages\mcp-server\src\server.py")
            env = @{}
        }
    }
}
$settingsDir = "$ROOT\.claude"
if (-not (Test-Path $settingsDir)) { New-Item -ItemType Directory -Path $settingsDir -Force | Out-Null }
$mcpConfig | ConvertTo-Json -Depth 3 | Set-Content "$settingsDir\settings.local.json" -Encoding UTF8

# 4. Hooks 配置
Write-Host "[4/4] 配置 Hooks..." -ForegroundColor Yellow
$hooksConfig = @{
    onSessionStart = @("python $ROOT\packages\python-cli\src\main.py recall")
    onSessionEnd = @("python $ROOT\packages\python-cli\src\main.py summarize")
}
$hooksConfig | ConvertTo-Json -Depth 2 | Set-Content "$settingsDir\hooks.json" -Encoding UTF8

Write-Host "`n=== 安装完成 ===" -ForegroundColor Green
Write-Host "Dashboard: http://localhost:8712" -ForegroundColor Cyan
Write-Host "启动 Dashboard: python $ROOT\packages\dashboard\backend\src\main.py" -ForegroundColor Gray
```

- [ ] 提交

---

### Task 2: 创建 setup.sh（Linux/macOS）

**文件：** `scripts/setup.sh`

- [ ] 脚本内容：

```bash
#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "=== Agent Memory 安装 ==="

echo "[1/4] 安装 Python 依赖..."
pip install -r "$ROOT/packages/mcp-server/requirements.txt"
pip install -r "$ROOT/packages/dashboard/backend/requirements.txt"

echo "[2/4] 构建 Dashboard 前端..."
cd "$ROOT/packages/dashboard/frontend"
npm install
npx vite build

echo "[3/4] 配置 MCP 服务..."
mkdir -p "$ROOT/.claude"
cat > "$ROOT/.claude/settings.local.json" << EOF
{
  "mcpServers": {
    "agent-memory": {
      "command": "python",
      "args": ["$ROOT/packages/mcp-server/src/server.py"],
      "env": {}
    }
  }
}
EOF

echo "[4/4] 配置 Hooks..."
cat > "$ROOT/.claude/hooks.json" << EOF
{
  "onSessionStart": ["python $ROOT/packages/python-cli/src/main.py recall"],
  "onSessionEnd": ["python $ROOT/packages/python-cli/src/main.py summarize"]
}
EOF

echo ""
echo "=== 安装完成 ==="
echo "Dashboard: http://localhost:8712"
echo "启动: python $ROOT/packages/dashboard/backend/src/main.py"
```

- [ ] `chmod +x scripts/setup.sh`
- [ ] 提交

---

### Task 3: 创建 README.md

**文件：** `README.md`

- [ ] README 内容：

```markdown
# Agent Memory

让 Claude Code 拥有持久记忆能力。基于 ChromaDB + fastembed 的本地向量记忆系统，无需任何 API Key。

## 快速开始

```bash
git clone https://github.com/TheonePro7/memory.git
cd memory

# Windows
.\scripts\setup.ps1

# Linux / macOS
chmod +x scripts/setup.sh && ./scripts/setup.sh
```

## 启动 Dashboard

```bash
python packages/dashboard/backend/src/main.py
# 访问 http://localhost:8712
```

## 手动使用

```bash
# 记住一条信息
python packages/python-cli/src/main.py remember "内容" --tags tag1,tag2

# 搜索记忆
python packages/python-cli/src/main.py recall
```

## 系统架构

```
memory/
├── packages/
│   ├── mcp-server/       # MCP 服务（记忆读写）
│   ├── python-cli/       # CLI 工具（Hook 调用）
│   ├── dashboard/        # Web 管理界面
│   │   ├── backend/      # FastAPI 后端
│   │   └── frontend/     # React + Ant Design 前端
│   └── cli/              # TypeScript CLI（开发中）
├── scripts/
│   ├── setup.ps1         # Windows 安装脚本
│   └── setup.sh          # Linux/macOS 安装脚本
└── .claude/
    ├── settings.local.json   # MCP 服务配置
    └── hooks.json            # 自动 recall/summarize
```

## 技术栈

- **向量存储：** ChromaDB + fastembed（`paraphrase-multilingual-mpnet-base-v2`）
- **语义搜索：** 支持中文、英文等多语言
- **MCP 协议：** FastMCP 3.x，通过 Claude Code MCP 集成
- **前端：** React 18 + Ant Design 6 + Vite
- **后端：** FastAPI + uvicorn

## 隐私

完全本地运行，数据存储在项目目录的 `.memory/` 下。不依赖任何外部 API。
```

- [ ] 提交
