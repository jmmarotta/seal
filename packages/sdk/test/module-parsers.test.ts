import { createHash } from "node:crypto";
import * as fs from "node:fs/promises";
import * as path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "bun:test";

import {
  evaluateEvidenceForSpec,
  parseEvidencePayload,
  parseInbox,
  parseInvariantDeltas,
  validateEvidencePayload,
  validateInvariantBody,
} from "../src/index";
import { cleanupTempRoot, createTempRoot } from "./helpers";

describe("parser modules", () => {
  let rootDir: string;

  beforeEach(async () => {
    rootDir = await createTempRoot();
  });

  afterEach(async () => {
    await cleanupTempRoot(rootDir);
  });

  it("parses inbox entries and reports malformed keys", () => {
    const parsed = parseInbox([
      "- I-1: Valid",
      "  - I-2: Nested should fail",
      "- I-two: Invalid key",
      "- note: ignore",
    ].join("\n"));

    expect(parsed.entries.map((entry) => entry.key)).toEqual(["I-1"]);
    expect(parsed.errors.some((message) => message.includes("must be a top-level bullet"))).toBe(true);
    expect(parsed.errors.some((message) => message.includes("invalid inbox key"))).toBe(true);
  });

  it("parses invariant deltas and validates invariant body", () => {
    const deltas = parseInvariantDeltas([
      "- Introduced: INV-1, INV-2",
      "- Updated: none",
      "- Retired: INV-3",
    ].join("\n"));

    expect(deltas.errors).toEqual([]);
    expect(deltas.introduced).toEqual(["INV-1", "INV-2"]);
    expect(deltas.updated).toEqual([]);
    expect(deltas.retired).toEqual(["INV-3"]);

    const invariantErrors = validateInvariantBody(
      [
        "# Invariant",
        "",
        "## Statement",
        "Applies always.",
        "",
        "## Scope",
        "All commands.",
        "",
        "## Verified By",
        "- none",
        "",
        "## Change History",
        "- Initial.",
      ].join("\n"),
      "active",
    );

    expect(
      invariantErrors.some((message) => message.includes("at least one Verified By entry")),
    ).toBe(true);
  });

  it("parses and validates evidence payload", async () => {
    const parsed = parseEvidencePayload([
      "# Work for SEA-1",
      "",
      "## Evidence",
      "",
      "```json",
      '{"schema":"seal.evidence.v1","entries":[{"proofType":"note","status":"info","note":"manual"}]}',
      "```",
    ].join("\n"));

    expect(parsed.found).toBe(true);
    expect(parsed.error).toBeUndefined();
    expect(parsed.payload?.schema).toBe("seal.evidence.v1");

    const validation = validateEvidencePayload({
      schema: "seal.evidence.v1",
      entries: [
        {
          proofType: "artifact",
          status: "pass",
          path: "../escape.txt",
          sha256: "a".repeat(64),
        },
      ],
    });

    expect(validation.errors).toEqual([]);

    const evaluated = await evaluateEvidenceForSpec(rootDir, "SEA-1", validation.entries);
    expect(evaluated.errors.some((message) => message.includes("safe path"))).toBe(true);
  });

  it("reports evidence schema and entry validation errors", () => {
    const validation = validateEvidencePayload({
      schema: "wrong.evidence.schema",
      entries: [
        {
          proofType: "artifact",
          status: "pass",
          path: "artifacts/proof.txt",
          sha256: "bad-hash",
        },
        {
          proofType: "unknown-proof",
          status: "pass",
        },
      ],
    });

    expect(validation.errors).toContain("schema must be seal.evidence.v1");
    expect(
      validation.errors.some((message) => message.includes("sha256 must be 64 hex characters")),
    ).toBe(true);
    expect(
      validation.errors.some((message) => message.includes("proofType must be one of")),
    ).toBe(true);
  });

  it("rejects docsPath traversal segments", () => {
    const validation = validateEvidencePayload({
      schema: "seal.evidence.v1",
      entries: [
        {
          proofType: "artifact",
          status: "pass",
          path: "artifacts/proof.txt",
          sha256: "a".repeat(64),
          docsPath: "docs/../secret.md",
        },
      ],
    });

    expect(validation.errors.some((message) => message.includes("docsPath must be docs/<file>.md"))).toBe(
      true,
    );
  });

  it("rejects artifact symlink escapes outside spec workspace", async () => {
    const artifactsRoot = path.join(rootDir, ".seal", "specs", "SEA-1", "artifacts");
    await fs.mkdir(artifactsRoot, { recursive: true });

    const outsideFile = path.join(rootDir, "outside-proof.txt");
    await fs.writeFile(outsideFile, "outside-proof", "utf8");
    const outsideHash = createHash("sha256").update("outside-proof", "utf8").digest("hex");

    const symlinkPath = path.join(artifactsRoot, "escaped-proof.txt");
    await fs.symlink(outsideFile, symlinkPath);

    const validation = validateEvidencePayload({
      schema: "seal.evidence.v1",
      entries: [
        {
          proofType: "artifact",
          status: "pass",
          path: "artifacts/escaped-proof.txt",
          sha256: outsideHash,
        },
      ],
    });

    expect(validation.errors).toEqual([]);

    const evaluated = await evaluateEvidenceForSpec(rootDir, "SEA-1", validation.entries);
    expect(evaluated.errors.some((message) => message.includes("safe path under .seal/specs/SEA-1"))).toBe(
      true,
    );
  });

  it("does not treat attestation-only evidence as machine-verifiable done proof", async () => {
    const validation = validateEvidencePayload({
      schema: "seal.evidence.v1",
      entries: [
        {
          proofType: "attestation",
          status: "pass",
          provider: "ci",
          runId: "123",
        },
      ],
    });

    expect(validation.errors).toEqual([]);

    const evaluated = await evaluateEvidenceForSpec(rootDir, "SEA-1", validation.entries);
    expect(evaluated.errors).toEqual([]);
    expect(evaluated.hasPassingMachineEvidence).toBe(false);
  });
});
