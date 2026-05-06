#!/usr/bin/env bash
# guardrails-git.sh
# PreToolUse hook for Bash (Unix/macOS/Git Bash)
# Blocks dangerous git commands that could cause data loss.
# Install in .claude/settings.json -> hooks.PreToolUse[].matcher=Bash
#
# Receives JSON on stdin: {"tool_name":"Bash","tool_input":{"command":"..."}}
# Returns decisions via stdout JSON.
set -euo pipefail

# Read stdin
input=$(cat)
[ -z "$input" ] && exit 0

# Extract command field using minimal parsing (no jq dependency)
command=$(echo "$input" | grep -o '"command"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/"command"[[:space:]]*:[[:space:]]*"//;s/"$//')
[ -z "$command" ] && exit 0

# Dangerous git patterns — block these outright
dangerous=(
  'git push --force([^-]|$)'
  'git push -f([^-]|$)'
  'git reset --hard([^-]|$)'
  'git clean -fd([^-]|$)'
  'git clean -df([^-]|$)'
  'git branch -D([^-]|$)'
  'git checkout \.'
  'git checkout --'
  'git restore \.'
  'git restore --staged \.'
  'git rebase --skip([^-]|$)'
  'git merge --abort([^-]|$)'
)

for pattern in "${dangerous[@]}"; do
  if echo "$command" | grep -Eq "$pattern"; then
    printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"DANGEROUS GIT COMMAND BLOCKED by guardrails: %s. Use with extreme caution — override in settings.local.json if intentional."}}' "$pattern"
    exit 0
  fi
done

# Allow everything else (return nothing = proceed normally)
exit 0
