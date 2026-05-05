#!/usr/bin/env node

import { runInstall } from "./install";
import { runRemove } from "./remove";

const args = process.argv.slice(2);
const command = args[0] || "init";

const COMMANDS = new Set(["init", "install", "remove", "uninstall", "--help", "help"]);

if (!COMMANDS.has(command)) {
  // First arg is a path, not a command — default to "init"
  runInstall(args);
} else {
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
}
