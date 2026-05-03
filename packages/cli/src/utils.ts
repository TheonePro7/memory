import { execSync } from "child_process";
import { existsSync, mkdirSync, writeFileSync, readFileSync, appendFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";

const PROJECT_ROOT = process.env.AGENT_MEMORY_PROJECT_ROOT || process.cwd();

export const MEMORY_DIR = join(PROJECT_ROOT, "memory");
export const MEMORY_DOT_DIR = join(PROJECT_ROOT, ".memory");
export const CONFIG_DIR = join(homedir(), ".agent-memory");
export const CONFIG_PATH = join(CONFIG_DIR, "config.yaml");
export const HOOKS_PATH = join(PROJECT_ROOT, ".claude", "hooks.json");
export const CLAUDE_MD_PATH = join(PROJECT_ROOT, "CLAUDE.md");
export const SETTINGS_PATH = join(PROJECT_ROOT, ".claude", "settings.local.json");

export interface InstallOptions {
  withTasks?: boolean;
  withExperience?: boolean;
  withStructure?: boolean;
}

export function ensureDir(dir: string): void {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

export function pipInstall(packageName: string): boolean {
  try {
    execSync(`pip install ${packageName}`, { stdio: "inherit" });
    return true;
  } catch {
    return false;
  }
}

export function writeConfig(userId = "default", projectId = ""): void {
  const config = [
    `user_id: ${userId}`,
    `project_id: ${projectId || "null"}`,
    `memory_dir: ${MEMORY_DIR}`,
    `chroma_dir: ${join(MEMORY_DOT_DIR, "chroma")}`,
    "",
    "llm:",
    "  provider: auto",
    "  api_key_env: ANTHROPIC_API_KEY",
    "",
    "mcp:",
    "  transport: stdio",
    "  port: 8710",
  ].join("\n");
  ensureDir(CONFIG_DIR);
  writeFileSync(CONFIG_PATH, config, "utf-8");
}

export function writeHooks(): void {
  const dir = join(process.cwd(), ".claude");
  ensureDir(dir);

  let existing: Record<string, string[]> = {};
  if (existsSync(HOOKS_PATH)) {
    try {
      existing = JSON.parse(readFileSync(HOOKS_PATH, "utf-8"));
    } catch { /* ignore parse errors */ }
  }

  const newHooks = {
    onSessionStart: ["agent-memory recall"],
    onSessionEnd: ["agent-memory summarize"],
  };

  const merged: Record<string, string[]> = {};
  for (const key of new Set([...Object.keys(existing), ...Object.keys(newHooks)])) {
    const existingCmds = existing[key] || [];
    const newCmds = newHooks[key as keyof typeof newHooks] || [];
    merged[key] = [...new Set([...existingCmds, ...newCmds])];
  }

  writeFileSync(HOOKS_PATH, JSON.stringify(merged, null, 2), "utf-8");
}

export function writeClaudeMd(): void {
  const guide = [
    "",
    "## 记忆系统",
    "",
    '你拥有持久记忆能力。当用户说"记住""注意""以后要知道"等时，主动调用 remember() 工具。',
    "会话结束时系统会自动 summarize，不需要你手动操作。",
    "",
  ].join("\n");

  if (existsSync(CLAUDE_MD_PATH)) {
    const existing = readFileSync(CLAUDE_MD_PATH, "utf-8");
    if (!existing.includes("## 记忆系统")) {
      appendFileSync(CLAUDE_MD_PATH, guide, "utf-8");
    }
  } else {
    writeFileSync(CLAUDE_MD_PATH, guide, "utf-8");
  }
}

export function writeMcpConfig(serverScriptPath: string): void {
  const dir = join(process.cwd(), ".claude");
  ensureDir(dir);

  // Read existing settings if any
  let existing: Record<string, any> = {};
  if (existsSync(SETTINGS_PATH)) {
    try {
      existing = JSON.parse(readFileSync(SETTINGS_PATH, "utf-8"));
    } catch { /* ignore parse errors */ }
  }

  // Merge agent-memory MCP config
  const merged = {
    ...existing,
    mcpServers: {
      ...existing.mcpServers,
      "agent-memory": {
        command: "python",
        args: [serverScriptPath],
        env: {},
      },
    },
  };

  writeFileSync(SETTINGS_PATH, JSON.stringify(merged, null, 2), "utf-8");
}

export function removeConfig(): void {
  try {
    if (existsSync(CLAUDE_MD_PATH)) {
      let content = readFileSync(CLAUDE_MD_PATH, "utf-8");
      content = content.replace(/\n## 记忆系统\n\n[\s\S]*?(?=\n## |$)/, "");
      writeFileSync(CLAUDE_MD_PATH, content.trim(), "utf-8");
    }
    if (existsSync(HOOKS_PATH)) {
      writeFileSync(HOOKS_PATH, "{}", "utf-8");
    }
    console.log("Cleanup complete. MCP config in .claude/settings.local.json needs manual removal.");
  } catch (e) {
    console.error("Cleanup failed:", e);
  }
}
