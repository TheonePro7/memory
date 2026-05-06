# v0.4 TypeScript CLI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 发布 `@agent-memory/init` npm 包，用户一行命令激活 Agent 记忆

**Architecture:** 纯 TypeScript CLI，install 流程分 5 步（检测→安装依赖→写 MCP 配置→写 hooks→更新 CLAUDE.md），每步错误独立隔离不阻断后续。

**Tech Stack:** TypeScript 5.5+, Node.js 18+, execa (子进程), Python 3.10+

**Files:**
- Modify: `packages/cli/src/utils.ts`
- Modify: `packages/cli/src/install.ts`
- Modify: `packages/cli/src/remove.ts`
- Modify: `packages/cli/src/index.ts`
- Modify: `packages/cli/package.json`
- Create: `packages/cli/tests/install.test.ts`
- Create: `packages/cli/src/vendor/requirements.txt`

---

### Task 1: 重写 utils.ts — 路径 / exec / 配置写入

**Files:**
- Modify: `packages/cli/src/utils.ts`
- Create: `packages/cli/tests/utils.test.ts`

- [ ] **Step 1: 编写 utils 测试**

```typescript
import { describe, it, expect } from "vitest";
import { resolveTargetDir, ensureDir } from "../src/utils";

describe("resolveTargetDir", () => {
  it("should return CWD when no arg given", () => {
    const result = resolveTargetDir([]);
    expect(result).toBe(process.cwd());
  });

  it("should return the provided path when arg given", () => {
    const result = resolveTargetDir(["/some/path"]);
    expect(result).toBe("/some/path");
  });
});

describe("ensureDir", () => {
  it("should create directory if not exists", () => {
    const tmp = "/tmp/test-agent-memory-" + Date.now();
    ensureDir(tmp);
    expect(existsSync(tmp)).toBe(true);
    rmdirSync(tmp);
  });
});
```

- [ ] **Step 2: 运行测试验证失败**

Run: `cd packages/cli && npx vitest run tests/utils.test.ts`
Expected: FAIL — `resolveTargetDir` / `ensureDir` 未定义

- [ ] **Step 3: 写入完整的 utils.ts**

