import { afterEach, beforeEach, describe, expect, it } from "bun:test";

import { getConfig, initWorkspace, readTextFile } from "../src/index";
import { cleanupTempRoot, createTempRoot, fileExists } from "./helpers";

describe("initWorkspace", () => {
  let rootDir: string;

  beforeEach(async () => {
    rootDir = await createTempRoot();
  });

  afterEach(async () => {
    await cleanupTempRoot(rootDir);
  });

  it("creates config and inbox", async () => {
    const result = await initWorkspace(rootDir, "sea");

    expect(result.specPrefix).toBe("SEA");
    expect(result.createdInbox).toBe(true);
    expect(await fileExists(result.configPath)).toBe(true);
    expect(await fileExists(result.inboxPath)).toBe(true);

    const config = await getConfig(rootDir);
    expect(config?.specPrefix).toBe("SEA");
  });

  it("does not overwrite existing inbox", async () => {
    await initWorkspace(rootDir, "SEA");
    const first = await readTextFile(`${rootDir}/.seal/INBOX.md`);

    await initWorkspace(rootDir, "SEA");
    const second = await readTextFile(`${rootDir}/.seal/INBOX.md`);
    expect(second).toBe(first);
  });
});
