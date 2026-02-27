import { createHash } from "node:crypto";
import * as fs from "node:fs/promises";
import * as path from "node:path";

import {
  EVIDENCE_PROOF_TYPES,
  EVIDENCE_SCHEMA,
  EVIDENCE_STATUSES,
  type EvidenceProofType,
  type EvidenceStatus,
} from "./constants";
import { specDir } from "./paths";
import {
  artifactEvidenceFieldsSchema,
  attestationEvidenceFieldsSchema,
  docsPathSchema,
  evidencePayloadShapeSchema,
  noteEvidenceFieldsSchema,
  sha256Schema,
} from "./schemas/evidence";
import { firstIssue, hasPathIssue } from "./schemas/errors";
import {
  evidenceProofTypeSchema,
  evidenceStatusSchema,
  nonEmptyStringSchema,
  unknownObjectSchema,
} from "./schemas/primitives";

interface JsonObject {
  [key: string]: unknown;
}

export interface EvidencePayload {
  schema: string;
  entries: unknown[];
}

export interface EvidenceParseResult {
  found: boolean;
  payload?: EvidencePayload;
  error?: string;
}

export interface EvidenceEntry {
  index: number;
  proofType: EvidenceProofType;
  status: EvidenceStatus;
  path?: string;
  sha256?: string;
  docsPath?: string;
  provider?: string;
  runId?: string;
  note?: string;
}

export interface EvidenceValidationResult {
  entries: EvidenceEntry[];
  errors: string[];
}

export interface EvidenceEvaluationResult {
  errors: string[];
  hasPassingMachineEvidence: boolean;
}

function getRequiredString(
  value: JsonObject,
  key: string,
  addError: (message: string) => void,
): string | undefined {
  const parsed = nonEmptyStringSchema.safeParse(value[key]);
  if (!parsed.success) {
    addError(`${key} is required`);
    return undefined;
  }
  return parsed.data;
}

function findEvidenceSection(body: string): { found: boolean; content?: string; error?: string } {
  const lines = body.split(/\r?\n/);
  const indexes: number[] = [];

  for (let i = 0; i < lines.length; i += 1) {
    const match = lines[i]?.match(/^##\s+(.+)$/);
    if (!match) {
      continue;
    }
    const heading = match[1]?.trim().toLowerCase();
    if (heading === "evidence") {
      indexes.push(i);
    }
  }

  if (!indexes.length) {
    return { found: false };
  }

  if (indexes.length > 1) {
    return { found: true, error: "Multiple ## Evidence sections found" };
  }

  const start = (indexes[0] ?? 0) + 1;
  let end = lines.length;
  for (let i = start; i < lines.length; i += 1) {
    if (/^##\s+/.test(lines[i] ?? "")) {
      end = i;
      break;
    }
  }

  return {
    found: true,
    content: lines.slice(start, end).join("\n"),
  };
}

function parseEvidenceJson(section: string): { payload?: EvidencePayload; error?: string } {
  const fenceRegex = /```([^\n`]*)\n([\s\S]*?)```/g;
  const matches = [...section.matchAll(fenceRegex)];

  if (matches.length !== 1) {
    return { error: "Evidence section must contain exactly one fenced JSON block" };
  }

  const match = matches[0];
  if (!match) {
    return { error: "Evidence section must contain exactly one fenced JSON block" };
  }

  const blockStart = match.index ?? 0;
  const before = section.slice(0, blockStart).trim();
  const after = section.slice(blockStart + match[0].length).trim();
  if (before || after) {
    return { error: "Evidence section must contain only a fenced JSON block" };
  }

  const language = match[1]?.trim().toLowerCase() ?? "";
  if (language !== "json") {
    return { error: "Evidence block must use ```json" };
  }

  const source = match[2]?.trim() ?? "";
  if (!source) {
    return { error: "Evidence JSON payload is empty" };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(source);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { error: `Evidence JSON parse error: ${message}` };
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { error: "Evidence JSON payload must be an object" };
  }

  const payloadParsed = evidencePayloadShapeSchema.safeParse(parsed);
  if (!payloadParsed.success) {
    if (hasPathIssue(payloadParsed.error, "schema")) {
      return { error: "Evidence payload requires string schema" };
    }
    if (hasPathIssue(payloadParsed.error, "entries")) {
      return { error: "Evidence payload requires entries array" };
    }

    const issue = firstIssue(payloadParsed.error);
    return { error: `Evidence JSON payload invalid: ${issue.path} ${issue.message}` };
  }

  return {
    payload: {
      schema: payloadParsed.data.schema,
      entries: payloadParsed.data.entries,
    },
  };
}

