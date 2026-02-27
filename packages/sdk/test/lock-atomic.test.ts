import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import * as fs from "node:fs/promises";
import * as path from "node:path";

import { atomicWriteText, ensureSeal, lockPath, withLock } from "../src/index";
import { cleanupTempRoot, createTempRoot, fileExists } from "./helpers";

describe("lock", () => {
  let rootDir: string;

  beforeEach(async () => {
    rootDir = await createTempRoot();
  });

  afterEach(async () => {
    await cleanupTempRoot(rootDir);
  });

  it("creates and releases lock", async () => {
    await withLock(rootDir, async () => {
      expect(await fileExists(lockPath(rootDir))).toBe(true);
    });

    expect(await fileExists(lockPath(rootDir))).toBe(false);
  });

  it("releases lock on error", async () => {
    await expect(
      withLock(rootDir, async () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");

    expect(await fileExists(lockPath(rootDir))).toBe(false);
  });

  it("throws when lock is held", async () => {
    await ensureSeal(rootDir);
    await fs.writeFile(lockPath(rootDir), "lock", "utf8");

    await expect(withLock(rootDir, async () => {})).rejects.toThrow("lock already held");
  });

  it("recovers stale lock", async () => {
    await ensureSeal(rootDir);
    const file = lockPath(rootDir);
    await fs.writeFile(file, "lock", "utf8");
    const old = new Date(Date.now() - 1000);
    await fs.utimes(file, old, old);

    await expect(withLock(rootDir, async () => {}, { ttlMs: 10 })).resolves.toBeUndefined();
  });

  it("does not release a lock replaced by another owner", async () => {
    await withLock(rootDir, async () => {
      const file = lockPath(rootDir);
      const now = new Date().toISOString();
      await fs.writeFile(
        file,
        `${JSON.stringify({ token: "foreign-owner", pid: 9999, createdAt: now, expiresAt: now })}\n`,
        "utf8",
      );
    });

    expect(await fileExists(lockPath(rootDir))).toBe(true);
    await expect(withLock(rootDir, async () => {})).rejects.toThrow("lock already held");
  });
});

describe("atomicWriteText", () => {
  let rootDir: string;

  beforeEach(async () => {
    rootDir = await createTempRoot();
  });

  afterEach(async () => {
    await cleanupTempRoot(rootDir);
  });

  it("writes text atomically without temp file", async () => {
    const file = path.join(rootDir, "note.md");
    await atomicWriteText(file, "hello\n");

    const tmp = path.join(rootDir, ".note.md.tmp");
    expect(await fileExists(tmp)).toBe(false);

    const contents = await fs.readFile(file, "utf8");
    expect(contents).toBe("hello\n");
  });
});
