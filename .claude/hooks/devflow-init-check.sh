#!/usr/bin/env bash
# devflow-init-check.sh
# Claude Code SessionStart hook (bash/Unix/macOS)
# Checks if devflow Phase 1 has been initialized in this project.
# SKILL.md handles the actual auto-install logic — this hook just detects state.
set -euo pipefail

# Check project initialization state (tools + dirs)
bd_ok=0
command -v bd &>/dev/null && [ -d .beads ] && bd_ok=1

gitnexus_ok=0
command -v gitnexus &>/dev/null && [ -d .gitnexus ] && gitnexus_ok=1

if [ "$bd_ok" -ne 1 ] || [ "$gitnexus_ok" -ne 1 ]; then
  printf '{"systemMessage":"devflow: Phase 1 auto-setup in progress...","hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"devflow Phase 1 pending — auto-installing tools and initializing project."}}'
else
  printf '{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"devflow Phase 1 ready — beads + gitnexus + autoresearch initialized. devflow 3-phase orchestrator available."}}'
fi

exit 0