// Artifact evidence must resolve under the spec workspace root. Absolute paths and
// traversal outside that boundary are rejected to prevent escape-by-path input.
function isPathWithinBase(baseDir: string, absolutePath: string): boolean {
  const relative = path.relative(baseDir, absolutePath);
  return !(relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative));
}

function resolveArtifactPathForSpec(
  rootDir: string | undefined,
  specKey: string,
  artifactPath: string,
): string | undefined {
  if (!artifactPath.trim() || path.isAbsolute(artifactPath)) {
    return undefined;
  }

  const normalized = path.normalize(artifactPath);
  if (!normalized || normalized === ".") {
    return undefined;
  }
  if (normalized === ".." || normalized.startsWith(`..${path.sep}`)) {
    return undefined;
  }

  const baseDir = specDir(rootDir, specKey);
  const absolute = path.resolve(baseDir, normalized);
  if (!isPathWithinBase(baseDir, absolute)) {
    return undefined;
  }

  return absolute;
}

async function resolveArtifactRealPathForSpec(
  rootDir: string | undefined,
  specKey: string,
  artifactAbsolutePath: string,
): Promise<string | undefined> {
  const baseDir = specDir(rootDir, specKey);
  const [realBaseDir, realArtifactPath] = await Promise.all([
    fs.realpath(baseDir),
    fs.realpath(artifactAbsolutePath),
  ]);

  if (!isPathWithinBase(realBaseDir, realArtifactPath)) {
    return undefined;
  }

  return realArtifactPath;
}

async function sha256File(filePath: string): Promise<string> {
  const value = await fs.readFile(filePath);
  return createHash("sha256").update(value).digest("hex");
}

export function parseEvidencePayload(body: string): EvidenceParseResult {
  const section = findEvidenceSection(body);
  if (!section.found) {
    return { found: false };
  }

  if (section.error) {
    return { found: true, error: section.error };
  }

  const parsed = parseEvidenceJson(section.content ?? "");
  if (parsed.error) {
    return { found: true, error: parsed.error };
  }

  if (!parsed.payload) {
    return { found: true, error: "Evidence payload missing" };
  }

  return {
    found: true,
    payload: parsed.payload,
  };
}

