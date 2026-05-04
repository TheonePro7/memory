# Letta

> 状态化 Agent 平台（原 MemGPT）

## 基本信息

| 字段 | 值 |
|---|---|
| **GitHub** | [letta-ai/letta](https://github.com/letta-ai/letta) |
| **⭐ Stars** | **22.4k** |
| **语言** | Python |
| **许可证** | Apache 2.0 |
| **Release** | v0.16.7 (2026-03-31)，累计 176 个 |
| **前身** | MemGPT (ICLR 2024 论文) |

## 定位

"Building stateful agents: AI with advanced memory that can learn and self-improve over time."——Agent 不是每次会话从零开始，而是在持续交互中积累记忆和技能。

## 核心能力

**1. 虚拟上下文管理 (Virtual Context Management)**
- 记忆分页：Agent 主动在上下文窗口 (DRAM) 和外部数据库 (Disk) 之间交换记忆块
- 缺页中断：需要缺失信息时自动触发检索

**2. 分层记忆**

| 层级 | 类比 | 内容 |
|---|---|---|
| 核心记忆 (Core Memory) | 操作系统内核 | 系统指令 + 基础身份，始终在上下文 |
| 归档记忆 (Archival Memory) | 磁盘 | 历史数据，无限扩展，按需检索 |
| 工作记忆 (Working Memory) | RAM | 当前任务中间状态 |

**3. 2026 年新能力**
- **Context Repositories** (2026.2)：git-backed memory，版本化记忆
- **Context Constitution** (2026.4)：Agent 自我管理上下文的治理原则
- **Sleep-time Compute**：Agent 在"空闲"时重写记忆状态
- **Skill Learning** (2025.12)：Agent 通过过去经验"真正改进"而非退化
- **Conversations API** (2026.1)：跨对话共享记忆

## 三种运行模式

| 模式 | 用法 |
|---|---|
| **Letta Code (CLI)** | `npm install -g @letta-ai/letta-code`，本地终端运行 |
| **Letta SDK** | Python/TypeScript SDK 嵌入应用 |
| **Letta Server** | 托管服务（云） |

## 优劣分析

| 维度 | 评价 |
|---|---|
| 记忆深度 | 🟢 OS 级记忆管理——最接近"记忆操作系统"概念的实现 |
| 版本化 | 🟢 git-backed (2026.2)，但任务是文件级而非 cell-level |
| 自治性 | 🟢 Agent 自管理记忆——元认知方向的先驱（2013 MemGPT 论文已提出） |
| 学习曲线 | 🟡 复杂——不是一个库，是一个平台 |
| 延迟 | 🟡 自我编辑增加推理延迟和 token 消耗 |
| 简洁性 | 🟡 对简单场景过度复杂 |
| 与 beads 对比 | 🟡 Letta 是 Agent 平台，beads 是存储层——可以互补 |

## 收费模式

| 模式 | 说明 |
|---|---|
| **开源版** | Apache 2.0，自托管免费 |
| **Letta Cloud** | 托管版，按 Agent 和记忆存储量计费（未公开详细定价） |

## 适用场景

需要"Agent 自主经营记忆"的复杂多 Agent 系统
