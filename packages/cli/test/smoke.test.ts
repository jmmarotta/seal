import { afterEach, beforeEach, expect, test } from "bun:test";

import { cleanupTempRoot, createTempRoot, runCli } from "./helpers";

let rootDir = "";

beforeEach(async () => {
  rootDir = await createTempRoot();
});

afterEach(async () => {
  await cleanupTempRoot(rootDir);
});

test("prints version", async () => {
  const result = await runCli(["--version"], rootDir);
  expect(result.error).toBeUndefined();
  expect(result.stdout).toContain("0.1.0");
});
