"""会话摘要生成"""

import os
import json
import logging
import httpx

logger = logging.getLogger(__name__)


def generate_summary(conversation_text: str) -> dict:
    api_key = os.environ.get("ANTHROPIC_API_KEY") or os.environ.get("OPENAI_API_KEY")
    if not api_key:
        return _fallback(conversation_text)
    try:
        if os.environ.get("ANTHROPIC_API_KEY"):
            return _with_claude(conversation_text)
        return _with_openai(conversation_text)
    except Exception:
        logger.exception("LLM summarize failed, falling back to truncation")
        return _fallback(conversation_text)


def _fallback(text: str) -> dict:
    return {
        "summary": text[:2000] if len(text) > 2000 else text,
        "facts": [],
        "task_completed": False,
        "model": "fallback-truncation",
    }


def _with_claude(text: str) -> dict:
    try:
        resp = httpx.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": os.environ["ANTHROPIC_API_KEY"],
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json={
                "model": os.environ.get("SUMMARY_MODEL", "claude-sonnet-4-20250506"),
                "max_tokens": 1024,
                "messages": [{
                    "role": "user",
                    "content": f"为以下编码会话生成结构化摘要，并判断会话是否完成了某个任务。"
                               f"输出 JSON: {{\"summary\": \"...\", \"facts\": [\"...\"], \"task_completed\": true/false}}\n\n{text[:16000]}",
                }],
            },
            timeout=30,
        )
        resp.raise_for_status()
        return _parse_llm_response(resp.json())
    except httpx.HTTPStatusError as e:
        logger.warning("Anthropic API returned %s: %s", e.response.status_code, e.response.text[:200])
        raise
    except httpx.TimeoutException:
        logger.warning("Anthropic API timeout (30s)")
        raise


def _with_openai(text: str) -> dict:
    try:
        resp = httpx.post(
            "https://api.openai.com/v1/chat/completions",
            headers={
                "authorization": f"Bearer {os.environ['OPENAI_API_KEY']}",
                "content-type": "application/json",
            },
            json={
                "model": "gpt-4o-mini",
                "max_tokens": 1024,
                "messages": [{
                    "role": "user",
                    "content": f"为以下编码会话生成结构化摘要，并判断会话是否完成了某个任务。"
                               f"输出 JSON: {{\"summary\": \"...\", \"facts\": [\"...\"], \"task_completed\": true/false}}\n\n{text[:16000]}",
                }],
            },
            timeout=30,
        )
        resp.raise_for_status()
        return _parse_llm_response(resp.json())
    except httpx.HTTPStatusError as e:
        logger.warning("OpenAI API returned %s: %s", e.response.status_code, e.response.text[:200])
        raise
    except httpx.TimeoutException:
        logger.warning("OpenAI API timeout (30s)")
        raise


def _parse_llm_response(data: dict) -> dict:
    try:
        content = (
            data.get("content", [{}])[0].get("text", "")
            if "content" in data
            else data.get("choices", [{}])[0].get("message", {}).get("content", "")
        )
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0]
        elif "```" in content:
            content = content.split("```")[1].split("```")[0]
        result = json.loads(content.strip())
        return {
            "summary": result.get("summary", content[:500]),
            "facts": result.get("facts", []),
            "task_completed": result.get("task_completed", False),
            "model": "llm",
        }
    except (json.JSONDecodeError, KeyError, IndexError):
        return _fallback(content[:500] if content else "summary unavailable")