```typescript
import { execSync } from "child_process";
import { existsSync, mkdirSync, writeFileSync, readFileSync, appendFileSync } from "fs";
import { homedir } from "os";
import { join, resolve } from "path";

export interface InstallResult {
  success: boolean;
  warnings: string[];
  mcpMode: "pypi" | "local" | "manual";
}

export function resolveTargetDir(argv: string[]): string {
  const pathArg = argv.find((a) => !a.startsWith("-"));
  return pathArg ? resolve(pathArg) : process.cwd();
}

export function ensureDir(dir: string): void {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

export function hasDryRun(argv: string[]): boolean {
  return argv.includes("--dry-run");
}

export function detectPython(): { ok: boolean; version: string; pipCmd: string } {
  try {
    const out = execSync("python3 --version", { encoding: "utf-8", stdio: "pipe" }).trim();
    const match = out.match(/Python (\d+\.\d+)/);
    if (!match) return { ok: false, version: "unknown", pipCmd: "" };
    const version = parseFloat(match[1]);
    const pipCmd = version >= 3.12 ? "python3 -m pip" : "pip3";
    return { ok: version >= 3.10, version: match[1], pipCmd };
  } catch {
    return { ok: false, version: "unknown", pipCmd: "" };
  }
}

export function pipInstall(pipCmd: string, pkg: string): boolean {
  try {
    execSync(`${pipCmd} install ${pkg}`, { stdio: "pipe", timeout: 120_000 });
    return true;
  } catch {
    return false;
  }
}

export function pipInstallRequirements(pipCmd: string, reqPath: string): boolean {
  try {
    execSync(`${pipCmd} install -r "${reqPath}"`, { stdio: "pipe", timeout: 120_000 });
    return true;
  } catch {
    return false;
  }
}

export function writeSettingsJson(targetDir: string, mcpArgs: string[]): void {
  const claudeDir = join(targetDir, ".claude");
  ensureDir(claudeDir);
  const path = join(claudeDir, "settings.local.json");

  let existing: Record<string, any> = {};
  if (existsSync(path)) {
    try { existing = JSON.parse(readFileSync(path, "utf-8")); } catch { /* ok */ }
  }

  const merged = {
    ...existing,
    mcpServers: {
      ...(existing.mcpServers || {}),
      "agent-memory": {
        command: "python",
        args: mcpArgs,
      },
    },
  };

  writeFileSync(path, JSON.stringify(merged, null, 2) + "\n", "utf-8");
}

export function writeHooksJson(targetDir: string): void {
  const claudeDir = join(targetDir, ".claude");
  ensureDir(claudeDir);
  const path = join(claudeDir, "hooks.json");

  let existing: Record<string, string[]> = {};
  if (existsSync(path)) {
    try { existing = JSON.parse(readFileSync(path, "utf-8")); } catch { /* ok */ }
  }

  const hooks: Record<string, string[]> = {
    onSessionStart: ["agent-memory recall"],
    onSessionEnd: ["agent-memory summarize"],
  };

  const merged: Record<string, string[]> = {};
  const allKeys = new Set([...Object.keys(existing), ...Object.keys(hooks)]);
  for (const key of allKeys) {
    const existingCmds = existing[key] || [];
    const newCmds = hooks[key as keyof typeof hooks] || [];
    merged[key] = [...new Set([...existingCmds, ...newCmds])];
  }

  writeFileSync(path, JSON.stringify(merged, null, 2) + "\n", "utf-8");
}

export function writeAgentMemoryConfig(targetDir: string): void {
  const cfgDir = join(homedir(), ".agent-memory");
  ensureDir(cfgDir);
  const path = join(cfgDir, "config.yaml");
  const projectName = targetDir.split(/[/\\]/).pop() || "default";
  const config = [
    `user_id: default`,
    `project_id: ${projectName}`,
    `memory_dir: ${join(homedir(), ".agent-memory")}`,
    `chroma_dir: ${join(homedir(), ".agent-memory", "chroma")}`,
    "",
    `llm:`,
    `  provider: auto`,
    `  api_key_env: ANTHROPIC_API_KEY`,
    "",
    `mcp:`,
    `  transport: stdio`,
    `  port: 8710`,
  ].join("\n");
  writeFileSync(path, config, "utf-8");
}

export function updateClaudeMd(targetDir: string): void {
  const path = join(targetDir, "CLAUDE.md");
  const section = [
    "",
    "## 记忆系统",
    "",
    "你拥有持久记忆能力。当用户说\"记住\"\"注意\"\"以后要知道\"等时，主动调用 `remember()` MCP 工具。",
    "会话结束时系统会自动 summarize，不需要你手动操作。",
    "",
  ].join("\n");

  if (!existsSync(path)) {
    writeFileSync(path, section, "utf-8");
    return;
  }

  const content = readFileSync(path, "utf-8");
  if (!content.includes("## 记忆系统")) {
    appendFileSync(path, section, "utf-8");
  }
}

export function copyVendorMcpServer(targetDir: string): string {
  const vendorDir = join(__dirname, "..", "vendor");
  const destDir = join(targetDir, ".agent-memory", "mcp-server");
  ensureDir(destDir);

  // 简易方式：只复制 requirements.txt，安装时让 pip 拉
  const reqSrc = join(vendorDir, "requirements.txt");
  if (existsSync(reqSrc)) {
    writeFileSync(join(destDir, "requirements.txt"), readFileSync(reqSrc, "utf-8"), "utf-8");
  }
  return destDir;
}
```

- [ ] **Step 4: 运行测试验证通过**

Run: `cd packages/cli && npx vitest run tests/utils.test.ts`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add packages/cli/src/utils.ts packages/cli/tests/utils.test.ts
git commit -m "feat: rewrite CLI utils with pip/install helpers"
```

---

### Task 2: 重写 install.ts — 安装主流程

**Files:**
- Modify: `packages/cli/src/install.ts`

- [ ] **Step 1: 写 install.ts**

```typescript
import { resolve } from "path";
import {
  resolveTargetDir, hasDryRun, detectPython,
  pipInstall, pipInstallRequirements,
  writeSettingsJson, writeHooksJson,
  writeAgentMemoryConfig, updateClaudeMd,
  copyVendorMcpServer,
  InstallResult,
} from "./utils";

