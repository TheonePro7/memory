"Agent 记忆系统 Hook CLI — 通过 shell 命令供 Hook 调用"""

import sys
import json
import subprocess
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent / "mcp-server" / "src"))
from backends import mem0_backend, md_backend
from processor import extract, rerank


def _detect_project_id() -> str:
    """从 git root 目录名推断项目标识符，非 git 目录回退到 CWD 名。"""
    try:
        root = subprocess.check_output(
            ["git", "rev-parse", "--show-toplevel"],
            stderr=subprocess.DEVNULL, text=True,
        ).strip()
        return Path(root).name
    except Exception:
        return Path.cwd().name


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


def cmd_summarize():
    ctx_file = Path.home() / ".agent-memory" / "current_session.txt"
    if not ctx_file.exists():
        print("No session context found", file=sys.stderr)
        return
    text = ctx_file.read_text(encoding="utf-8")
    from summarize import generate_summary
    result = generate_summary(text)
    md_backend.append_summary(result["summary"])
    project_id = _detect_project_id()
    for fact in result.get("facts", []):
        mem0_backend.add(fact, tags=["auto-extracted"], project_id=project_id)
    print(f"Summary written: {result['summary'][:100]}...")


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


def main():
    if len(sys.argv) < 2:
        print("Usage: agent-memory remember|recall|summarize", file=sys.stderr)
        sys.exit(1)
    cmd = sys.argv[1]
    if cmd == "remember":
        cmd_remember()
    elif cmd == "recall":
        cmd_recall()
    elif cmd == "summarize":
        cmd_summarize()
    else:
        print(f"Unknown command: {cmd}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
