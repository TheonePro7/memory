# LLM 记忆加工 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** 在 remember 时用 LLM 提取实体/摘要，在 recall 时用 LLM 重排序搜索结果

**Architecture:** 新增 processor.py 封装 LLM 调用逻辑（复用 summarize.py 的 API Key 检测模式），CLI 层加 `--process` 开关调用 processor，结果存入 ChromaDB metadata。无 API Key 时完全降级，不报错。

**Tech Stack:** Python httpx + Anthropic/OpenAI API（复用现有 summarize.py 模式），ChromaDB metadata

---

### Task 1: 创建 processor.py — LLM 提取与重排序

**Files:**
- Create: `packages/mcp-server/src/processor.py`

- [ ] **Step 1: 实现 `extract()` — 存时实体提取**

```python
"""LLM 记忆加工：实体提取 + 搜索重排序"""

import os
import json
import logging

logger = logging.getLogger(__name__)


def extract(content: str) -> dict | None:
    """从内容中提取结构化信息。返回 entities/actions/summary/tags/is_useful 或 None（无 API Key/失败）。"""
    api_key = os.environ.get("ANTHROPIC_API_KEY") or os.environ.get("OPENAI_API_KEY")
    if not api_key:
        return None

    prompt = (
        "从以下内容中提取结构化信息，只输出 JSON。\n\n"
        f"内容：{content}\n\n"
        "输出格式：\n"
        '{"entities": ["实体1", "实体2"], "actions": ["动作描述"], '
        '"summary": "一句话摘要", "tags": ["标签1"], "is_useful": true}'
    )

    try:
        if os.environ.get("ANTHROPIC_API_KEY"):
            data = _call_anthropic(prompt)
        else:
            data = _call_openai(prompt)
        return _parse_json_response(data)
    except Exception as e:
        logger.warning("LLM extract failed: %s", e)
        return None


def rerank(query: str, results: list[dict], top_n: int = 5) -> list[dict] | None:
    """对搜索结果做 LLM 重排序。返回前 top_n 条，或 None（失败时回退原始结果）。"""
    api_key = os.environ.get("ANTHROPIC_API_KEY") or os.environ.get("OPENAI_API_KEY")
    if not api_key or not results:
        return None

    items = "\n".join(
        f"[{i}] {r.get('memory', '')[:200]}" for i, r in enumerate(results)
    )
    prompt = (
        "以下是根据用户查询搜到的记忆，请按相关性从高到低重排序，\n"
        f"只保留最相关的 {top_n} 条。输出 JSON 数组。\n\n"
        f"用户查询：{query}\n\n"
        f"记忆列表：\n{items}\n\n"
        "输出格式：[{\"index\": 0, \"reason\": \"相关原因\"}, ...]"
    )

    try:
        if os.environ.get("ANTHROPIC_API_KEY"):
            data = _call_anthropic(prompt)
        else:
            data = _call_openai(prompt)
        ranked = _parse_json_response(data)
        if not isinstance(ranked, list):
            return None
        reranked = []
        for item in ranked:
            idx = item.get("index")
            if isinstance(idx, int) and 0 <= idx < len(results):
                r = dict(results[idx])
                r["rerank_reason"] = item.get("reason", "")
                reranked.append(r)
        return reranked[:top_n] if reranked else None
    except Exception as e:
        logger.warning("LLM rerank failed: %s", e)
        return None


def _call_anthropic(prompt: str) -> dict:
    import httpx
    resp = httpx.post(
        "https://api.anthropic.com/v1/messages",
        headers={
            "x-api-key": os.environ["ANTHROPIC_API_KEY"],
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        },
        json={
            "model": os.environ.get("PROCESSOR_MODEL", "claude-sonnet-4-20250506"),
            "max_tokens": 512,
            "messages": [{"role": "user", "content": prompt}],
        },
        timeout=15,
    )
    return resp.json()


def _call_openai(prompt: str) -> dict:
    import httpx
    resp = httpx.post(
        "https://api.openai.com/v1/chat/completions",
        headers={
            "authorization": f"Bearer {os.environ['OPENAI_API_KEY']}",
            "content-type": "application/json",
        },
        json={
            "model": "gpt-4o-mini",
            "max_tokens": 512,
            "messages": [{"role": "user", "content": prompt}],
        },
        timeout=15,
    )
    return resp.json()


def _parse_json_response(data: dict) -> dict | list | None:
    try:
        if "content" in data:
            content = data["content"][0]["text"]
        elif "choices" in data:
            content = data["choices"][0]["message"]["content"]
        else:
            return None

        if "```json" in content:
            content = content.split("```json")[1].split("```")[0]
        elif "```" in content:
            content = content.split("```")[1].split("```")[0]

        return json.loads(content.strip())
    except (json.JSONDecodeError, KeyError, IndexError) as e:
        logger.warning("LLM response parse failed: %s", e)
        return None
