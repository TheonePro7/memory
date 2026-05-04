import { join } from "path";
import {
  ensureDir,
  pipInstall,
  writeConfig,
  writeHooks,
  writeClaudeMd,
  writeMcpConfig,
  MEMORY_DIR,
  MEMORY_DOT_DIR,
  InstallOptions,
} from "./utils";

export function runInstall(options: InstallOptions = {}): void {
  console.log("Installing Agent Memory System...\n");

  console.log("Creating directories...");
  ensureDir(MEMORY_DIR);
  ensureDir(MEMORY_DOT_DIR);

  console.log("Installing mem0ai...");
  if (pipInstall("mem0ai")) {
    console.log("  mem0ai installed");
  } else {
    console.log("  Warning: pip install failed. Run manually: pip install mem0ai");
  }

  console.log("Writing config...");
  writeConfig();
  console.log("  Config written to ~/.agent-memory/config.yaml");

  const serverScript = join(process.cwd(), "packages", "mcp-server", "src", "server.py");
  console.log("Configuring MCP...");
  writeMcpConfig(serverScript);
  console.log("  MCP configured");

  console.log("Configuring Hooks...");
  writeHooks();
  console.log("  Hooks written to .claude/hooks.json");

  console.log("Updating CLAUDE.md...");
  writeClaudeMd();
  console.log("  CLAUDE.md updated");

  if (options.withTasks) {
    console.log("Installing beads...");
    pipInstall("@beads/bd");
  }

  console.log("\nInstallation complete!");
  console.log("Restart Claude Code for changes to take effect.");
}
