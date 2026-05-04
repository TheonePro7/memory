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
cat > "$ROOT/.claude/settings.local.json" <<- EOF
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
cat > "$ROOT/.claude/hooks.json" <<- EOF
{
  "onSessionStart": ["python packages/python-cli/src/main.py recall"],
  "onSessionEnd": ["python packages/python-cli/src/main.py summarize"]
}
EOF

echo ""
echo "=== 安装完成 ==="
echo "Dashboard: http://localhost:8712"
echo "启动: python $ROOT/packages/dashboard/backend/src/main.py"
