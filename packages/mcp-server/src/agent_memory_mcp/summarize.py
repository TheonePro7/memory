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
    # 结构化摘要：去重、归类、提取关键点
    lines = [l.strip() for l in text.split("\n") if l.strip()]
    # 去除重复行（保留顺序）
    seen = set()
    unique_lines = []
    for line in lines:
        if line not in seen:
            seen.add(line)
            unique_lines.append(line)

    # 按类别归类
    categories = {"任务": [], "决策": [], "配置": [], "总结": [], "其他": []}
    for line in unique_lines:
        lowered = line.lower()
        if any(kw in line for kw in ("任务", "issue", "bug", "修复", "功能", "beads", "devflow")):
            categories["任务"].append(line)
        elif any(kw in line for kw in ("决策", "方案", "选择", "改用", "迁移")):
            categories["决策"].append(line)
        elif any(kw in line for kw in ("配置", "安装", "部署", "路径", "端口", "hook")):
            categories["配置"].append(line)
        elif any(kw in line for kw in ("日报", "总结", "完成", "验证")):
            categories["总结"].append(line)
        else:
            categories["其他"].append(line)

    # 构建结构化摘要
    parts = []
    for cat, items in categories.items():
        if items:
            # 去重后取前 5 条，每条不超过 200 字
            deduped = list(dict.fromkeys(items))[:5]
            truncated = [item[:200] for item in deduped]
            parts.append(f"【{cat}】\n" + "\n".join(f"- {t}" for t in truncated))

    summary = "\n\n".join(parts) if parts else text[:500]
    if len(summary) > 2000:
        summary = summary[:2000]

    # facts：只提取最关键的少量事实，避免冗余存储
    key_facts = categories["任务"][:2] + categories["决策"][:1] + categories["配置"][:1]
    if not key_facts and categories["其他"]:
        key_facts = [categories["其他"][0]]
    # 单条事实不超过 200 字
    key_facts = [f[:200] for f in key_facts[:3]]

    return {
        "summary": summary,
        "facts": key_facts,
        "task_completed": False,
        "model": "fallback-structured",
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
