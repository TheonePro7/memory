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
  npx @ivanston/init [path] [--dry-run]
  npx @ivanston/remove [path] [--dry-run]

Options:
  --dry-run  检测环境但不写任何文件
  path       目标项目路径（默认当前目录）

Examples:
  npx @ivanston/init                     当前目录安装
  npx @ivanston/init ./my-project        指定项目
  npx @ivanston/init --dry-run           仅检测环境
  npx @ivanston/remove                   卸载当前项目`);
      break;
    default:
      console.error(`Unknown command: ${command}`);
      console.error("Usage: npx @ivanston/init [path] [--dry-run]");
      process.exit(1);
  }
}
