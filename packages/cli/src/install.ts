import { join } from "path";
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
      // Step 3: pip install (2 tries)
      const tries: [string, string][] = [
        [py.pipCmd, "agent-memory-mcp"],
        [py.pipCmd, join(__dirname, "..", "src", "vendor", "requirements.txt")],
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
    } else {
      writeSettingsJson(targetDir, ["-m", "agent_memory_mcp"]);
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
