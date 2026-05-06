# guardrails-git.ps1
# PreToolUse hook for Bash
# Blocks dangerous git commands that could cause data loss.
# Install in .claude/settings.json -> hooks.PreToolUse[].matcher=Bash
#
# Receives JSON on stdin: {"tool_name":"Bash","tool_input":{"command":"..."}}
# Returns decisions via stdout JSON.

$inputJson = [Console]::In.ReadToEnd()
if (-not $inputJson) { return }

try {
    $payload = $inputJson | ConvertFrom-Json
} catch {
    return
}

$command = $payload.tool_input.command
if (-not $command) { return }

# Dangerous git patterns — block these outright
$dangerous = @(
    'git push --force(?![-\w])',
    'git push -f(?![-\w])',
    'git reset --hard(?![-\w])',
    'git clean -fd(?![-\w])',
    'git clean -df(?![-\w])',
    'git branch -D(?![-\w])',
    'git checkout \.',
    'git checkout --',
    'git restore \.',
    'git restore --staged \.',
    'git rebase --skip(?![-\w])',
    'git merge --abort(?![-\w])'
)

foreach ($pattern in $dangerous) {
    if ($command -match $pattern) {
        $result = @{
            hookSpecificOutput = @{
                hookEventName = "PreToolUse"
                permissionDecision = "deny"
                permissionDecisionReason = "DANGEROUS GIT COMMAND BLOCKED by guardrails: $pattern. Use with extreme caution — override in settings.local.json if intentional."
            }
        }
        Write-Output ($result | ConvertTo-Json -Compress)
        return
    }
}

# Allow everything else (return nothing = proceed normally)
