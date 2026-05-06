#!/usr/bin/env bash
# devflow-phase-check.sh
# PreToolUse hook for Edit|Write — checks devflow phase before code changes.
set -euo pipefail

PROJECT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || echo ".")
STATE_FILE="$PROJECT_ROOT/.devflow/state"

if [ ! -f "$STATE_FILE" ]; then
    cat <<'JSON'
{"systemMessage": "⚙️ devflow: .devflow/state 不存在，请先运行 setup 完成初始化。", "continue": true}
JSON
    exit 0
fi

PHASE=$(jq -r '.phase // "0"' "$STATE_FILE")
STEP=$(jq -r '.step // ""' "$STATE_FILE")
FEATURE=$(jq -r '.feature // ""' "$STATE_FILE")
GATE_PROBE=$(jq -r '.gate_probe // ""' "$STATE_FILE")
GATE_SCENARIO=$(jq -r '.gate_scenario // ""' "$STATE_FILE")
GATE_SECURITY=$(jq -r '.gate_security // ""' "$STATE_FILE")

# Read the file being edited from stdin
FILE_PATH=$(jq -r '.tool_input.file_path // ""')

# Only check for code files (exclude .devflow/, .claude/, docs/)
if [ "$PHASE" = "1" ] || [ "$PHASE" = "2" ]; then
    # Phase 1 — code editing is not allowed
    # Phase 2 — frontend code generation is allowed (Stage 3)
    if [ "$PHASE" = "1" ] && echo "$FILE_PATH" | grep -qE '\.(js|ts|py|go|rs|rb|php|c|cpp|h|hpp|java|kt|swift)$'; then
        cat <<JSON
{"systemMessage": "⚠️ devflow 流程提醒: 当前 Phase 1（$STEP），需求梳理阶段不应直接写代码。请先完成 Phase 1 输出 PRD。", "continue": true}
JSON
        exit 0
    fi
fi

# Check for skipping steps — if in Phase 4 but jumping to implementation without plan
if [ "$PHASE" -eq 4 ] && [ "$STEP" = "brainstorming" ]; then
    if echo "$FILE_PATH" | grep -qE '\.(js|ts|py|go)$'; then
        cat <<JSON
{"systemMessage": "⚠️ devflow 流程提醒: 当前在 brainstorming 阶段，直接写代码会跳过 grill → plans → scenario 等步骤。请完成当前阶段后再开始实现。", "continue": true}
JSON
        exit 0
    fi
fi

# Phase 4 autoresearch gate hard-blocking
if [ "$PHASE" -eq 4 ]; then
    # Allow edits to state file itself
    if echo "$FILE_PATH" | grep -qE '\.devflow/state$|\.devflow\\state$'; then
        echo '{"continue": true}'
        exit 0
    fi

    # Only check code file edits
    if echo "$FILE_PATH" | grep -qE '\.(js|ts|py|go|rs|rb|php|c|cpp|h|hpp|java|kt|swift)$'; then
        GATES_EXIST=false
        [ -n "$GATE_PROBE" ] && GATES_EXIST=true

        # gate_probe check: step=plans requires probe done
        if [ "$STEP" = "plans" ] && [ "$GATES_EXIST" = true ] && [ "$GATE_PROBE" != "done" ] && [ "$GATE_PROBE" != "skipped" ]; then
            cat <<'JSON'
{"systemMessage": "⛔ devflow 门禁拦截: 必须先运行 $autoresearch probe 才能进入 writing-plans 阶段。完成后设置 .devflow/state 中 gate_probe=done。", "continue": false, "stopReason": "autoresearch:probe gate not passed"}
JSON
            exit 0
        fi

        # gate_probe check: step=impl also requires probe done
        if [ "$STEP" = "impl" ] && [ "$GATES_EXIST" = true ] && [ "$GATE_PROBE" != "done" ] && [ "$GATE_PROBE" != "skipped" ]; then
            cat <<'JSON'
{"systemMessage": "⛔ devflow 门禁拦截: gate_probe 未完成。必须先运行 $autoresearch probe 才能开始实现。或设置 gate_probe=skipped 跳过。", "continue": false, "stopReason": "autoresearch:probe gate not passed"}
JSON
            exit 0
        fi

        # gate_scenario check: step=impl requires scenario done
        if [ "$STEP" = "impl" ] && [ "$GATES_EXIST" = true ] && [ "$GATE_SCENARIO" != "done" ] && [ "$GATE_SCENARIO" != "skipped" ]; then
            cat <<'JSON'
{"systemMessage": "⛔ devflow 门禁拦截: 必须先运行 $autoresearch scenario 才能开始实现。完成后设置 .devflow/state 中 gate_scenario=done。", "continue": false, "stopReason": "autoresearch:scenario gate not passed"}
JSON
            exit 0
        fi

        # gate_security check: step=finish requires security done
        if [ "$STEP" = "finish" ] && [ "$GATES_EXIST" = true ] && [ "$GATE_SECURITY" != "done" ] && [ "$GATE_SECURITY" != "skipped" ]; then
            cat <<'JSON'
{"systemMessage": "⛔ devflow 门禁拦截: 必须先运行 $autoresearch security --diff 才能完成分支。完成后设置 .devflow/state 中 gate_security=done。", "continue": false, "stopReason": "autoresearch:security gate not passed"}
JSON
            exit 0
        fi
    fi
fi

# All good — no message needed
echo '{"continue": true}'
