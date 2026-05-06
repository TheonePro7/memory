# LLM 记忆加工 — 设计文档

> 基于用户自带的 API Key，对记忆做存时实体提取 + 查时重排序

## 动机

当前 MVP 只做纯向量存储和搜索。加入 LLM 后可以在两个环节提升记忆质量：
- **写入时**：提取实体、生成摘要、过滤无价值内容，存到 metadata 中
- **查询时**：对向量搜索结果做重排序和关联推荐，提升召回质量

用户自带 API Key（Anthropic / OpenAI），无 Key 时回退到纯向量模式，功能降级但不报错。

## 架构

```python
packages/mcp-server/src/processor.py    # 新增：LLM 加工逻辑
packages/python-cli/src/main.py         # 修改：--process 参数
packages/mcp-server/src/backends/mem0_backend.py  # 修改：entities 字段
```

## 设计

### 存时加工（`remember --process`）

**一次 LLM 调用，不拆分。**

发送给 LLM 的内容：
```
系统指令：从以下内容中提取结构化信息，输出 JSON。
用户输入：{要记住的内容}

输出格式：
{
  "entities": ["实体1", "实体2"],
  "actions": ["动作描述1"],
  "summary": "一句话摘要",
  "tags": ["标签1", "标签2"],
  "is_useful": true
}
```

存储时 entities、tags 写入 ChromaDB metadata，summary 覆盖默认全文展示。

无 API Key 时跳过 LLM 调用，与不加 `--process` 行为一致。

### 查时加工（`recall --process`）

**向量搜索 → LLM 重排序。**

```
1. ChromaDB 向量搜索得到 10 条
2. 将 10 条内容 + 用户查询发给 LLM
3. LLM 返回重排序后的 top 5 + 每条的相关性原因
4. 同时返回推荐的关联 tags / entities
```

纯向量搜索仍作为默认（`recall`），`recall --process` 为重排序增强版本。

### CLI 变更

```bash
# 存 - 不加工（默认）
python packages/python-cli/src/main.py remember "内容"

# 存 - LLM 加工
python packages/python-cli/src/main.py remember "内容" --process

# 查 - 纯向量（默认）
python packages/python-cli/src/main.py recall

# 查 - LLM 重排序
python packages/python-cli/src/main.py recall --process
```

### 后端 API 变更

- `GET /api/memories?process=true` → 对搜索结果做 LLM 重排序
- 不加 `process` 参数时行为不变

## 与现有 summarize 的关系

summarize 是会话结束时批量处理的，提取的是整段会话中的关键事实。
`--process` 是单条记忆写入时的粒度，提取的是该条内容中的实体。

两者互补不冲突：

```
remember "修复了登录页" --process
  → entities: ["登录页"], actions: ["修复 bug"]

session 结束时 summarize
  → facts: ["修复了登录页 bug", "决定改用 JWT 认证"]
```

## 降级策略

| 条件 | 行为 |
|---|---|
| 无 API Key | `--process` 等同于不传，纯向量，不报错 |
| API 调用超时/失败 | 跳过 LLM 步骤，向量结果正常返回 |
| LLM 返回格式错误 | 回退到纯向量模式 |

## 不做的事情（方案 A 范围）

- ❌ 冲突检测（新记忆与已有记忆矛盾时标记）
- ❌ 自动去重合并
- ❌ QA 模式（基于记忆直接问答）
