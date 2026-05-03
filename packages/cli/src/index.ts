#!/usr/bin/env node

import { runInstall } from "./install";
import { runRemove } from "./remove";

const args = process.argv.slice(2);
const command = args[0] || "init";

switch (command) {
  case "init":
  case "install":
    runInstall({
      withTasks: args.includes("--with-tasks"),
      withExperience: args.includes("--with-experience"),
      withStructure: args.includes("--with-structure"),
    });
    break;
  case "remove":
  case "uninstall":
    runRemove();
    break;
  default:
    console.log(`Usage: npx @agent-memory/init [--with-tasks]`);
    console.log(`       npx @agent-memory/remove`);
    process.exit(1);
}
