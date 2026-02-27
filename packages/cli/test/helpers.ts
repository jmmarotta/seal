import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";

import { run } from "@stricli/core";

import { app } from "../src/app";

export async function createTempRoot(prefix = "seal-cli-"): Promise<string> {
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

export async function runCli(args: string[], cwd: string): Promise<{
  stdout: string;
  stderr: string;
  exitCode: number | undefined;
  error?: Error;
}> {
  let stdout = "";
  let stderr = "";
  let error: Error | undefined;

  const fakeProcess = {
    stdout: {
      write: (chunk: string) => {
        stdout += String(chunk);
      },
    },
    stderr: {
      write: (chunk: string) => {
        stderr += String(chunk);
      },
    },
    exitCode: undefined as number | undefined,
  } as unknown as NodeJS.Process;

  try {
    await run(app, args, {
      process: fakeProcess,
      async forCommand() {
        return { process: fakeProcess, cwd };
      },
    });
  } catch (caught) {
    error = caught instanceof Error ? caught : new Error(String(caught));
  }

  const exitCode = typeof fakeProcess.exitCode === "number" ? fakeProcess.exitCode : undefined;
  if (error && !stderr) {
    stderr = error.message;
  }

  return { stdout, stderr, exitCode, error };
}
