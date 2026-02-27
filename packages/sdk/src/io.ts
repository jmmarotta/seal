import * as fs from "node:fs/promises";
import * as path from "node:path";

import { invariantsDir, sealDir, specsDir } from "./paths";

export async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

export async function ensureLayout(rootDir?: string): Promise<void> {
  await ensureDir(sealDir(rootDir));
  await ensureDir(specsDir(rootDir));
  await ensureDir(invariantsDir(rootDir));
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

export async function readJsonFile<T = unknown>(filePath: string): Promise<T> {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw) as T;
}

export async function atomicWriteJson(filePath: string, data: unknown): Promise<void> {
  const dir = path.dirname(filePath);
  const base = path.basename(filePath);
  const tmpPath = path.join(dir, `.${base}.tmp`);
  const json = `${JSON.stringify(data, null, 2)}\n`;

  await ensureDir(dir);
  await fs.writeFile(tmpPath, json, "utf8");
  await fs.rename(tmpPath, filePath);
}

export async function atomicWriteText(filePath: string, text: string): Promise<void> {
  const dir = path.dirname(filePath);
  const base = path.basename(filePath);
  const tmpPath = path.join(dir, `.${base}.tmp`);

  await ensureDir(dir);
  await fs.writeFile(tmpPath, text, "utf8");
  await fs.rename(tmpPath, filePath);
}

export async function appendJsonLine(filePath: string, data: unknown): Promise<void> {
  const dir = path.dirname(filePath);
  const line = `${JSON.stringify(data)}\n`;

  await ensureDir(dir);
  const handle = await fs.open(filePath, "a");
  try {
    await handle.writeFile(line, "utf8");
  } finally {
    await handle.close();
  }
}

export async function readTextFile(filePath: string): Promise<string> {
  return fs.readFile(filePath, "utf8");
}

export async function listMarkdownFiles(dirPath: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
      .map((entry) => path.join(dirPath, entry.name));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

export async function listSpecKeys(rootDir?: string): Promise<string[]> {
  const dir = specsDir(rootDir);
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort((a, b) => a.localeCompare(b));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

export async function listInvariantFiles(rootDir?: string): Promise<string[]> {
  return listMarkdownFiles(invariantsDir(rootDir));
}
