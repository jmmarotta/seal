import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import * as fs from "node:fs/promises";
import * as path from "node:path";

import { cleanupTempRoot, createTempRoot, runCli } from "./helpers";

describe("seal check", () => {
  let rootDir: string;

  beforeEach(async () => {
    rootDir = await createTempRoot();
    await runCli(["init", "--prefix", "SEA"], rootDir);
    await runCli(["new", "One"], rootDir);
  });

  afterEach(async () => {
    await cleanupTempRoot(rootDir);
  });

  it("reports baseline contract completeness problems for fresh planned spec", async () => {
    const result = await runCli(["check"], rootDir);

    expect(result.error).toBeUndefined();
    expect(result.stdout).toContain("specs: 1");
    expect(result.stdout).toContain("invariants: 0");
    expect(result.stdout).toContain("problems: 2");
    expect(result.stdout).toContain("Objective section must be non-empty");
    expect(result.stdout).toContain("Requirements section must be non-empty");
  });

  it("reports done evidence problems when done gates are incomplete", async () => {
    await runCli(["edit", "status", "SEA-1", "active"], rootDir);
    await runCli(["edit", "status", "SEA-1", "done"], rootDir);

    const result = await runCli(["check"], rootDir);

    expect(result.error).toBeUndefined();
    expect(result.stdout).toContain("problems:");
    expect(result.stdout).toContain(
      "done status requires at least one passing machine-verifiable evidence entry",
    );
  });

  it("supports json output", async () => {
    const result = await runCli(["check", "--json"], rootDir);

    expect(result.error).toBeUndefined();
    const parsed = JSON.parse(result.stdout) as { specs: number; problems: unknown[] };
    expect(parsed.specs).toBe(1);
    expect(Array.isArray(parsed.problems)).toBe(true);
  });

  it("supports strict docs evidence flag", async () => {
    const result = await runCli(["check", "--json", "--strict-docs-evidence"], rootDir);

    expect(result.error).toBeUndefined();
    const parsed = JSON.parse(result.stdout) as { specs: number; problems: unknown[] };
    expect(parsed.specs).toBe(1);
    expect(Array.isArray(parsed.problems)).toBe(true);
  });

  it("detects duplicate inbox keys", async () => {
    const inboxFile = path.join(rootDir, ".seal", "INBOX.md");
    const original = await fs.readFile(inboxFile, "utf8");
    await fs.writeFile(inboxFile, `${original}- I-1: Another\n`, "utf8");

    const result = await runCli(["check"], rootDir);

    expect(result.error).toBeUndefined();
    expect(result.stdout).toContain("Duplicate inbox key");
  });
});
