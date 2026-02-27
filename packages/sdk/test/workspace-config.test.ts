import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import * as path from "node:path";

import { ensureSeal, getConfig, resolveSpecPrefix, setConfig } from "../src/index";
import { cleanupTempRoot, createTempRoot, fileExists } from "./helpers";

describe("workspace + config", () => {
  let rootDir: string;

  beforeEach(async () => {
    rootDir = await createTempRoot();
  });

  afterEach(async () => {
    await cleanupTempRoot(rootDir);
  });

  it("creates layout without config", async () => {
    await ensureSeal(rootDir);

    expect(await fileExists(path.join(rootDir, ".seal"))).toBe(true);
    expect(await fileExists(path.join(rootDir, ".seal", "specs"))).toBe(true);
    expect(await fileExists(path.join(rootDir, ".seal", "invariants"))).toBe(true);
    expect(await fileExists(path.join(rootDir, ".seal", "config.json"))).toBe(false);
  });

  it("requires explicit prefix", async () => {
    await expect(resolveSpecPrefix(rootDir)).rejects.toThrow("Spec prefix not set");
  });

  it("normalizes and persists custom prefix", async () => {
    const prefix = await resolveSpecPrefix(rootDir, "sea");
    expect(prefix).toBe("SEA");

    const config = await getConfig(rootDir);
    expect(config?.specPrefix).toBe("SEA");
  });

  it("rejects invalid prefix", async () => {
    await expect(resolveSpecPrefix(rootDir, "1x")).rejects.toThrow("specPrefix");
  });

  it("accepts config without schema", async () => {
    await setConfig(rootDir, { specPrefix: "SEA" });
    const config = await getConfig(rootDir);
    expect(config?.specPrefix).toBe("SEA");
  });
});