```

- [ ] **Step 2: 验证 processor.py 可导入**

Run: `python -c "import sys; sys.path.insert(0,'packages/mcp-server/src'); from processor import extract, rerank; print('ok')"`

Expected: `ok`（即使无 API Key，函数本身应可正常导入）

- [ ] **Step 3: 提交**

```bash
git add packages/mcp-server/src/processor.py
git commit -m "feat: add LLM processor for entity extraction and reranking"
```

---

### Task 2: 修改 mem0_backend.py — 支持 entities/summary 元数据

**Files:**
- Modify: `packages/mcp-server/src/backends/mem0_backend.py:61-87`

- [ ] **Step 1: 修改 `add()` 接受 entities/actions/llm_summary 参数**

```python
def add(
    content: str,
    user_id: str = "default",
    project_id: str | None = None,
    tags: list[str] | None = None,
    entities: list[str] | None = None,
    actions: list[str] | None = None,
    llm_summary: str | None = None,
) -> dict:
    try:
        if not content or not content.strip():
            return {"id": "", "backend": "mem0", "status": "error", "error": "empty content"}
        memory_id = str(uuid.uuid4())
        vector = _embed(content)
        metadata = {"user_id": user_id}
        if project_id:
            metadata["project_id"] = project_id
        if tags:
            metadata["tags"] = ",".join(tags)
        if entities:
            metadata["entities"] = ",".join(entities)
        if actions:
            metadata["actions"] = ",".join(actions)
        if llm_summary:
            metadata["llm_summary"] = llm_summary

        _get_collection().add(
            documents=[content],
            embeddings=[vector],
            metadatas=[metadata],
            ids=[memory_id],
        )
        return {"id": memory_id, "backend": "mem0", "status": "stored"}
    except Exception as e:
        logger.error("add failed: %s", e)
        return {"id": "", "backend": "mem0", "status": "error", "error": str(e)}
