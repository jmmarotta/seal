import { afterEach, beforeEach, describe, expect, it } from "bun:test";

import {
  createSpecWorkspace,
  initWorkspace,
  specPath,
  workPath,
} from "../src/index";
import { cleanupTempRoot, createTempRoot, fileExists } from "./helpers";

describe("createSpecWorkspace", () => {
  let rootDir: string;

  beforeEach(async () => {
    rootDir = await createTempRoot();
    await initWorkspace(rootDir, "SEA");
  });

  afterEach(async () => {
    await cleanupTempRoot(rootDir);
  });

  it("creates required workspace files", async () => {
    const created = await createSpecWorkspace(rootDir, {
      title: "Deterministic changelog generation",
    });

    expect(created.specKey).toBe("SEA-1");
    expect(await fileExists(specPath(rootDir, created.specKey))).toBe(true);
    expect(await fileExists(workPath(rootDir, created.specKey))).toBe(true);
    expect(await fileExists(`${created.workspacePath}/artifacts`)).toBe(true);
  });

  it("allocates sequential keys", async () => {
    const first = await createSpecWorkspace(rootDir, { title: "First" });
    const second = await createSpecWorkspace(rootDir, { title: "Second" });

    expect(first.specKey).toBe("SEA-1");
    expect(second.specKey).toBe("SEA-2");
  });

  it("rejects terminal status on create", async () => {
    await expect(
      createSpecWorkspace(rootDir, {
        title: "Invalid",
        status: "done",
      }),
    ).rejects.toThrow("planned|active|blocked");
  });
});
