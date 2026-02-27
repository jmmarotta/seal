import { createHash } from "node:crypto";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";

// Deterministic end-to-end gate: create a valid workspace and require `seal check --json`
// to return zero problems.
import {
  artifactsDir,
  createSpecWorkspace,
  editSpecStatus,
  initWorkspace,
  readTextFile,
  specPath,
  workPath,
} from "@jmmarotta/seal-sdk";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function fillSpecContract(rootDir: string, specKey: string): Promise<void> {
  const filePath = specPath(rootDir, specKey);
  const current = await readTextFile(filePath);
  const next = current
    .replace("## Objective\n\n", "## Objective\n\nCI workspace validation objective.\n\n")
    .replace("## Requirements\n\n", "## Requirements\n\n- CI workspace must be coherent.\n\n")
    .replace("### Interface\n\n", "### Interface\n\n- `seal check --json` reports no problems.\n\n")
    .replace("### Invariants\n\n", "### Invariants\n\n- Legacy models are not present.\n\n")
    .replace("## Verification Intent\n\n", "## Verification Intent\n\n- bun test\n\n");

  await fs.writeFile(filePath, next, "utf8");
}

async function setPassingArtifactEvidence(rootDir: string, specKey: string): Promise<void> {
  const proofPath = path.join(artifactsDir(rootDir, specKey), "ci-proof.txt");
  await fs.writeFile(proofPath, "ci-proof", "utf8");
  const proofHash = createHash("sha256").update("ci-proof", "utf8").digest("hex");

  const filePath = workPath(rootDir, specKey);
  const current = await readTextFile(filePath);
  const next = current.replace(
    '  "entries": []',
    [
      "  \"entries\": [",
      "    {",
      '      "proofType": "artifact",',
      '      "status": "pass",',
      '      "path": "artifacts/ci-proof.txt",',
      `      "sha256": "${proofHash}"`,
      "    }",
      "  ]",
    ].join("\n"),
  );

  await fs.writeFile(filePath, next, "utf8");
}

async function main(): Promise<void> {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "seal-ci-check-"));
  try {
    await initWorkspace(tempRoot, "SEA");
    const created = await createSpecWorkspace(tempRoot, { title: "CI check" });
    await fillSpecContract(tempRoot, created.specKey);
    await setPassingArtifactEvidence(tempRoot, created.specKey);

    await editSpecStatus(tempRoot, { specKey: created.specKey, toStatus: "active" });
    await editSpecStatus(tempRoot, { specKey: created.specKey, toStatus: "done" });

    const repoRoot = path.resolve(import.meta.dir, "..");
    const cliEntry = path.join(repoRoot, "packages", "cli", "src", "index.ts");
    const processResult = Bun.spawnSync(["bun", cliEntry, "check", "--json"], {
      cwd: tempRoot,
      stdout: "pipe",
      stderr: "pipe",
    });

    const stdout = Buffer.from(processResult.stdout).toString("utf8");
    const stderr = Buffer.from(processResult.stderr).toString("utf8");

    assert(processResult.exitCode === 0, `seal check failed: ${stderr || stdout}`);
    const report = JSON.parse(stdout) as { problems?: unknown[] };
    assert(Array.isArray(report.problems), "seal check --json did not emit a valid report");
    assert(report.problems.length === 0, `seal check reported problems:\n${stdout}`);
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
}

await main();
