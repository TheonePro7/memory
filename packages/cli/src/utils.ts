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

  const reqSrc = join(vendorDir, "requirements.txt");
  if (existsSync(reqSrc)) {
    writeFileSync(join(destDir, "requirements.txt"), readFileSync(reqSrc, "utf-8"), "utf-8");
  }
  return destDir;
}
