# devflow-phase-check.ps1
# PreToolUse hook for Edit|Write — checks devflow phase before code changes.

$projectRoot = & git rev-parse --show-toplevel 2>$null
if (-not $projectRoot) { $projectRoot = "." }

$stateFile = Join-Path $projectRoot ".devflow" "state"

if (-not (Test-Path $stateFile)) {
    @{
        systemMessage = "⚙️ devflow: .devflow/state 不存在，请先运行 setup 完成初始化。"
        continue = $true
    } | ConvertTo-Json -Compress
    exit 0
}

try {
    $state = Get-Content $stateFile -Raw | ConvertFrom-Json
    $phaseRaw = $state.phase  # Keep as original type (int or float)
    $step = $state.step
    $feature = $state.feature
} catch {
    @{
        systemMessage = "⚙️ devflow: state 文件解析失败。"
        continue = $true
    } | ConvertTo-Json -Compress
    exit 0
}

# Read stdin JSON to get the file being edited
try {
    $inputJson = @($input) -join "`n"
    if (-not [string]::IsNullOrEmpty($inputJson)) {
        $hookInput = $inputJson | ConvertFrom-Json
        $filePath = $hookInput.tool_input.file_path
    }
} catch {
    $filePath = ""
}

# Phase 1 (Ideate) or Phase 2 (Design) — check if editing code files
if ($phaseRaw -eq 1 -or $phaseRaw -eq 2) {
    if (-not [string]::IsNullOrEmpty($filePath) -and $filePath -match '\.(js|ts|py|go|rs|rb|php|c|cpp|h|hpp|java|kt|swift)$') {
        if ($phaseRaw -eq 1) {
            @{
                systemMessage = "⚠️ devflow 流程提醒: 当前 Phase 1（$step），需求梳理阶段不应直接写代码。请先完成 Phase 1 输出 PRD。"
                continue = $true
            } | ConvertTo-Json -Compress
            exit 0
        }
        # phaseRaw == 2 — frontend code generation is normal for Phase 2 Stage 3
    }
}

# Phase 4 brainstorming — check if jumping to code
if ($phaseRaw -eq 4 -and $step -eq "brainstorming" -and -not [string]::IsNullOrEmpty($filePath)) {
    if ($filePath -match '\.(js|ts|py|go)$') {
        @{
            systemMessage = "⚠️ devflow 流程提醒: 当前在 brainstorming 阶段，直接写代码会跳过 grill → plans → scenario 等步骤。请完成当前阶段后再开始实现。"
            continue = $true
        } | ConvertTo-Json -Compress
        exit 0
    }
}

# Phase 4 autoresearch gate hard-blocking
if ($phaseRaw -eq 4) {
    # Allow edits to state file itself (needed to update gates)
    if (-not [string]::IsNullOrEmpty($filePath) -and $filePath -match '\.devflow[\\/]state$') {
        @{ continue = $true } | ConvertTo-Json -Compress
        exit 0
    }

    # Only check code file edits (not config, docs, etc.)
    if (-not [string]::IsNullOrEmpty($filePath) -and $filePath -match '\.(js|ts|py|go|rs|rb|php|c|cpp|h|hpp|java|kt|swift)$') {
        $gatesExist = $null -ne $state.gate_probe

        # gate_probe check: step=plans requires probe done
        if ($step -eq "plans" -and $gatesExist -and $state.gate_probe -ne "done") {
            $msg = if ($state.gate_probe -eq "skipped") { $null } else { "⛔ devflow 门禁拦截: 必须先运行 `$autoresearch probe` 才能进入 writing-plans 阶段。完成后设置 .devflow/state 中 gate_probe=done。" }
            if ($msg) {
                @{ systemMessage = $msg; continue = $false; stopReason = "autoresearch:probe gate not passed" } | ConvertTo-Json -Compress
                exit 0
            }
        }

        # gate_probe check: step=impl requires probe done (in case step was set directly)
        if ($step -eq "impl" -and $gatesExist -and $state.gate_probe -ne "done" -and $state.gate_probe -ne "skipped") {
            @{
                systemMessage = "⛔ devflow 门禁拦截: gate_probe 未完成。必须先运行 `$autoresearch probe` 才能开始实现。或设置 gate_probe=skipped 跳过。"
                continue = $false; stopReason = "autoresearch:probe gate not passed"
            } | ConvertTo-Json -Compress
            exit 0
        }

        # gate_scenario check: step=impl requires scenario done
        if ($step -eq "impl" -and $gatesExist -and $state.gate_scenario -ne "done" -and $state.gate_scenario -ne "skipped") {
            @{
                systemMessage = "⛔ devflow 门禁拦截: 必须先运行 `$autoresearch scenario` 才能开始实现。完成后设置 .devflow/state 中 gate_scenario=done。"
                continue = $false; stopReason = "autoresearch:scenario gate not passed"
            } | ConvertTo-Json -Compress
            exit 0
        }

        # gate_security check: step=finish requires security done
        if ($step -eq "finish" -and $gatesExist -and $state.gate_security -ne "done" -and $state.gate_security -ne "skipped") {
            @{
                systemMessage = "⛔ devflow 门禁拦截: 必须先运行 `$autoresearch security --diff` 才能完成分支。完成后设置 .devflow/state 中 gate_security=done。"
                continue = $false; stopReason = "autoresearch:security gate not passed"
            } | ConvertTo-Json -Compress
            exit 0
        }
    }
}

# All good
@{ continue = $true } | ConvertTo-Json -Compress