export function runInstall(argv: string[]): InstallResult {
  const targetDir = resolveTargetDir(argv);
  const dryRun = hasDryRun(argv);
  const warnings: string[] = [];
  let mcpMode: InstallResult["mcpMode"] = "manual";

  if (dryRun) {
    console.log("[DRY RUN] Would install to:", targetDir);
  }

  // Step 1: check target dir
  console.log(`Target: ${targetDir}`);

  // Step 2: detect Python
  const py = detectPython();
  if (!py.ok) {
    warnings.push("Python 3.10+ 未检测到。请安装 Python: https://python.org");
    console.warn("  ⚠ Python not found");
  } else {
    console.log(`  Python ${py.version} OK`);

    if (!dryRun) {
      // Step 3: pip install (3 try)
      const tries: [string, string][] = [
        [py.pipCmd, "agent-memory-mcp"],
        [py.pipCmd, join(__dirname, "..", "vendor", "requirements.txt")],
      ];

      let installed = false;
      for (const [cmd, target] of tries) {
        const isReqFile = target.endsWith(".txt");
        const ok = isReqFile ? pipInstallRequirements(cmd, target) : pipInstall(cmd, target);
        if (ok) {
          mcpMode = isReqFile ? "local" : "pypi";
          installed = true;
          break;
        }
      }

      if (installed) {
        console.log(`  ✓ Python dependencies installed (mode: ${mcpMode})`);
      } else {
        warnings.push("pip install 失败。请手动执行: pip install agent-memory-mcp");
        console.warn("  ⚠ pip install failed");
      }
    }
  }

  if (!dryRun) {
    // Step 4: write configs
    if (mcpMode === "pypi") {
      writeSettingsJson(targetDir, ["-m", "agent_memory_mcp"]);
    } else if (mcpMode === "local") {
      const dest = copyVendorMcpServer(targetDir);
      writeSettingsJson(targetDir, [join(dest, "server.py")]);
    }
    console.log("  ✓ MCP config written");

    writeHooksJson(targetDir);
    console.log("  ✓ Hooks written");

    writeAgentMemoryConfig(targetDir);
    console.log("  ✓ Agent memory config written");

    updateClaudeMd(targetDir);
    console.log("  ✓ CLAUDE.md updated");
  }

  // Step 5: report
  const success = warnings.length === 0;
  if (success) {
    console.log("\n✓ Installation complete! Restart Claude Code.");
  } else {
    console.log(`\n⚠ Installation complete with ${warnings.length} warning(s):`);
    warnings.forEach((w) => console.log(`  - ${w}`));
    console.log("Restart Claude Code for configuration changes to take effect.");
  }

  return { success, warnings, mcpMode };
}
```

- [ ] **Step 2: 验证编译**

Run: `cd packages/cli && npx tsc --noEmit`
Expected: 无错误

- [ ] **Step 3: 提交**

```bash
git add packages/cli/src/install.ts
git commit -m "feat: rewrite CLI install flow with PyPI-first strategy"
```

---

### Task 3: 重写 remove.ts — 卸载

**Files:**
- Modify: `packages/cli/src/remove.ts`

- [ ] **Step 1: 写 remove.ts**

```typescript
import { existsSync, readFileSync, writeFileSync, unlinkSync } from "fs";
import { join } from "path";
import { resolveTargetDir, hasDryRun } from "./utils";