```

- [ ] **Step 2: 验证 add 支持新参数**

Run: `python -c "import sys; sys.path.insert(0,'packages/mcp-server/src'); from backends import mem0_backend; r=mem0_backend.add('test entities', entities=['e1','e2'], actions=['a1'], llm_summary='test'); print(r)"`

Expected: `{"id": "...", "backend": "mem0", "status": "stored"}`

- [ ] **Step 3: 提交**

```bash
git add packages/mcp-server/src/backends/mem0_backend.py
git commit -m "feat: support entities/actions/llm_summary metadata in add()"
```

---

### Task 3: 更新 CLI — remember --process

**Files:**
- Modify: `packages/python-cli/src/main.py`

- [ ] **Step 1: 修改 `cmd_remember()` 添加 --process 支持**

在 main.py 顶部添加 import：
```python
from processor import extract
```

修改 `cmd_remember()`：
```python
def cmd_remember():
    """记住一条信息，用法: agent-memory remember <content> [--tags a,b,c] [--project-id name] [--process]"""
    if len(sys.argv) < 3:
        print("Usage: agent-memory remember <content> [--tags a,b,c] [--project-id name] [--process]", file=sys.stderr)
        sys.exit(1)
    content = sys.argv[2]
    process = "--process" in sys.argv
    tags = []
    if "--tags" in sys.argv:
        idx = sys.argv.index("--tags")
        if idx + 1 < len(sys.argv):
            tags = [t.strip() for t in sys.argv[idx + 1].split(",")]
    project_id = None
    if "--project-id" in sys.argv:
        idx = sys.argv.index("--project-id")
        if idx + 1 < len(sys.argv):
            project_id = sys.argv[idx + 1]
    if not project_id:
        project_id = _detect_project_id()

    entities = actions = llm_summary = None
    if process:
        result = extract(content)
        if result:
            entities = result.get("entities")
            actions = result.get("actions")
            llm_summary = result.get("summary")
            if result.get("tags"):
                tags = list(set(tags + result["tags"]))

    r = mem0_backend.add(content, tags=tags, project_id=project_id,
                          entities=entities, actions=actions, llm_summary=llm_summary)
    print(json.dumps(r, ensure_ascii=False))
```

- [ ] **Step 2: 测试 remember --process（无 API Key 降级）**

Run: `python packages/python-cli/src/main.py remember "修复登录页 bug" --process --project-id test`

Expected: 无 API Key 时应降级，仍成功存储（无 entities/actions）

- [ ] **Step 3: 提交**

```bash
git add packages/python-cli/src/main.py
git commit -m "feat: add --process flag to remember command"
```

---

### Task 4: 更新 CLI — recall --process

**Files:**
- Modify: `packages/python-cli/src/main.py`

- [ ] **Step 1: 添加 import 并修改 `cmd_recall()`**

在 main.py 补充 import：
```python
from processor import extract, rerank
```

修改 `cmd_recall()`：
```python
def cmd_recall():
    project_id = _detect_project_id()
    process = "--process" in sys.argv

    results = mem0_backend.search("当前项目上下文", project_id=project_id, limit=10)
    recent = md_backend.get_recent(days=3)

    if process and results:
        reranked = rerank("当前项目上下文", results, top_n=5)
        if reranked:
            results = reranked

    output = {"mem0": results, "recent_sessions": recent}
    tmp = Path.home() / ".agent-memory" / "context.json"
    tmp.parent.mkdir(parents=True, exist_ok=True)
    tmp.write_text(json.dumps(output, ensure_ascii=False, indent=2))
    print(f"Context written to {tmp}")
```

- [ ] **Step 2: 测试 recall --process（无 API Key 降级）**

Run: `python packages/python-cli/src/main.py recall --process`

Expected: 无 API Key 时降级为普通 recall，不报错

- [ ] **Step 3: 提交**

```bash
git add packages/python-cli/src/main.py
git commit -m "feat: add --process flag to recall command"
```

---

### Task 5: 更新 MCP Server — remember/recall 支持 process

**Files:**
- Modify: `packages/mcp-server/src/server.py`

- [ ] **Step 1: 修改 `remember()` MCP 工具**

```python
@mcp.tool()
def remember(
    content: str,
    tags: list[str] = [],
    importance: int = 5,
    auto_verify: bool = False,
    project_id: str | None = None,
    process: bool = False,
) -> dict:
    """记住一条信息。

    Args:
        content: 要记住的内容
        tags: 分类标签
        importance: 重要度 1-10
        auto_verify: 后台 LLM 去噪
        project_id: 项目隔离
        process: 是否用 LLM 提取实体和摘要
    """
    entities = actions = llm_summary = None
    if process:
        from processor import extract
        result = extract(content)
        if result:
            entities = result.get("entities")
            actions = result.get("actions")
            llm_summary = result.get("summary")
            if result.get("tags"):
                tags = list(set(tags + result["tags"]))

    result = mem0_backend.add(content, project_id=project_id, tags=tags,
                               entities=entities, actions=actions, llm_summary=llm_summary)
    audit.log("remember", content_summary=content[:50], backend="mem0", tags=tags, process=process)
    return {"id": result.get("id"), "backend": "mem0", "status": "stored"}
