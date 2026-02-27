import { describe, expect, it } from "bun:test";
import * as path from "node:path";

import {
  artifactsDir,
  configPath,
  inboxPath,
  invariantPath,
  invariantsDir,
  learningsPath,
  lockPath,
  sealDir,
  specDir,
  specPath,
  specsDir,
  workPath,
} from "../src/index";

describe("paths", () => {
  const root = "/tmp/seal-root";
  const specKey = "SEA-42";

  it("builds root-level paths", () => {
    expect(sealDir(root)).toBe(path.join(root, ".seal"));
    expect(configPath(root)).toBe(path.join(root, ".seal", "config.json"));
    expect(inboxPath(root)).toBe(path.join(root, ".seal", "INBOX.md"));
    expect(lockPath(root)).toBe(path.join(root, ".seal", ".lock"));
    expect(specsDir(root)).toBe(path.join(root, ".seal", "specs"));
    expect(invariantsDir(root)).toBe(path.join(root, ".seal", "invariants"));
  });

  it("builds spec workspace paths", () => {
    expect(specDir(root, specKey)).toBe(path.join(root, ".seal", "specs", specKey));
    expect(specPath(root, specKey)).toBe(path.join(root, ".seal", "specs", specKey, "spec.md"));
    expect(workPath(root, specKey)).toBe(path.join(root, ".seal", "specs", specKey, "work.md"));
    expect(learningsPath(root, specKey)).toBe(
      path.join(root, ".seal", "specs", specKey, "learnings.md"),
    );
    expect(artifactsDir(root, specKey)).toBe(path.join(root, ".seal", "specs", specKey, "artifacts"));
  });

  it("builds invariant file path", () => {
    expect(invariantPath(root, "INV-3")).toBe(path.join(root, ".seal", "invariants", "INV-3.md"));
  });
});
