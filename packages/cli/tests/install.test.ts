import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { execSync } from "child_process";
import { existsSync, readFileSync, mkdtempSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir, homedir } from "os";

describe("CLI install", () => {
  const tmpDir = mkdtempSync(join(tmpdir(), "agent-memory-test-"));

  beforeAll(() => {
    // Build the CLI first
    execSync("npx tsc", { cwd: join(__dirname, ".."), stdio: "pipe" });
  });

  afterAll(() => {
    rmSync(tmpDir, { recursive: true, force: true });
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
    const cfgPath = join(homedir(), ".agent-memory", "config.yaml");
    expect(existsSync(cfgPath)).toBe(true);
  });

  it("should add ## 记忆系统 to CLAUDE.md", () => {
    const claudeMdPath = join(tmpDir, "CLAUDE.md");
    expect(existsSync(claudeMdPath)).toBe(true);
    const content = readFileSync(claudeMdPath, "utf-8");
    expect(content).toContain("## 记忆系统");
  });

  it("--dry-run should not write any files", () => {
    const dryDir = mkdtempSync(join(tmpdir(), "agent-memory-dry-"));
    execSync(`node ${join(__dirname, "..", "dist", "index.js")} ${dryDir} --dry-run`, {
      stdio: "pipe", timeout: 30_000,
    });
    const settingsPath = join(dryDir, ".claude", "settings.local.json");
    expect(existsSync(settingsPath)).toBe(false);
    rmSync(dryDir, { recursive: true, force: true });
  });
});
