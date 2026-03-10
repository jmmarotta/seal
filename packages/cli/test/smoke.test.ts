import { afterEach, beforeEach, expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as path from "node:path";

import { cleanupTempRoot, createTempRoot, runCli } from "./helpers";

let rootDir = "";

beforeEach(async () => {
  rootDir = await createTempRoot();
});

afterEach(async () => {
  await cleanupTempRoot(rootDir);
});

test("prints version", async () => {
  const packageJson = JSON.parse(
    await fs.readFile(path.join(import.meta.dir, "..", "package.json"), "utf8"),
  ) as { version: string };

  const result = await runCli(["--version"], rootDir);
  expect(result.error).toBeUndefined();
  expect(result.stdout).toContain(packageJson.version);
});
