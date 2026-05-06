# Agent Memory MCP

Agent 记忆系统 MCP 服务 — 为 Claude Code / Cursor 等 AI 客户端提供持久记忆能力。

## 功能

- **记住** 关键信息、用户偏好、项目上下文
- **回忆** 相关记忆，支持语义搜索和 LLM 重排序
- **摘要** 自动生成会话摘要并提取事实
- **任务管理** 跟踪活跃任务、同步 beads 任务数据
- **审计日志** 查询操作历史

## 安装

```bash
pip install ivanston-memory-mcp
```

## 配置

在 MCP 客户端配置中添加：

```json
{
  "mcpServers": {
    "agent-memory": {
      "command": "agent-memory",
      "args": ["server"],
      "env": {
        "ANTHROPIC_API_KEY": "sk-..."
      }
    }
  }
}
```

## 使用

```bash
# CLI 命令
agent-memory remember "重要信息" --tags project,config
agent-memory recall "查询内容"
agent-memory task list
```

## 许可证

MIT
