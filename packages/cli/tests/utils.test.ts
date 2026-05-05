import { describe, it, expect } from "vitest";
import { existsSync, rmdirSync, mkdtempSync } from "fs";
import { resolve } from "path";
import { tmpdir } from "os";
import { resolveTargetDir, ensureDir } from "../src/utils";

describe("resolveTargetDir", () => {
  it("should return CWD when no arg given", () => {
    const result = resolveTargetDir([]);
    expect(result).toBe(process.cwd());
  });

  it("should return the resolved path when arg given", () => {
    const result = resolveTargetDir(["/some/path"]);
    expect(result).toBe(resolve("/some/path"));
  });
});

describe("ensureDir", () => {
  it("should create directory if not exists", () => {
    const tmp = mkdtempSync(tmpdir() + "/test-agent-memory-");
    rmdirSync(tmp); // remove so ensureDir creates it
    ensureDir(tmp);
    expect(existsSync(tmp)).toBe(true);
    rmdirSync(tmp);
  });
});
