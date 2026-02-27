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
  invariantPath,
  readTextFile,
  specPath,
  workPath,
} from "../src/index";
import { cleanupTempRoot, createTempRoot } from "./helpers";

describe("checker hardening rules", () => {
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
      .replace("### Invariants\n\n", "### Invariants\n\n- Maintain contract integrity.\n\n")
      .replace("## Verification Intent\n\n", "## Verification Intent\n\n- bun test\n\n");

    await fs.writeFile(filePath, next, "utf8");
  }

  async function setWorkDeliverables(specKey: string, deliverables: string): Promise<void> {
    const filePath = workPath(rootDir, specKey);
    const current = await readTextFile(filePath);
    const next = current.replace(
      "## Deliverables\n\n## Verification",
      `## Deliverables\n\n${deliverables}\n\n## Verification`,
    );
    await fs.writeFile(filePath, next, "utf8");
  }

  async function setArtifactEvidence(
    specKey: string,
    options: { docsPath?: string },
  ): Promise<void> {
    const proofPath = path.join(artifactsDir(rootDir, specKey), "proof.txt");
    await fs.writeFile(proofPath, "proof", "utf8");
    const proofHash = createHash("sha256").update("proof", "utf8").digest("hex");

    const evidenceEntry = [
      "    {",
      '      "proofType": "artifact",',
      '      "status": "pass",',
      '      "path": "artifacts/proof.txt",',
      `      "sha256": "${proofHash}"${options.docsPath ? "," : ""}`,
      ...(options.docsPath ? [`      "docsPath": "${options.docsPath}"`] : []),
      "    }",
    ].join("\n");

    const filePath = workPath(rootDir, specKey);
    const current = await readTextFile(filePath);
    const next = current.replace(/"entries"\s*:\s*\[[\s\S]*?\]/, `"entries": [\n${evidenceEntry}\n  ]`);
    await fs.writeFile(filePath, next, "utf8");
  }

  it("reports missing docs files referenced by deliverables", async () => {
    await createSpecWorkspace(rootDir, { title: "Docs deliverable" });
    await setWorkDeliverables("SEA-1", "- docs/missing.md");

    const report = await checkWorkspace(rootDir);
    expect(
      report.problems.some((problem) =>
        problem.message.includes("Deliverables references missing docs file: docs/missing.md"),
      ),
    ).toBe(true);
  });

  it("rejects docs deliverable traversal paths", async () => {
    await createSpecWorkspace(rootDir, { title: "Invalid docs path" });
    await setWorkDeliverables("SEA-1", "- docs/../secret.md");

    const report = await checkWorkspace(rootDir);
    expect(
      report.problems.some((problem) =>
        problem.message.includes("Deliverables contains invalid docs path: docs/../secret.md"),
      ),
    ).toBe(true);
  });

  it("enforces optional strict docs evidence mapping", async () => {
    await createSpecWorkspace(rootDir, { title: "Strict docs evidence" });
    await fillSpecContract("SEA-1");

    await fs.mkdir(path.join(rootDir, "docs"), { recursive: true });
    await fs.writeFile(path.join(rootDir, "docs", "overview.md"), "# Overview\n", "utf8");

    await setWorkDeliverables("SEA-1", "- docs/overview.md");
    await setArtifactEvidence("SEA-1", {});

    await editSpecStatus(rootDir, { specKey: "SEA-1", toStatus: "active" });
    await editSpecStatus(rootDir, { specKey: "SEA-1", toStatus: "done" });

    const strictFailure = await checkWorkspace(rootDir, { strictDocsEvidence: true });
    expect(
      strictFailure.problems.some((problem) =>
        problem.message.includes("Strict docs evidence requires artifact entry with docsPath=docs/overview.md"),
      ),
    ).toBe(true);

    await setArtifactEvidence("SEA-1", { docsPath: "docs/overview.md" });
    const strictPass = await checkWorkspace(rootDir, { strictDocsEvidence: true });
    expect(
      strictPass.problems.some((problem) => problem.message.includes("Strict docs evidence requires")),
    ).toBe(false);
  });

  it("ignores fenced heading text for required section checks", async () => {
    await createSpecWorkspace(rootDir, { title: "Fenced headings" });
    const current = await readTextFile(specPath(rootDir, "SEA-1"));
    const next = current
      .replace("## Objective\n\n", "```md\n## Objective\n```\n\n")
      .replace("## Requirements\n\n", "## Requirements\n\n- Real requirement\n\n");

    await fs.writeFile(specPath(rootDir, "SEA-1"), next, "utf8");

    const report = await checkWorkspace(rootDir);
    expect(
      report.problems.some((problem) => problem.message.includes("Missing required section: ## Objective")),
    ).toBe(true);
  });

  it("detects overlapping and repeated invariant delta actions", async () => {
    await createSpecWorkspace(rootDir, { title: "Invariant one" });
    await createSpecWorkspace(rootDir, { title: "Invariant two" });

    const invariantFile = invariantPath(rootDir, "INV-1");
    await fs.writeFile(
      invariantFile,
      [
        "---",
        "schema: seal.invariant.md.v1",
        "invariantKey: INV-1",
        "status: active",
        "---",
        "",
        "# Invariant one",
        "",
        "## Statement",
        "Always true.",
        "",
        "## Scope",
        "All specs.",
        "",
        "## Verified By",
        "- bun test",
        "",
        "## Change History",
        "- Added.",
        "",
      ].join("\n"),
      "utf8",
    );

    const specOne = await readTextFile(specPath(rootDir, "SEA-1"));
    await fs.writeFile(
      specPath(rootDir, "SEA-1"),
      specOne.replace(
        "- Introduced: none\n- Updated: none\n- Retired: none",
        "- Introduced: INV-1\n- Updated: INV-1\n- Retired: none",
      ),
      "utf8",
    );

    const specTwo = await readTextFile(specPath(rootDir, "SEA-2"));
    await fs.writeFile(
      specPath(rootDir, "SEA-2"),
      specTwo.replace(
        "- Introduced: none\n- Updated: none\n- Retired: none",
        "- Introduced: INV-1\n- Updated: none\n- Retired: INV-1",
      ),
      "utf8",
    );

    const report = await checkWorkspace(rootDir);
    expect(
      report.problems.some((problem) =>
        problem.message.includes("cannot appear in multiple delta categories in one spec"),
      ),
    ).toBe(true);
    expect(
      report.problems.some((problem) =>
        problem.message.includes("Invariant INV-1 was already introduced by SEA-1"),
      ),
    ).toBe(true);
    expect(
      report.problems.some((problem) =>
        problem.message.includes("Invariant INV-1 is listed as retired but invariant file status is not retired"),
      ),
    ).toBe(true);
  });
});
