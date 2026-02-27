import { createHash } from "node:crypto";
import * as path from "node:path";

import {
  LEARNINGS_SCHEMA,
  NON_TERMINAL_WORK_STATUSES,
  SPEC_SCHEMA,
  WORK_SCHEMA,
  type LearningStatus,
  type WorkStatus,
} from "../constants";
import {
  evaluateEvidenceForSpec,
  parseEvidencePayload,
  validateEvidencePayload,
  type EvidenceEntry,
} from "../evidence";
import { getString, parseFrontmatter } from "../frontmatter";
import { fileExists, readTextFile } from "../io";
import {
  extractSectionBody,
  firstNonEmptyLine,
  validateRequiredSectionsInOrder,
} from "../markdown-contract";
import { parseInvariantDeltas } from "../invariants";
import { validateLearningsBody } from "../learnings";
import { invariantPath, learningsPath, specPath, specsDir, workPath } from "../paths";
import {
  contractHashSchema,
  learningsFrontmatterSchema,
  specFrontmatterSchema,
  workFrontmatterSchema,
} from "../schemas/frontmatter";
import { firstIssue, hasPathIssue } from "../schemas/errors";
import { specKeySchema } from "../schemas/primitives";
import { isWorkStatus } from "../status";
import {
  addProblem,
  type CheckOptions,
  type CheckProblem,
  type InvariantDeltaRecord,
} from "./shared";

const REQUIRED_SPEC_SECTIONS = [
  "## Objective",
  "## Requirements",
  "## Contract",
  "### Interface",
  "### Invariants",
  "## Verification Intent",
  "## Invariant Deltas",
] as const;

const REQUIRED_WORK_SECTIONS = [
  "## Plan",
  "## Deliverables",
  "## Verification",
  "## Review",
  "## Evidence",
] as const;

function canonicalSpecText(text: string): string {
  return text.replace(/\r\n/g, "\n");
}

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function parseStatus(value: string | undefined): WorkStatus | null {
  if (!value) {
    return null;
  }
  if (!isWorkStatus(value)) {
    return null;
  }
  return value;
}

function normalizeDocsPath(value: string): string | null {
  const normalized = value.trim().replace(/\\/g, "/").replace(/^\.\//, "");
  if (!normalized.startsWith("docs/") || !normalized.endsWith(".md")) {
    return null;
  }

  const segments = normalized.split("/");
  if (
    segments.length < 2 ||
    segments.some((segment) => !segment || segment === "." || segment === "..")
  ) {
    return null;
  }

  const canonical = path.posix.normalize(normalized);
  if (canonical !== normalized || !canonical.startsWith("docs/")) {
    return null;
  }

  return canonical;
}

interface DocsPathsParseResult {
  paths: string[];
  invalidPaths: string[];
}

function docsPathsFromDeliverables(text: string): DocsPathsParseResult {
  const regex = /`?((?:\.\/)?docs\/[A-Za-z0-9._/\\-]+\.md)`?/g;
  const paths = new Set<string>();
  const invalidPaths = new Set<string>();

  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    const captured = match[1];
    if (captured) {
      const normalized = normalizeDocsPath(captured);
      if (normalized) {
        paths.add(normalized);
      } else {
        invalidPaths.add(captured.replace(/\\/g, "/"));
      }
    }
  }

  return {
    paths: [...paths].sort((a, b) => a.localeCompare(b)),
    invalidPaths: [...invalidPaths].sort((a, b) => a.localeCompare(b)),
  };
}

export interface CheckSpecWorkspaceInput {
  rootDir: string;
  specKey: string;
  options: CheckOptions;
  problems: CheckProblem[];
  invariantKeys: ReadonlySet<string>;
  artifactHashCache: Map<string, string>;
}

export interface CheckSpecWorkspaceResult {
  invariantDeltaRecord?: InvariantDeltaRecord;
}