export function validateEvidencePayload(payload: EvidencePayload): EvidenceValidationResult {
  const errors: string[] = [];
  const entries: EvidenceEntry[] = [];

  if (payload.schema !== EVIDENCE_SCHEMA) {
    errors.push(`schema must be ${EVIDENCE_SCHEMA}`);
  }

  for (let index = 0; index < payload.entries.length; index += 1) {
    const value = payload.entries[index];
    let hasError = false;
    const addError = (message: string) => {
      errors.push(`entries[${index}]: ${message}`);
      hasError = true;
    };

    const objectParsed = unknownObjectSchema.safeParse(value);
    if (!objectParsed.success) {
      addError("must be an object");
      continue;
    }

    const entry = objectParsed.data;
    const proofTypeRaw = getRequiredString(entry, "proofType", addError);
    const statusRaw = getRequiredString(entry, "status", addError);
    if (!proofTypeRaw || !statusRaw) {
      continue;
    }

    const proofTypeParsed = evidenceProofTypeSchema.safeParse(proofTypeRaw);
    if (!proofTypeParsed.success) {
      addError(`proofType must be one of ${EVIDENCE_PROOF_TYPES.join("|")}`);
    }

    const statusParsed = evidenceStatusSchema.safeParse(statusRaw);
    if (!statusParsed.success) {
      addError(`status must be one of ${EVIDENCE_STATUSES.join("|")}`);
    }

    if (hasError || !proofTypeParsed.success || !statusParsed.success) {
      continue;
    }

    const proofType = proofTypeParsed.data;
    const status = statusParsed.data;

    const evidence: EvidenceEntry = {
      index,
      proofType,
      status,
    };

    if (proofType === "artifact") {
      const artifactFields = artifactEvidenceFieldsSchema.safeParse(entry);
      if (!artifactFields.success) {
        evidence.path = getRequiredString(entry, "path", addError);
        const sha256 = getRequiredString(entry, "sha256", addError);
        if (sha256 && !sha256Schema.safeParse(sha256).success) {
          addError("sha256 must be 64 hex characters");
        }

        const docsPath = getRequiredString(entry, "docsPath", () => {});
        if (docsPath && !docsPathSchema.safeParse(docsPath).success) {
          addError("docsPath must be docs/<file>.md");
        }
        if (docsPath && docsPathSchema.safeParse(docsPath).success) {
          evidence.docsPath = docsPath.replace(/^\.\//, "");
        }
      } else {
        evidence.path = artifactFields.data.path;
        evidence.sha256 = artifactFields.data.sha256.toLowerCase();
        evidence.docsPath = artifactFields.data.docsPath?.replace(/^\.\//, "");
      }
    }

    if (proofType === "attestation") {
      const attestationFields = attestationEvidenceFieldsSchema.safeParse(entry);
      if (!attestationFields.success) {
        evidence.provider = getRequiredString(entry, "provider", addError);
        evidence.runId = getRequiredString(entry, "runId", addError);
      } else {
        evidence.provider = attestationFields.data.provider;
        evidence.runId = attestationFields.data.runId;
      }
    }

    if (proofType === "note") {
      const noteFields = noteEvidenceFieldsSchema.safeParse(entry);
      if (!noteFields.success) {
        evidence.note = getRequiredString(entry, "note", addError);
      } else {
        evidence.note = noteFields.data.note;
      }
    }

    if (hasError) {
      continue;
    }

    entries.push(evidence);
  }

  return { entries, errors };
}

export async function evaluateEvidenceForSpec(
  rootDir: string | undefined,
  specKey: string,
  entries: readonly EvidenceEntry[],
  hashCache?: Map<string, string>,
): Promise<EvidenceEvaluationResult> {
  const errors: string[] = [];
  let hasPassingMachineEvidence = false;
  const cache = hashCache ?? new Map<string, string>();

  for (const entry of entries) {
    if (entry.proofType === "note") {
      continue;
    }

    let entryValid = true;

    if (entry.proofType === "artifact") {
      if (!entry.path || !entry.sha256) {
        continue;
      }

      const artifactPath = resolveArtifactPathForSpec(rootDir, specKey, entry.path);
      if (!artifactPath) {
        errors.push(
          `entries[${entry.index}]: path must be a safe path under .seal/specs/${specKey}/`,
        );
        continue;
      }

      let resolvedArtifactPath = artifactPath;
      try {
        const realArtifactPath = await resolveArtifactRealPathForSpec(
          rootDir,
          specKey,
          artifactPath,
        );
        if (!realArtifactPath) {
          errors.push(
            `entries[${entry.index}]: path must be a safe path under .seal/specs/${specKey}/`,
          );
          continue;
        }

        resolvedArtifactPath = realArtifactPath;
      } catch (error) {
        const code = (error as NodeJS.ErrnoException).code;
        if (code === "ENOENT") {
          errors.push(`entries[${entry.index}]: artifact does not exist at ${entry.path}`);
          continue;
        }
        throw error;
      }

      let actualSha = cache.get(resolvedArtifactPath);
      if (!actualSha) {
        try {
          actualSha = await sha256File(resolvedArtifactPath);
          cache.set(resolvedArtifactPath, actualSha);
        } catch (error) {
          const code = (error as NodeJS.ErrnoException).code;
          if (code === "ENOENT") {
            errors.push(`entries[${entry.index}]: artifact does not exist at ${entry.path}`);
            continue;
          }
          throw error;
        }
      }

      if (actualSha.toLowerCase() !== entry.sha256.toLowerCase()) {
        errors.push(`entries[${entry.index}]: sha256 does not match artifact contents`);
        entryValid = false;
      }
    }

    if (entryValid && entry.status === "pass" && entry.proofType === "artifact") {
      hasPassingMachineEvidence = true;
    }
  }

  return {
    errors,
    hasPassingMachineEvidence,
  };
}
