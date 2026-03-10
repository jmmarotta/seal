import { expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as path from "node:path";

import { SEAL_SDK_VERSION } from "../src/index";

test("exports sdk version", async () => {
  const packageJson = JSON.parse(
    await fs.readFile(path.join(import.meta.dir, "..", "package.json"), "utf8"),
  ) as { version: string };

  expect(SEAL_SDK_VERSION).toBe(packageJson.version);
});
