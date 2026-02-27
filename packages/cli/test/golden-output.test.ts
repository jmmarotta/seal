import * as fs from "node:fs/promises";
import * as path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "bun:test";

import { cleanupTempRoot, createTempRoot, runCli } from "./helpers";

function normalizeRoot(text: string, rootDir: string): string {
  return text.split(rootDir).join("<ROOT>");
}

async function fillSpecContract(rootDir: string, specKey: string): Promise<void> {
  const filePath = path.join(rootDir, ".seal", "specs", specKey, "spec.md");
  const current = await fs.readFile(filePath, "utf8");
  const next = current
    .replace("## Objective\n\n", "## Objective\n\nGolden output fixture objective.\n\n")
    .replace("## Requirements\n\n", "## Requirements\n\n- Golden output requirement.\n\n")
    .replace("### Interface\n\n", "### Interface\n\n- CLI output is deterministic.\n\n")
    .replace("### Invariants\n\n", "### Invariants\n\n- Uses redesign model only.\n\n")
    .replace("## Verification Intent\n\n", "## Verification Intent\n\n- bun test\n\n");
  await fs.writeFile(filePath, next, "utf8");
}

describe("golden CLI output", () => {
  let rootDir: string;

  beforeEach(async () => {
    rootDir = await createTempRoot("seal-cli-golden-");
  });

  afterEach(async () => {
    await cleanupTempRoot(rootDir);
  });

  it("matches expected output for init/new/list/check", async () => {
    const initResult = await runCli(["init", "--prefix", "SEA"], rootDir);
    expect(initResult.error).toBeUndefined();
    expect(normalizeRoot(initResult.stdout, rootDir)).toBe(
      "Initialized SEAL workspace at <ROOT>/.seal\nSpec prefix: SEA\n",
    );

    const newResult = await runCli(["new", "Golden spec"], rootDir);
    expect(newResult.error).toBeUndefined();
    expect(normalizeRoot(newResult.stdout, rootDir)).toBe("SEA-1 <ROOT>/.seal/specs/SEA-1\n");

    const listResult = await runCli(["list"], rootDir);
    expect(listResult.error).toBeUndefined();
    expect(listResult.stdout).toBe("SEA-1 [planned] Golden spec\n");

    await fillSpecContract(rootDir, "SEA-1");
    const checkResult = await runCli(["check"], rootDir);
    expect(checkResult.error).toBeUndefined();
    expect(checkResult.stdout).toBe("specs: 1\ninvariants: 0\ninboxItems: 1\nproblems: 0\n");
  });
});
