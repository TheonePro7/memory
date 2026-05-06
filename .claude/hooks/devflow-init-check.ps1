# devflow-init-check.ps1
# Claude Code SessionStart hook
# Checks if devflow Phase 3 has been initialized in this project.
# Output: structured JSON for Claude context injection.
# SKILL.md handles the actual auto-install logic — this hook just detects state.

$ErrorActionPreference = "Stop"

# Check project initialization state (tools + dirs)
$bdOk = $null -ne (Get-Command "bd" -ErrorAction SilentlyContinue) -and (Test-Path (Join-Path (Get-Location) ".beads"))
$gitnexusOk = $null -ne (Get-Command "gitnexus" -ErrorAction SilentlyContinue) -and (Test-Path (Join-Path (Get-Location) ".gitnexus"))

if (-not ($bdOk -and $gitnexusOk)) {
    $output = @{
        systemMessage = "devflow: Phase 3 auto-setup in progress..."
        hookSpecificOutput = @{
            hookEventName = "SessionStart"
            additionalContext = "devflow Phase 3 pending — auto-installing tools and initializing project."
        }
    }
    Write-Output ($output | ConvertTo-Json -Compress)
} else {
    $output = @{
        hookSpecificOutput = @{
            hookEventName = "SessionStart"
            additionalContext = "devflow Phase 3 ready — beads + gitnexus + autoresearch initialized. devflow 5-phase orchestrator available."
        }
    }
    Write-Output ($output | ConvertTo-Json -Compress)
}
