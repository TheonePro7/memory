"""Dashboard FastAPI 入口"""

import sys
from pathlib import Path

# 支持作为脚本直接运行
sys.path.insert(0, str(Path(__file__).resolve().parent))
# 共享 MCP 服务的后端代码（v0.5 后模块在 agent_memory_mcp 包下）
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent.parent / "mcp-server" / "src" / "agent_memory_mcp"))

import logging
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")

from routers import memories, sessions, stats, tasks, quota

app = FastAPI(title="Agent Memory Dashboard")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

app.include_router(memories.router, prefix="/api")
app.include_router(sessions.router, prefix="/api")
app.include_router(stats.router, prefix="/api")
app.include_router(tasks.router, prefix="/api")
app.include_router(quota.router, prefix="/api")

static_dir = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"
if static_dir.exists():
    app.mount("/", StaticFiles(directory=str(static_dir), html=True), name="frontend")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8712)
