"""LLM 记忆加工：实体提取 + 搜索重排序"""

import os
import json
import logging
import httpx

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
    resp.raise_for_status()
    return resp.json()


def _call_openai(prompt: str) -> dict:
    resp = httpx.post(
        "https://api.openai.com/v1/chat/completions",
        headers={
            "authorization": f"Bearer {os.environ['OPENAI_API_KEY']}",
            "content-type": "application/json",
        },
        json={
            "model": os.environ.get("PROCESSOR_MODEL", "gpt-4o-mini"),
            "max_tokens": 512,
            "messages": [{"role": "user", "content": prompt}],
        },
        timeout=15,
    )
    resp.raise_for_status()
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