export async function checkSpecWorkspace(
  input: CheckSpecWorkspaceInput,
): Promise<CheckSpecWorkspaceResult> {
  const { rootDir, specKey, options, problems, invariantKeys, artifactHashCache } = input;
  let invariantDeltaRecord: InvariantDeltaRecord | undefined;

  if (!specKeySchema.safeParse(specKey).success) {
    addProblem(
      problems,
      path.join(specsDir(rootDir), specKey),
      "Invalid spec workspace key format",
    );
  }

  const specFile = specPath(rootDir, specKey);
  const workFile = workPath(rootDir, specKey);

  for (const requiredFile of [specFile, workFile]) {
    if (!(await fileExists(requiredFile))) {
      addProblem(problems, requiredFile, "Missing required file");
    }
  }
  if (!(await fileExists(specFile)) || !(await fileExists(workFile))) {
    return { invariantDeltaRecord };
  }

  const specText = await readTextFile(specFile);
  const workText = await readTextFile(workFile);

  const learningsFile = learningsPath(rootDir, specKey);
  let learningStatus: LearningStatus | null = null;

  const specFm = parseFrontmatter(specText);
  if (!specFm.hasFrontmatter) {
    addProblem(problems, specFile, "Missing frontmatter");
  } else {
    if (specFm.error) {
      addProblem(problems, specFile, `Frontmatter parse error: ${specFm.error.message}`);
    }

    const frontmatter = specFrontmatterSchema.safeParse(specFm.data);
    if (!frontmatter.success) {
      if (hasPathIssue(frontmatter.error, "schema")) {
        addProblem(problems, specFile, `Invalid schema (expected ${SPEC_SCHEMA})`);
      }
      if (hasPathIssue(frontmatter.error, "specKey")) {
        addProblem(problems, specFile, "Invalid or missing specKey");
      }
      if (
        !hasPathIssue(frontmatter.error, "schema") &&
        !hasPathIssue(frontmatter.error, "specKey")
      ) {
        const issue = firstIssue(frontmatter.error);
        addProblem(problems, specFile, `Invalid spec frontmatter: ${issue.path} ${issue.message}`);
      }
    } else if (frontmatter.data.specKey !== specKey) {
      addProblem(problems, specFile, `specKey mismatch (expected ${specKey})`);
    }

    const firstLine = firstNonEmptyLine(specFm.body);
    if (!firstLine || !/^#\s+\S/.test(firstLine)) {
      addProblem(problems, specFile, "Missing required top-level title heading");
    }

    for (const error of validateRequiredSectionsInOrder(specFm.body, REQUIRED_SPEC_SECTIONS)) {
      addProblem(problems, specFile, error);
    }

    const objective = extractSectionBody(specFm.body, "## Objective");
    if (objective !== null && !objective.trim()) {
      addProblem(problems, specFile, "Objective section must be non-empty");
    }

    const requirements = extractSectionBody(specFm.body, "## Requirements");
    if (requirements !== null && !requirements.trim()) {
      addProblem(problems, specFile, "Requirements section must be non-empty");
    }

    const invariantDeltas = extractSectionBody(specFm.body, "## Invariant Deltas");
    if (invariantDeltas !== null) {
      const parsedDeltas = parseInvariantDeltas(invariantDeltas);
      for (const error of parsedDeltas.errors) {
        addProblem(problems, specFile, error);
      }

      invariantDeltaRecord = {
        specKey,
        specFile,
        introduced: parsedDeltas.introduced,
        updated: parsedDeltas.updated,
        retired: parsedDeltas.retired,
      };
    }

    const referencedInvariants = new Set((specFm.body.match(/\bINV-\d+\b/g) ?? []).map(String));
    for (const key of referencedInvariants) {
      if (!invariantKeys.has(key) && !(await fileExists(invariantPath(rootDir, key)))) {
        addProblem(problems, specFile, `Referenced invariant not found: ${key}`);
      }
    }
  }

  const workFm = parseFrontmatter(workText);
  let status: WorkStatus | null = null;
  let hasPassingMachineEvidence = false;
  let docsDeliverablePaths: string[] = [];
  let validatedEvidenceEntries: EvidenceEntry[] = [];

  if (!workFm.hasFrontmatter) {
    addProblem(problems, workFile, "Missing frontmatter");
  } else {
    if (workFm.error) {
      addProblem(problems, workFile, `Frontmatter parse error: ${workFm.error.message}`);
    }

    const frontmatter = workFrontmatterSchema.safeParse(workFm.data);
    if (!frontmatter.success) {
      if (hasPathIssue(frontmatter.error, "schema")) {
        addProblem(problems, workFile, `Invalid schema (expected ${WORK_SCHEMA})`);
      }
      if (hasPathIssue(frontmatter.error, "specKey")) {
        addProblem(problems, workFile, "Invalid or missing specKey");
      }
      if (hasPathIssue(frontmatter.error, "status")) {
        addProblem(problems, workFile, "Invalid or missing status");
      }
      if (hasPathIssue(frontmatter.error, "contractHash")) {
        addProblem(problems, workFile, "Invalid contractHash");
      }

      if (
        !hasPathIssue(frontmatter.error, "schema") &&
        !hasPathIssue(frontmatter.error, "specKey") &&
        !hasPathIssue(frontmatter.error, "status") &&
        !hasPathIssue(frontmatter.error, "contractHash")
      ) {
        const issue = firstIssue(frontmatter.error);
        addProblem(problems, workFile, `Invalid work frontmatter: ${issue.path} ${issue.message}`);
      }

      status = parseStatus(getString(workFm.data, "status"));
    } else {
      status = frontmatter.data.status;
      if (frontmatter.data.specKey !== specKey) {
        addProblem(problems, workFile, `specKey mismatch (expected ${specKey})`);
      }
    }

    const firstLine = firstNonEmptyLine(workFm.body);
    if ((firstLine ?? "").trim() !== `# Work for ${specKey}`) {
      addProblem(problems, workFile, `Missing required heading: # Work for ${specKey}`);
    }

    for (const error of validateRequiredSectionsInOrder(workFm.body, REQUIRED_WORK_SECTIONS)) {
      addProblem(problems, workFile, error);
    }

    const deliverables = extractSectionBody(workFm.body, "## Deliverables") ?? "";
    const parsedDocsPaths = docsPathsFromDeliverables(deliverables);
    docsDeliverablePaths = parsedDocsPaths.paths;

    for (const invalidPath of parsedDocsPaths.invalidPaths) {
      addProblem(problems, workFile, `Deliverables contains invalid docs path: ${invalidPath}`);
    }

    if (
      /\bdocs?\b/i.test(deliverables) &&
      !docsDeliverablePaths.length &&
      parsedDocsPaths.invalidPaths.length === 0
    ) {
      addProblem(
        problems,
        workFile,
        "Deliverables references docs updates but does not list docs/<file>.md paths",
      );
    }

    for (const docsPath of docsDeliverablePaths) {
      const absolute = path.join(rootDir, docsPath);
      if (!(await fileExists(absolute))) {
        addProblem(problems, workFile, `Deliverables references missing docs file: ${docsPath}`);
      }
    }

    const evidence = parseEvidencePayload(workFm.body);
    if (!evidence.found) {
      addProblem(problems, workFile, "Missing required section: ## Evidence");
    } else if (evidence.error || !evidence.payload) {
      addProblem(problems, workFile, `Evidence: ${evidence.error ?? "invalid payload"}`);
    } else {
      const validation = validateEvidencePayload(evidence.payload);
      validatedEvidenceEntries = validation.entries;

      for (const message of validation.errors) {
        addProblem(problems, workFile, `Evidence: ${message}`);
      }

      const evidenceResult = await evaluateEvidenceForSpec(
        rootDir,
        specKey,
        validation.entries,
        artifactHashCache,
      );
      for (const message of evidenceResult.errors) {
        addProblem(problems, workFile, `Evidence: ${message}`);
      }

      hasPassingMachineEvidence = evidenceResult.hasPassingMachineEvidence;
    }

    const contractHash = getString(workFm.data, "contractHash");
    if (status === "done") {
      if (!contractHash || !contractHashSchema.safeParse(contractHash).success) {
        addProblem(problems, workFile, "done status requires valid contractHash");
      } else {
        const actual = sha256(canonicalSpecText(specText));
        if (actual.toLowerCase() !== contractHash.toLowerCase()) {
          addProblem(problems, workFile, "contractHash does not match canonical spec.md content");
        }
      }
    } else if (contractHash) {
      addProblem(problems, workFile, "contractHash must be omitted unless status=done");
    }
  }

  if (status === "done" && !hasPassingMachineEvidence) {
    addProblem(
      problems,
      workFile,
      "done status requires at least one passing machine-verifiable evidence entry",
    );
  }

  if (options.strictDocsEvidence && status === "done" && docsDeliverablePaths.length) {
    const docsEvidencePaths = new Set(
      validatedEvidenceEntries
        .filter(
          (entry) =>
            entry.proofType === "artifact" && entry.status === "pass" && Boolean(entry.docsPath),
        )
        .map((entry) => normalizeDocsPath(entry.docsPath ?? ""))
        .filter((docsPath): docsPath is string => docsPath !== null),
    );

    for (const docsPath of docsDeliverablePaths) {
      if (!docsEvidencePaths.has(docsPath)) {
        addProblem(
          problems,
          workFile,
          `Strict docs evidence requires artifact entry with docsPath=${docsPath}`,
        );
      }
    }
  }

  if (await fileExists(learningsFile)) {
    const learningsText = await readTextFile(learningsFile);
    const learningsFm = parseFrontmatter(learningsText);

    if (!learningsFm.hasFrontmatter) {
      addProblem(problems, learningsFile, "Missing frontmatter");
    } else {
      if (learningsFm.error) {
        addProblem(
          problems,
          learningsFile,
          `Frontmatter parse error: ${learningsFm.error.message}`,
        );
      }

      const frontmatter = learningsFrontmatterSchema.safeParse(learningsFm.data);
      if (!frontmatter.success) {
        if (hasPathIssue(frontmatter.error, "schema")) {
          addProblem(problems, learningsFile, `Invalid schema (expected ${LEARNINGS_SCHEMA})`);
        }
        if (hasPathIssue(frontmatter.error, "specKey")) {
          addProblem(problems, learningsFile, "Invalid or missing specKey");
        }
        if (hasPathIssue(frontmatter.error, "status")) {
          addProblem(problems, learningsFile, "Invalid or missing learnings status");
        }

        if (
          !hasPathIssue(frontmatter.error, "schema") &&
          !hasPathIssue(frontmatter.error, "specKey") &&
          !hasPathIssue(frontmatter.error, "status")
        ) {
          const issue = firstIssue(frontmatter.error);
          addProblem(
            problems,
            learningsFile,
            `Invalid learnings frontmatter: ${issue.path} ${issue.message}`,
          );
        }
      } else {
        learningStatus = frontmatter.data.status;
        if (frontmatter.data.specKey !== specKey) {
          addProblem(problems, learningsFile, `specKey mismatch (expected ${specKey})`);
        }
        for (const error of validateLearningsBody(learningsFm.body, specKey, learningStatus)) {
          addProblem(problems, learningsFile, error);
        }
      }
    }
  }

  if (
    status &&
    !(NON_TERMINAL_WORK_STATUSES as readonly string[]).includes(status) &&
    status !== "done" &&
    status !== "canceled"
  ) {
    addProblem(problems, workFile, `Invalid status: ${status}`);
  }

  return { invariantDeltaRecord };
}