```

- [ ] **Step 2: 修改 `recall()` MCP 工具**

```python
@mcp.tool()
def recall(
    query: str,
    limit: int = 10,
    project_id: str | None = None,
    process: bool = False,
) -> list[dict]:
    """搜索相关记忆。

    Args:
        query: 自然语言查询
        limit: 返回条数
        project_id: 项目隔离
        process: 是否用 LLM 重排序
    """
    target = route(query)
    results = []

    if target == "markdown":
        md_results = md_backend.grep(query)
        results.extend({
            "content": r["content"],
            "date": r["date"],
            "source": "markdown",
            "relevance": 0.8,
        } for r in md_results[:limit])
        mem_results = mem0_backend.search(query, limit=limit // 2)
        results.extend({
            "content": r.get("memory", ""),
            "score": r.get("score", 0),
            "source": "mem0",
        } for r in mem_results)
    else:
        mem_results = mem0_backend.search(query, limit=limit)
        if process and mem_results:
            from processor import rerank
            reranked = rerank(query, mem_results, top_n=5)
            if reranked:
                mem_results = reranked
        results.extend({
            "content": r.get("memory", ""),
            "score": r.get("score", 0),
            "source": "mem0",
        } for r in mem_results)

    audit.log("recall", query_summary=query[:50], backend=target, process=process)
    return results[:limit]
```

- [ ] **Step 3: 提交**

```bash
git add packages/mcp-server/src/server.py
git commit -m "feat: add process param to MCP remember/recall tools"
```

---

### Task 6: 更新 Dashboard API — 支持 process 参数

**Files:**
- Modify: `packages/dashboard/backend/src/routers/memories.py`

- [ ] **Step 1: 添加 process 查询参数**

```python
@router.get("/memories")
def list_memories(q: str = "", project_id: str | None = None, process: bool = False, limit: int = 50):
    if q:
        results = mem0_backend.search(q, project_id=project_id, limit=limit)
        if process and results:
            from processor import rerank
            reranked = rerank(q, results, top_n=limit)
            if reranked:
                results = reranked
    else:
        results = mem0_backend.list_all(project_id=project_id, limit=limit)
    return {"results": results, "total": len(results)}
```

- [ ] **Step 2: 提交**

```bash
git add packages/dashboard/backend/src/routers/memories.py
git commit -m "feat: add process param to /api/memories for LLM reranking"
```

---

### Task 7: 更新 Dashboard 前端 — 显示 entities/摘要

**Files:**
- Modify: `packages/dashboard/frontend/src/pages/Memories.tsx`

- [ ] **Step 1: 表格增加"实体"和"摘要"列**

在 Memories.tsx 的 columns 中添加：

```typescript
{
  title: "实体",
  key: "entities",
  width: 160,
  render: (_: unknown, r: Memory) => {
    const entities = r.metadata?.entities;
    return entities ? entities.split(",").map((e, i) => (
      <Tag key={i} color="blue" style={{ marginBottom: 2 }}>{e.trim()}</Tag>
    )) : null;
  },
},
```

同时修改"内容"列优先显示摘要：

```typescript
{
  title: "内容",
  dataIndex: "memory",
  key: "memory",
  render: (t: string, r: Memory) => {
    const display = r.metadata?.llm_summary || t;
    return display?.slice(0, 80);
  },
},
```

- [ ] **Step 2: 确认前端编译通过**

Run: `cd packages/dashboard/frontend && npx tsc --noEmit`

Expected: 无类型错误

- [ ] **Step 3: 提交**

```bash
git add packages/dashboard/frontend/src/pages/Memories.tsx
git commit -m "feat: show entities and LLM summary in dashboard"
```
