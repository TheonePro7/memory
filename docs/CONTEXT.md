# Project Context - Ubiquitous Language

## Project
Agent 记忆系统 — 让 Claude Code 安装后自动拥有记忆能力（元认知层）。

MVP：`npx @agent-memory/init` — 一键激活 Agent 记忆的 CLI 工具。

## Domain Glossary

| 术语 | 定义 |
|------|------|
| Agent 记忆 | AI 编码助手的持久化跨会话记忆能力 |
| 元认知层 | 让 AI 能"记住自己是谁"的基础设施层 |
| beads | 版本化任务跟踪系统（Go 实现） |
| gitnexus | 代码知识图谱索引工具 |
| mem0 | 向量记忆后端（ChromaDB + fastembed） |
| MCP | Model Context Protocol，模型上下文协议 |
| FastMCP | Python MCP 服务框架 |
| processor.py | LLM 记忆加工模块（实体提取/重排序） |
| Hook | Claude Code 生命周期钩子（SessionStart/End） |
