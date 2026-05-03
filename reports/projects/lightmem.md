# LightMem

> ICLR 2026 · 轻量高效记忆增强

## 基本信息

| 字段 | 值 |
|---|---|
| **GitHub** | [zjunlp/LightMem](https://github.com/zjunlp/LightMem) |
| **⭐ Stars** | **814** |
| **语言** | Python |
| **许可证** | MIT |
| **论文** | ICLR 2026 (arXiv:2510.18866) |

## 定位

"Lightweight and Efficient Memory-Augmented Generation."——预压缩 + 主题分割 + 分层摘要，用最少 token 实现记忆。

## 核心能力

- **预压缩**：LLMLingua-2 压缩后存储
- **主题分割**：将长对话按主题切分
- **元数据提取**：关键词/实体用于过滤检索
- **摘要 + 原文并存**
- **向量检索**：Qdrant / FAISS / BM25
- **离线批更新**：低成本记忆固结
- **MCP Server**

## 收费模式

| 模式 | 说明 |
|---|---|
| **开源版** | MIT，免费 |
| **纯学术** | 无商业版本 |
