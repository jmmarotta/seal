import * as path from "node:path";

import {
  ARTIFACTS_DIRNAME,
  CONFIG_FILENAME,
  INBOX_FILENAME,
  INVARIANTS_DIRNAME,
  LEARNINGS_FILENAME,
  LOCK_FILENAME,
  SEAL_DIRNAME,
  SPEC_FILENAME,
  SPECS_DIRNAME,
  WORK_FILENAME,
} from "./constants";

export function resolveRoot(rootDir?: string): string {
  return rootDir ?? process.cwd();
}

export function sealDir(rootDir?: string): string {
  return path.join(resolveRoot(rootDir), SEAL_DIRNAME);
}

export function specsDir(rootDir?: string): string {
  return path.join(sealDir(rootDir), SPECS_DIRNAME);
}

export function specDir(rootDir: string | undefined, specKey: string): string {
  return path.join(specsDir(rootDir), specKey);
}

export function specPath(rootDir: string | undefined, specKey: string): string {
  return path.join(specDir(rootDir, specKey), SPEC_FILENAME);
}

export function workPath(rootDir: string | undefined, specKey: string): string {
  return path.join(specDir(rootDir, specKey), WORK_FILENAME);
}

export function learningsPath(rootDir: string | undefined, specKey: string): string {
  return path.join(specDir(rootDir, specKey), LEARNINGS_FILENAME);
}

export function artifactsDir(rootDir: string | undefined, specKey: string): string {
  return path.join(specDir(rootDir, specKey), ARTIFACTS_DIRNAME);
}

export function invariantsDir(rootDir?: string): string {
  return path.join(sealDir(rootDir), INVARIANTS_DIRNAME);
}

export function invariantPath(rootDir: string | undefined, invariantKey: string): string {
  return path.join(invariantsDir(rootDir), `${invariantKey}.md`);
}

export function inboxPath(rootDir?: string): string {
  return path.join(sealDir(rootDir), INBOX_FILENAME);
}

export function configPath(rootDir?: string): string {
  return path.join(sealDir(rootDir), CONFIG_FILENAME);
}

export function lockPath(rootDir?: string): string {
  return path.join(sealDir(rootDir), LOCK_FILENAME);
}
