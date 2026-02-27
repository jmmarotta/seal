import { createHash } from "node:crypto";
import * as fs from "node:fs/promises";
import * as path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "bun:test";

import {
  artifactsDir,
  checkWorkspace,
  createSpecWorkspace,
  editSpecStatus,
  initWorkspace,
  listSpecs,
  readTextFile,
  specPath,
  workPath,
} from "../src/index";
import { cleanupTempRoot, createTempRoot } from "./helpers";

describe("list, work, check", () => {
  let rootDir: string;

  beforeEach(async () => {
    rootDir = await createTempRoot();
    await initWorkspace(rootDir, "SEA");
  });

  afterEach(async () => {
    await cleanupTempRoot(rootDir);
  });

  async function fillSpecContract(specKey: string): Promise<void> {
    const filePath = specPath(rootDir, specKey);
    const current = await readTextFile(filePath);
    const next = current
      .replace("## Objective\n\n", "## Objective\n\nShip deterministic behavior.\n\n")
      .replace("## Requirements\n\n", "## Requirements\n\n- Must be deterministic.\n\n")
      .replace("### Interface\n\n", "### Interface\n\n- `seal check` validates coherence.\n\n")
      .replace("### Invariants\n\n", "### Invariants\n\n- No legacy `.aglit` metadata.\n\n")
      .replace("## Verification Intent\n\n", "## Verification Intent\n\n- bun test\n\n");

    await fs.writeFile(filePath, next, "utf8");
  }

  async function setArtifactEvidence(specKey: string): Promise<void> {
    const artifactPath = path.join(artifactsDir(rootDir, specKey), "proof.txt");
    await fs.writeFile(artifactPath, "proof", "utf8");
    const artifactHash = createHash("sha256").update("proof", "utf8").digest("hex");

    const workFile = workPath(rootDir, specKey);
    const workText = await readTextFile(workFile);
    const evidenceEntries = [
      '  "entries": [',
      "    {",
      '      "proofType": "artifact",',
      '      "status": "pass",',
      '      "path": "artifacts/proof.txt",',
      `      "sha256": "${artifactHash}"`,
      "    }",
      "  ]",
    ].join("\n");
    await fs.writeFile(workFile, workText.replace('  "entries": []', evidenceEntries), "utf8");
  }

  it("lists non-terminal specs by default", async () => {
    await createSpecWorkspace(rootDir, { title: "One" });
    await createSpecWorkspace(rootDir, { title: "Two" });

    await editSpecStatus(rootDir, { specKey: "SEA-1", toStatus: "active" });
    await editSpecStatus(rootDir, { specKey: "SEA-1", toStatus: "done" });

    const activeOnly = await listSpecs(rootDir);
    expect(activeOnly.map((item) => item.specKey)).toEqual(["SEA-2"]);

    const all = await listSpecs(rootDir, { all: true });
    expect(all.map((item) => item.specKey)).toEqual(["SEA-1", "SEA-2"]);

    const done = await listSpecs(rootDir, { status: "done" });
    expect(done.map((item) => item.specKey)).toEqual(["SEA-1"]);
  });

  it("fails fast when work frontmatter is malformed", async () => {
    await createSpecWorkspace(rootDir, { title: "Malformed frontmatter" });

    const filePath = workPath(rootDir, "SEA-1");
    const current = await readTextFile(filePath);
    const broken = current.replace("\n---\n\n# Work", "\n\n# Work");
    await fs.writeFile(filePath, broken, "utf8");

    const report = await checkWorkspace(rootDir);
    expect(
      report.problems.some((problem) => problem.message.includes("Frontmatter parse error")),
    ).toBe(true);
  });

  it("edits status with contract hash and reopen clearing", async () => {
    await createSpecWorkspace(rootDir, { title: "Transition" });

    const toActive = await editSpecStatus(rootDir, { specKey: "SEA-1", toStatus: "active" });
    expect(toActive.fromStatus).toBe("planned");
    expect(toActive.toStatus).toBe("active");

    const toDone = await editSpecStatus(rootDir, { specKey: "SEA-1", toStatus: "done" });
    expect(toDone.contractHash).toMatch(/^[0-9a-f]{64}$/i);

    const doneWork = await readTextFile(workPath(rootDir, "SEA-1"));
    expect(doneWork).toContain("status: done");
    expect(doneWork).toContain("contractHash:");

    await editSpecStatus(rootDir, { specKey: "SEA-1", toStatus: "active" });
    const reopenedWork = await readTextFile(workPath(rootDir, "SEA-1"));
    expect(reopenedWork).toContain("status: active");
    expect(reopenedWork).not.toContain("contractHash:");
  });

  it("requires passing machine evidence for done specs", async () => {
    await createSpecWorkspace(rootDir, { title: "Done gate" });
    await fillSpecContract("SEA-1");

    await editSpecStatus(rootDir, { specKey: "SEA-1", toStatus: "active" });
    await editSpecStatus(rootDir, { specKey: "SEA-1", toStatus: "done" });

    const report = await checkWorkspace(rootDir);
    expect(
      report.problems.some((problem) =>
        problem.message.includes(
          "done status requires at least one passing machine-verifiable evidence entry",
        ),
      ),
    ).toBe(true);
  });

  it("accepts passing artifact evidence for done gate", async () => {
    await createSpecWorkspace(rootDir, { title: "Evidence pass" });
    await fillSpecContract("SEA-1");
    await setArtifactEvidence("SEA-1");

    await editSpecStatus(rootDir, { specKey: "SEA-1", toStatus: "active" });
    await editSpecStatus(rootDir, { specKey: "SEA-1", toStatus: "done" });

    const report = await checkWorkspace(rootDir);
    expect(
      report.problems.some((problem) => problem.message.includes("machine-verifiable evidence")),
    ).toBe(false);
    expect(report.problems.some((problem) => problem.message.startsWith("Evidence:"))).toBe(false);
  });

  it("ignores existing trace.jsonl files", async () => {
    await createSpecWorkspace(rootDir, { title: "Ignore trace" });
    await fillSpecContract("SEA-1");
    await setArtifactEvidence("SEA-1");

    await fs.writeFile(path.join(rootDir, ".seal", "specs", "SEA-1", "trace.jsonl"), "{bad-json\n", "utf8");

    await editSpecStatus(rootDir, { specKey: "SEA-1", toStatus: "active" });
    await editSpecStatus(rootDir, { specKey: "SEA-1", toStatus: "done" });

    const report = await checkWorkspace(rootDir);
    expect(report.problems).toEqual([]);
  });
});
