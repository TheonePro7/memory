"""Agent 记忆系统 Hook CLI — 通过 shell 命令供 Hook 调用"""

import os
import sys
import json
from pathlib import Path

from agent_memory_mcp.backends import mem0_backend, md_backend
from agent_memory_mcp.core import recall as core_recall, remember as core_remember, summarize as core_summarize, detect_project_id


def cmd_recall():
    project_id = detect_project_id()
    process = "--process" in sys.argv

    # 使用 core.recall() 进行记忆搜索（包括重排序）
    results = core_recall("当前项目上下文", project_id=project_id, limit=10, process=process)
    recent = md_backend.get_recent(days=3)

    # 同步 beads + 获取活跃任务
    from agent_memory_mcp.backends.task_backend import sync_beads, get_active_tasks
    sync_beads(project_id)
    active_tasks = get_active_tasks(project_id=project_id)

    output = {"mem0": results, "recent_sessions": recent, "active_tasks": active_tasks}
    pid = os.getpid()
    tmp = Path.home() / ".agent-memory" / f"context.{pid}.json"
    tmp.parent.mkdir(parents=True, exist_ok=True)
    tmp.write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Context written to {tmp}")
    if active_tasks:
        for t in active_tasks:
            print(f"  活跃: [{t['status']}] {t['title']}")


def cmd_summarize():
    ctx_file = Path.home() / ".agent-memory" / "current_session.txt"
    if not ctx_file.exists():
        print("No session context found", file=sys.stderr)
        return
    text = ctx_file.read_text(encoding="utf-8")
    project_id = detect_project_id()

    # 使用 core.summarize() 进行核心总结（LLM + 持久化 + 事实提取 + beads 同步）
    result = core_summarize(text, project_id=project_id)

    # 任务关联：使用 LLM 判断的任务完成状态
    from agent_memory_mcp.backends.task_backend import get_active_tasks, add_event
    if result.get("task_completed"):
        active = get_active_tasks(project_id=project_id)
        for t in active:
            if t["status"] == "in_progress":
                add_event(t["id"], "note",
                          f"会话摘要关联: {result['summary'][:100]}")
                print(f"  更新任务: {t['title']}")
                break

    print(f"Summary written: {result['summary'][:100]}...")


def cmd_task():
    """task 子命令: agent-memory task list|show|start|done|block"""
    if len(sys.argv) < 3:
        _print_task_usage()
        sys.exit(1)
    sub = sys.argv[2]
    from agent_memory_mcp.backends.task_backend import (
        create_task, list_tasks, get_task,
        update_status, add_event, add_artifact,
        sync_beads, get_active_tasks, detect_beads,
    )
    pid = detect_project_id()

    if sub == "list":
        status = None
        if "--status" in sys.argv:
            idx = sys.argv.index("--status")
            if idx + 1 < len(sys.argv):
                status = sys.argv[idx + 1]
        tasks = list_tasks(project_id=pid, status=status)
        if not tasks:
            print("没有任务")
            return
        for t in tasks:
            src = "B" if t["source"] == "beads" else "M"
            print(f"  [{t['status']:12}] {src} {t['id'][:8]} {t['title']}")
        print(f"\n共 {len(tasks)} 个任务")

    elif sub == "show":
        if len(sys.argv) < 4:
            print("用法: agent-memory task show <id>", file=sys.stderr)
            sys.exit(1)
        t = get_task(sys.argv[3])
        if not t:
            print("任务不存在")
            return
        src_label = "beads" if t["source"] == "beads" else "agent-memory"
        print(f"标题:   {t['title']}")
        print(f"状态:   {t['status']}")
        print(f"来源:   {src_label}")
        print(f"标签:   {', '.join(t['tags']) if t['tags'] else '-'}")
        if t["events"]:
            print(f"\n事件 ({len(t['events'])}):")
            for e in t["events"]:
                print(f"  [{e['type']}] {e['content']}  ({e['created_at'][:16]})")
        if t["artifacts"]:
            print(f"\n产出物 ({len(t['artifacts'])}):")
            for a in t["artifacts"]:
                print(f"  {a['kind']}: {a['reference']}")

    elif sub == "start":
        if len(sys.argv) < 4:
            print("用法: agent-memory task start <标题>", file=sys.stderr)
            sys.exit(1)
        title = sys.argv[3]
        t = create_task(title=title, project_id=pid)
        update_status(t["id"], "in_progress")
        print(f"任务已创建并开始: {t['id'][:8]} {title}")

    elif sub == "done":
        if len(sys.argv) < 4:
            active = get_active_tasks(project_id=pid)
            if not active:
                print("没有进行中的任务", file=sys.stderr)
                sys.exit(1)
            t = active[0]
        else:
            t = get_task(sys.argv[3])
        if not t:
            print("任务不存在", file=sys.stderr)
            sys.exit(1)
        update_status(t["id"], "done")
        print(f"任务已完成: {t['title']}")

    elif sub == "block":
        if len(sys.argv) < 5:
            print("用法: agent-memory task block <id> <原因>", file=sys.stderr)
            sys.exit(1)
        tid = sys.argv[3]
        reason = sys.argv[4]
        update_status(tid, "blocked")
        add_event(tid, "blocker", reason)
        print(f"任务已阻塞: {reason}")

    else:
        _print_task_usage()


def _print_task_usage():
    print("用法: agent-memory task list|show|start|done|block", file=sys.stderr)
    print("  list                   列出任务", file=sys.stderr)
    print("  show <id>              任务详情", file=sys.stderr)
    print("  start <标题>            开始新任务", file=sys.stderr)
    print("  done [id]              完成任务（无id则完成当前活跃任务）", file=sys.stderr)
    print("  block <id> <原因>       阻塞任务", file=sys.stderr)


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
        project_id = detect_project_id()

    # 使用 core.remember() 进行记忆存储（包括可选的 LLM 加工）
    r = core_remember(content, tags=tags, project_id=project_id, process=process)
    print(json.dumps(r, ensure_ascii=False))


def main():
    if len(sys.argv) < 2:
        print("Usage: agent-memory remember|recall|summarize|task", file=sys.stderr)
        sys.exit(1)
    cmd = sys.argv[1]
    if cmd == "remember":
        cmd_remember()
    elif cmd == "recall":
        cmd_recall()
    elif cmd == "summarize":
        cmd_summarize()
    elif cmd == "task":
        cmd_task()
    else:
        print(f"Unknown command: {cmd}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
