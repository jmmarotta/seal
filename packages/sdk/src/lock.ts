import { randomUUID } from "node:crypto";
import * as fs from "node:fs/promises";

import { ensureLayout } from "./io";
import { lockPath } from "./paths";

const DEFAULT_LOCK_TTL_MS = 30_000;

export interface LockOptions {
  ttlMs?: number;
}

interface LockPayload {
  token: string;
  pid: number;
  createdAt: string;
  expiresAt: string;
}

function isLockPayload(value: unknown): value is LockPayload {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const payload = value as Partial<LockPayload>;
  return (
    typeof payload.token === "string" &&
    typeof payload.pid === "number" &&
    typeof payload.createdAt === "string" &&
    typeof payload.expiresAt === "string"
  );
}

async function readLockToken(filePath: string): Promise<string | null> {
  let raw = "";
  try {
    raw = await fs.readFile(filePath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw error;
  }

  const firstLine = raw.split(/\r?\n/, 1)[0]?.trim();
  if (!firstLine) {
    return null;
  }

  try {
    const parsed = JSON.parse(firstLine) as unknown;
    if (!isLockPayload(parsed)) {
      return null;
    }
    return parsed.token;
  } catch {
    return null;
  }
}

async function acquireLock(rootDir?: string, options?: LockOptions): Promise<string> {
  const ttlMs = options?.ttlMs ?? DEFAULT_LOCK_TTL_MS;
  const path = lockPath(rootDir);
  const maxAttempts = 5;
  await ensureLayout(rootDir);

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const token = randomUUID();

    try {
      const handle = await fs.open(path, "wx");
      try {
        const payload: LockPayload = {
          token,
          pid: process.pid,
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + ttlMs).toISOString(),
        };
        await handle.writeFile(`${JSON.stringify(payload)}\n`, "utf8");
      } finally {
        await handle.close();
      }
      return token;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") {
        throw error;
      }
    }

    // Staleness is derived from lock file mtime so recovery does not depend on lock
    // payload trust. If stale, delete and retry acquisition.
    let stat: Awaited<ReturnType<typeof fs.stat>>;
    try {
      stat = await fs.stat(path);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        continue;
      }
      throw error;
    }

    const isStale = Date.now() - stat.mtimeMs > ttlMs;
    if (!isStale) {
      throw new Error(`SEAL lock already held at ${path}`);
    }

    try {
      await fs.unlink(path);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        continue;
      }
      throw error;
    }
  }

  throw new Error(`SEAL lock contention exceeded retry budget at ${path}`);
}

async function releaseLock(rootDir: string | undefined, token: string): Promise<void> {
  const path = lockPath(rootDir);

  const currentToken = await readLockToken(path);
  if (!currentToken || currentToken !== token) {
    return;
  }

  try {
    await fs.unlink(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return;
    }
    throw error;
  }
}

export async function withLock<T>(
  rootDir: string | undefined,
  fn: () => Promise<T>,
  options?: LockOptions,
): Promise<T> {
  const token = await acquireLock(rootDir, options);
  try {
    return await fn();
  } finally {
    await releaseLock(rootDir, token);
  }
}