export function runRemove(argv: string[]): void {
  const targetDir = resolveTargetDir(argv);
  const dryRun = hasDryRun(argv);

  console.log(`Removing Agent Memory from: ${targetDir}\n`);

  // Remove hooks
  const hooksPath = join(targetDir, ".claude", "hooks.json");
  if (existsSync(hooksPath)) {
    if (!dryRun) {
      try {
        const data = JSON.parse(readFileSync(hooksPath, "utf-8"));
        delete data.onSessionStart;
        delete data.onSessionEnd;
        writeFileSync(hooksPath, JSON.stringify(data, null, 2) + "\n", "utf-8");
        console.log("  ✓ Hooks cleaned");
      } catch {
        // 如果解析失败或变空，删除文件
        unlinkSync(hooksPath);
        console.log("  ✓ Hooks file removed");
      }
    } else {
      console.log("  [DRY RUN] Would clean hooks");
    }
  }

  // Remove MCP config from settings.local.json
  const settingsPath = join(targetDir, ".claude", "settings.local.json");
  if (existsSync(settingsPath)) {
    if (!dryRun) {
      try {
        const data = JSON.parse(readFileSync(settingsPath, "utf-8"));
        if (data.mcpServers) {
          delete data.mcpServers["agent-memory"];
        }
        writeFileSync(settingsPath, JSON.stringify(data, null, 2) + "\n", "utf-8");
        console.log("  ✓ MCP config removed");
      } catch {
        console.warn("  ⚠ Could not parse settings.local.json");
      }
    } else {
      console.log("  [DRY RUN] Would remove MCP config");
    }
  }

  // Remove CLAUDE.md section (标志性保留—不破坏用户已有内容)
  console.log("  - CLAUDE.md section preserved (safe to remove manually)");

  console.log("\n✓ Removal complete. Memory data preserved at ~/.agent-memory/");
  console.log("  To fully remove data: rm -rf ~/.agent-memory/");
}
```

- [ ] **Step 2: 验证编译**

Run: `cd packages/cli && npx tsc --noEmit`
Expected: 无错误

- [ ] **Step 3: 提交**

```bash
git add packages/cli/src/remove.ts
git commit -m "feat: rewrite CLI remove flow"
```

---

### Task 4: 更新 index.ts — CLI 入口

**Files:**
- Modify: `packages/cli/src/index.ts`

- [ ] **Step 1: 写 index.ts**

```typescript
#!/usr/bin/env node

import { runInstall } from "./install";
import { runRemove } from "./remove";

const args = process.argv.slice(2);
const command = args[0] || "init";

switch (command) {
  case "init":
  case "install":
    runInstall(args.slice(1));
    break;
  case "remove":
  case "uninstall":
    runRemove(args.slice(1));
    break;
  case "--help":
  case "help":
    console.log(`Usage:
  npx @agent-memory/init [path] [--dry-run]
  npx @agent-memory/remove [path] [--dry-run]

Options:
  --dry-run  检测环境但不写任何文件
  path       目标项目路径（默认当前目录）

Examples:
  npx @agent-memory/init                     当前目录安装
  npx @agent-memory/init ./my-project        指定项目
  npx @agent-memory/init --dry-run           仅检测环境
  npx @agent-memory/remove                   卸载当前项目`);
    break;
  default:
    console.error(`Unknown command: ${command}`);
    console.error("Usage: npx @agent-memory/init [path] [--dry-run]");
    process.exit(1);
}
```

- [ ] **Step 2: 验证编译**

Run: `cd packages/cli && npx tsc --noEmit`
Expected: 无错误

- [ ] **Step 3: 提交**

```bash
git add packages/cli/src/index.ts
git commit -m "feat: update CLI entry with path arg and --dry-run"
```

---

### Task 5: vendor 文件 + package.json 更新

**Files:**
- Create: `packages/cli/src/vendor/requirements.txt`
- Modify: `packages/cli/package.json`

- [ ] **Step 1: 创建 vendor/requirements.txt**

```
chromadb>=0.5.0
fastembed>=0.5.0
fastmcp>=0.3.0
httpx>=0.27.0
```

- [ ] **Step 2: 更新 package.json**

```json
{
  "name": "@agent-memory/init",
  "version": "0.1.0",
  "description": "一键激活 Agent 记忆系统 — npx @agent-memory/init",
  "bin": {
    "agent-memory-init": "./dist/index.js"
  },
  "files": ["dist", "src/vendor"],
  "scripts": {
    "build": "tsc",
    "prepublish": "npm run build",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.5.0",
    "vitest": "^2.0.0"
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/TheonePro7/memory.git"
  },
  "publishConfig": {
    "access": "public"
  }
}
```

- [ ] **Step 3: 验证编译**

Run: `cd packages/cli && npm install && npx tsc --noEmit`
Expected: 无错误

- [ ] **Step 4: 提交**

```bash
git add packages/cli/src/vendor/requirements.txt packages/cli/package.json
git commit -m "chore: add vendor requirements and update package.json for publish"
```

---

### Task 6: 集成测试

**Files:**
- Create: `packages/cli/tests/install.test.ts`

- [ ] **Step 1: 写集成测试**

```typescript
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { execSync } from "child_process";
import { existsSync, readFileSync, mkdtempSync, rmSync } from "fs";
import { join } from "path";

