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
