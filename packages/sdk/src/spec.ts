import { EVIDENCE_SCHEMA, SPEC_SCHEMA, WORK_SCHEMA, type WorkStatus } from "./constants";
import { resolveSpecPrefix } from "./config";
import { renderFrontmatter } from "./frontmatter";
import { atomicWriteText, ensureDir, ensureLayout, listSpecKeys } from "./io";
import { withLock } from "./lock";
import { artifactsDir, specDir, specPath, workPath } from "./paths";
import { isWorkStatus } from "./status";

const INITIAL_WORK_STATUSES: ReadonlySet<WorkStatus> = new Set(["planned", "active", "blocked"]);

export interface CreateSpecWorkspaceInput {
  title: string;
  status?: WorkStatus;
  prefix?: string;
}

export interface CreateSpecWorkspaceResult {
  specKey: string;
  workspacePath: string;
  specPath: string;
  workPath: string;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function allocateSpecKey(rootDir: string | undefined, prefix: string): Promise<string> {
  const specKeys = await listSpecKeys(rootDir);
  const pattern = new RegExp(`^${escapeRegExp(prefix)}-(\\d+)$`);

  let max = 0;
  for (const key of specKeys) {
    const match = key.match(pattern);
    if (!match) {
      continue;
    }
    const value = Number(match[1]);
    if (Number.isFinite(value) && value > max) {
      max = value;
    }
  }

  return `${prefix}-${max + 1}`;
}

function normalizeStatus(status?: WorkStatus): WorkStatus {
  if (!status) {
    return "planned";
  }

  if (!isWorkStatus(status)) {
    throw new Error(`Invalid status: ${status}`);
  }

  if (!INITIAL_WORK_STATUSES.has(status)) {
    throw new Error("`seal new` supports only planned|active|blocked statuses");
  }

  return status;
}

function renderSpecTemplate(specKey: string, title: string): string {
  const frontmatter = renderFrontmatter(
    {
      schema: SPEC_SCHEMA,
      specKey,
    },
    ["schema", "specKey"],
  );

  return [
    frontmatter,
    "",
    `# ${title.trim()}`,
    "",
    "## Objective",
    "",
    "## Requirements",
    "",
    "## Contract",
    "",
    "### Interface",
    "",
    "### Invariants",
    "",
    "## Verification Intent",
    "",
    "## Invariant Deltas",
    "",
    "- Introduced: none",
    "- Updated: none",
    "- Retired: none",
    "",
  ].join("\n");
}

function renderWorkTemplate(specKey: string, status: WorkStatus): string {
  const frontmatter = renderFrontmatter(
    {
      schema: WORK_SCHEMA,
      specKey,
      status,
    },
    ["schema", "specKey", "status"],
  );

  return [
    frontmatter,
    "",
    `# Work for ${specKey}`,
    "",
    "## Plan",
    "",
    "## Deliverables",
    "",
    "## Verification",
    "",
    "## Review",
    "",
    "## Evidence",
    "",
    "```json",
    "{",
    `  "schema": "${EVIDENCE_SCHEMA}",`,
    '  "entries": []',
    "}",
    "```",
    "",
  ].join("\n");
}

export async function createSpecWorkspace(
  rootDir: string | undefined,
  input: CreateSpecWorkspaceInput,
): Promise<CreateSpecWorkspaceResult> {
  const title = input.title.trim();
  if (!title) {
    throw new Error("Spec title is required");
  }

  return withLock(rootDir, async () => {
    await ensureLayout(rootDir);

    const prefix = await resolveSpecPrefix(rootDir, input.prefix);
    const status = normalizeStatus(input.status);
    const specKey = await allocateSpecKey(rootDir, prefix);

    const workspacePath = specDir(rootDir, specKey);
    const specFilePath = specPath(rootDir, specKey);
    const workFilePath = workPath(rootDir, specKey);

    await ensureDir(workspacePath);
    await ensureDir(artifactsDir(rootDir, specKey));
    await atomicWriteText(specFilePath, renderSpecTemplate(specKey, title));
    await atomicWriteText(workFilePath, renderWorkTemplate(specKey, status));

    return {
      specKey,
      workspacePath,
      specPath: specFilePath,
      workPath: workFilePath,
    };
  });
}
