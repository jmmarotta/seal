import * as fs from "node:fs/promises";
import * as path from "node:path";

import { afterEach, describe, expect, it } from "bun:test";

import { checkWorkspace } from "../src/index";
import { cleanupTempRoot, createTempRoot } from "./helpers";

const FIXTURES_DIR = path.join(import.meta.dir, "fixtures");

async function loadFixture(name: string): Promise<string> {
  const root = await createTempRoot("seal-sdk-fixture-");
  const source = path.join(FIXTURES_DIR, name);
  await fs.cp(source, root, { recursive: true });
  return root;
}

describe("fixture integration", () => {
  const createdRoots: string[] = [];

  afterEach(async () => {
    while (createdRoots.length) {
      const root = createdRoots.pop();
      if (root) {
        await cleanupTempRoot(root);
      }
    }
  });

  it("passes for valid planned workspace fixture", async () => {
    const root = await loadFixture("valid-planned-workspace");
    createdRoots.push(root);

    const report = await checkWorkspace(root);
    expect(report.problems).toEqual([]);
    expect(report.specs).toBe(1);
    expect(report.invariants).toBe(0);
  });

  it("reports docs deliverable errors for missing docs fixture", async () => {
    const root = await loadFixture("missing-docs-workspace");
    createdRoots.push(root);

    const report = await checkWorkspace(root);
    expect(
      report.problems.some((problem) =>
        problem.message.includes("Deliverables references missing docs file: docs/missing.md"),
      ),
    ).toBe(true);
  });
});
