import { removeConfig } from "./utils";

export function runRemove(): void {
  console.log("Removing Agent Memory System...\n");
  removeConfig();
  console.log("\nRemoval complete!");
  console.log("Your memory data (memory/ and .memory/) has been preserved.");
  console.log("To fully remove, delete those directories manually if desired.");
}
