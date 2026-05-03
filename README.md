# Agent Memory

> 装了这个东西，就变真智能了。

一个让 AI Agent 拥有记忆能力的元认知层产品。不是另一个记忆 API，而是 Agent 的记忆操作系统。

## 核心洞见

真智能的反面不是"笨"，是"失忆"。

当前所有 AI 编程助手都像一个很聪明但每天失忆的人——每次会话都是全新开始，记不住项目的事、犯过的错、说过的需求。

## 四层记忆架构

```
长期知识 (LTM)      ← StructMem / EverMind 方向
    ↑ 沉淀
任务记忆 (Task)      ← beads 方向（版本化任务图）
    ↑ 压缩
情景记忆 (Episodic)  ← 我们的产品主战场
    ↑ 衰减
工作记忆 (Working)   ← 上下文窗口
```

## MVP

```
npx @agent-memory/init
```

一键激活：检测 beads → 初始化数据库 → 注入 CLAUDE.md → Agent 获得记忆。全程 < 3 秒。

## 状态

MVP 设计完成，代码待开始。
