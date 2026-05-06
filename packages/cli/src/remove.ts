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
