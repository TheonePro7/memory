"Agent 记忆系统 Hook CLI — 通过 shell 命令供 Hook 调用"""

import sys
import json
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent / "mcp-server" / "src"))
from backends import mem0_backend, md_backend


def cmd_recall():
    results = mem0_backend.search("当前项目上下文", limit=5)
    recent = md_backend.get_recent(days=3)
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
    for fact in result.get("facts", []):
        mem0_backend.add(fact, tags=["auto-extracted"])
    print(f"Summary written: {result['summary'][:100]}...")


def main():
    if len(sys.argv) < 2:
        print("Usage: agent-memory recall|summarize", file=sys.stderr)
        sys.exit(1)
    cmd = sys.argv[1]
    if cmd == "recall":
        cmd_recall()
    elif cmd == "summarize":
        cmd_summarize()
    else:
        print(f"Unknown command: {cmd}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
