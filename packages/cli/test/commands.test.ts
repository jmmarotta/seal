import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import * as fs from "node:fs/promises";
import * as path from "node:path";

import { cleanupTempRoot, createTempRoot, fileExists, runCli } from "./helpers";

describe("seal commands", () => {
  let rootDir: string;

  beforeEach(async () => {
    rootDir = await createTempRoot();
  });

  afterEach(async () => {
    await cleanupTempRoot(rootDir);
  });

  it("initializes workspace", async () => {
    const result = await runCli(["init", "--prefix", "SEA"], rootDir);
    expect(result.error).toBeUndefined();
    expect(result.stdout).toContain("Initialized SEAL workspace");
    expect(await fileExists(path.join(rootDir, ".seal", "config.json"))).toBe(true);
    expect(await fileExists(path.join(rootDir, ".seal", "INBOX.md"))).toBe(true);
  });

  it("creates, lists, and transitions specs", async () => {
    await runCli(["init", "--prefix", "SEA"], rootDir);

    const first = await runCli(["new", "First spec"], rootDir);
    expect(first.error).toBeUndefined();
    expect(first.stdout).toContain("SEA-1");

    const second = await runCli(["new", "Second spec"], rootDir);
    expect(second.error).toBeUndefined();
    expect(second.stdout).toContain("SEA-2");

    await runCli(["edit", "status", "SEA-1", "active"], rootDir);
    await runCli(["edit", "status", "SEA-1", "done"], rootDir);

    const listDefault = await runCli(["list"], rootDir);
    expect(listDefault.error).toBeUndefined();
    expect(listDefault.stdout).toContain("SEA-2");
    expect(listDefault.stdout).not.toContain("SEA-1");

    const listAll = await runCli(["list", "--all"], rootDir);
    expect(listAll.error).toBeUndefined();
    expect(listAll.stdout).toContain("SEA-1");
    expect(listAll.stdout).toContain("SEA-2");

    const listDone = await runCli(["list", "--status", "done"], rootDir);
    expect(listDone.error).toBeUndefined();
    expect(listDone.stdout).toContain("SEA-1");
    expect(listDone.stdout).not.toContain("SEA-2");

    const workText = await fs.readFile(path.join(rootDir, ".seal", "specs", "SEA-1", "work.md"), "utf8");
    expect(workText).toContain("status: done");
    expect(workText).toMatch(/contractHash:\s+[0-9a-f]{64}/i);
  });

  it("supports short aliases for all command flags", async () => {
    const initResult = await runCli(["init", "-p", "SEA"], rootDir);
    expect(initResult.error).toBeUndefined();

    const newResult = await runCli(["new", "-s", "active", "Alias spec"], rootDir);
    expect(newResult.error).toBeUndefined();
    expect(newResult.stdout).toContain("SEA-1");

    const listByStatus = await runCli(["list", "-s", "active"], rootDir);
    expect(listByStatus.error).toBeUndefined();
    expect(listByStatus.stdout).toContain("SEA-1");

    const listAll = await runCli(["list", "-a"], rootDir);
    expect(listAll.error).toBeUndefined();
    expect(listAll.stdout).toContain("SEA-1");

    const editStatus = await runCli(["edit", "status", "SEA-1", "blocked"], rootDir);
    expect(editStatus.error).toBeUndefined();
    expect(editStatus.stdout).toContain("SEA-1 active -> blocked");

    const checkResult = await runCli(["check", "-j", "-e"], rootDir);
    expect(checkResult.error).toBeUndefined();

    const checkPayload = JSON.parse(checkResult.stdout) as {
      specs: number;
      problems: unknown[];
    };
    expect(checkPayload.specs).toBe(1);
    expect(Array.isArray(checkPayload.problems)).toBe(true);
  });

  it("shows short aliases in command help output", async () => {
    const initHelp = await runCli(["init", "--help"], rootDir);
    expect(initHelp.error).toBeUndefined();
    expect(initHelp.stdout).toContain("-p");
    expect(initHelp.stdout).toContain("--prefix");

    const newHelp = await runCli(["new", "--help"], rootDir);
    expect(newHelp.error).toBeUndefined();
    expect(newHelp.stdout).toContain("-s");
    expect(newHelp.stdout).toContain("--status");

    const listHelp = await runCli(["list", "--help"], rootDir);
    expect(listHelp.error).toBeUndefined();
    expect(listHelp.stdout).toContain("-a");
    expect(listHelp.stdout).toContain("--all");
    expect(listHelp.stdout).toContain("-s");
    expect(listHelp.stdout).toContain("--status");

    const editStatusHelp = await runCli(["edit", "status", "--help"], rootDir);
    expect(editStatusHelp.error).toBeUndefined();
    expect(editStatusHelp.stdout).not.toContain("--summary");

    const checkHelp = await runCli(["check", "--help"], rootDir);
    expect(checkHelp.error).toBeUndefined();
    expect(checkHelp.stdout).toContain("-j");
    expect(checkHelp.stdout).toContain("--json");
    expect(checkHelp.stdout).toContain("-e");
    expect(checkHelp.stdout).toContain("--strict-docs-evidence");
  });

  it("returns error for unknown command", async () => {
    const result = await runCli(["wat"], rootDir);
    expect(result.exitCode).toBeDefined();
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain("No command registered for `wat`");
  });
});
