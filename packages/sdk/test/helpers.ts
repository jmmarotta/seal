import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";

export async function createTempRoot(prefix = "seal-sdk-"): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

export async function cleanupTempRoot(root: string): Promise<void> {
  await fs.rm(root, { recursive: true, force: true });
}

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return false;
    }
    throw error;
  }
}