const TMP_ROOT = join(__dirname, "..", ".test-tmp");

describe("CLI install", () => {
  const tmpDir = mkdtempSync(join(TMP_ROOT, "test-"));

  beforeAll(() => {
    // Build the CLI first
    execSync("npx tsc", { cwd: join(__dirname, ".."), stdio: "pipe" });
  });

  afterAll(() => {
    rmSync(TMP_ROOT, { recursive: true, force: true });
  });

  it("should create .claude/settings.local.json", () => {
    execSync(`node ${join(__dirname, "..", "dist", "index.js")} ${tmpDir}`, {
      stdio: "pipe", timeout: 30_000,
    });
    const settingsPath = join(tmpDir, ".claude", "settings.local.json");
    expect(existsSync(settingsPath)).toBe(true);
    const data = JSON.parse(readFileSync(settingsPath, "utf-8"));
    expect(data.mcpServers["agent-memory"]).toBeDefined();
  });

  it("should create .claude/hooks.json", () => {
    const hooksPath = join(tmpDir, ".claude", "hooks.json");
    expect(existsSync(hooksPath)).toBe(true);
    const data = JSON.parse(readFileSync(hooksPath, "utf-8"));
    expect(data.onSessionStart).toContain("agent-memory recall");
    expect(data.onSessionEnd).toContain("agent-memory summarize");
  });

  it("should create ~/.agent-memory/config.yaml", () => {
    const cfgPath = join(require("os").homedir(), ".agent-memory", "config.yaml");
    expect(existsSync(cfgPath)).toBe(true);
  });

  it("should add ## 记忆系统 to CLAUDE.md", () => {
    const claudeMdPath = join(tmpDir, "CLAUDE.md");
    expect(existsSync(claudeMdPath)).toBe(true);
    const content = readFileSync(claudeMdPath, "utf-8");
    expect(content).toContain("## 记忆系统");
  });

  it("--dry-run should not write any files", () => {
    const dryDir = mkdtempSync(join(TMP_ROOT, "dry-"));
    execSync(`node ${join(__dirname, "..", "dist", "index.js")} ${dryDir} --dry-run`, {
      stdio: "pipe", timeout: 30_000,
    });
    const settingsPath = join(dryDir, ".claude", "settings.local.json");
    expect(existsSync(settingsPath)).toBe(false);
    rmSync(dryDir, { recursive: true, force: true });
  });
});
```

- [ ] **Step 2: 运行测试**

Run: `cd packages/cli && npx vitest run`
Expected: 所有测试通过

- [ ] **Step 3: 提交**

```bash
git add packages/cli/tests/
git commit -m "test: add CLI integration tests"
```

---

### Task 7: 第一次发布到 npm

**Files:**
- Create: `packages/cli/.npmignore`

- [ ] **Step 1: 创建 .npmignore**

```
tests/
.vitest/
tsconfig.json
```

- [ ] **Step 2: 构建并发布**

```bash
cd packages/cli
npm run build
npm publish --dry-run  # 先验证包内容
npm publish            # 发布到 npm
```

- [ ] **Step 3: 验证可安装**

```bash
mkdir -p /tmp/test-agent-memory
cd /tmp/test-agent-memory
npx @agent-memory/init --dry-run
```

Expected: CLI 执行成功，显示检测结果

- [ ] **Step 4: 提交**

```bash
git add packages/cli/.npmignore
git commit -m "chore: add .npmignore and prepare for npm publish"
git tag v0.4.0
git push origin master --tags
```
