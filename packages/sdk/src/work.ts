import { createHash } from "node:crypto";

import { type WorkStatus } from "./constants";
import { parseFrontmatter, renderFrontmatter } from "./frontmatter";
import { atomicWriteText, readTextFile } from "./io";
import { withLock } from "./lock";
import { specPath, workPath } from "./paths";
import { workFrontmatterSchema } from "./schemas/frontmatter";
import { firstIssue } from "./schemas/errors";
import { specKeySchema, workStatusSchema } from "./schemas/primitives";
import { canTransitionWorkStatus } from "./status";

export interface EditStatusInput {
  specKey: string;
  toStatus: WorkStatus;
}

export interface EditStatusResult {
  specKey: string;
  fromStatus: WorkStatus;
  toStatus: WorkStatus;
  workPath: string;
  contractHash?: string;
}

function validateSpecKey(specKey: string): void {
  if (!specKeySchema.safeParse(specKey).success) {
    throw new Error(`Invalid spec key: ${specKey}`);
  }
}

function canonicalSpecText(text: string): string {
  return text.replace(/\r\n/g, "\n");
}

function toStringMap(data: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === "string") {
      out[key] = value;
    }
  }
  return out;
}

function assertTransition(fromStatus: WorkStatus, toStatus: WorkStatus): void {
  if (canTransitionWorkStatus(fromStatus, toStatus)) {
    return;
  }
  throw new Error(`Invalid status transition: ${fromStatus} -> ${toStatus}`);
}

export async function editSpecStatus(
  rootDir: string | undefined,
  input: EditStatusInput,
): Promise<EditStatusResult> {
  const specKey = input.specKey.trim().toUpperCase();
  validateSpecKey(specKey);

  const toStatusParsed = workStatusSchema.safeParse(input.toStatus);
  if (!toStatusParsed.success) {
    throw new Error(`Invalid status: ${String(input.toStatus)}`);
  }

  const toStatus = toStatusParsed.data;

  return withLock(rootDir, async () => {
    const workFile = workPath(rootDir, specKey);
    const workText = await readTextFile(workFile);
    const parsed = parseFrontmatter(workText);

    if (!parsed.hasFrontmatter) {
      throw new Error(`Missing frontmatter in ${workFile}`);
    }

    if (parsed.error) {
      throw new Error(`Frontmatter parse error in ${workFile}: ${parsed.error.message}`);
    }

    const frontmatter = workFrontmatterSchema.safeParse(parsed.data);
    if (!frontmatter.success) {
      const issue = firstIssue(frontmatter.error);
      throw new Error(`Invalid work frontmatter in ${workFile}: ${issue.path} ${issue.message}`);
    }

    if (frontmatter.data.specKey !== specKey) {
      throw new Error(`specKey mismatch in ${workFile}: expected ${specKey}`);
    }

    const fromStatus = frontmatter.data.status;
    if (fromStatus === toStatus) {
      throw new Error(`Spec ${specKey} is already ${toStatus}`);
    }

    assertTransition(fromStatus, toStatus);

    const nextFrontmatter = toStringMap(parsed.data);
    nextFrontmatter.status = toStatus;

    let contractHash: string | undefined;
    if (toStatus === "done") {
      const specText = await readTextFile(specPath(rootDir, specKey));
      contractHash = createHash("sha256").update(canonicalSpecText(specText), "utf8").digest("hex");
      nextFrontmatter.contractHash = contractHash;
    } else {
      delete nextFrontmatter.contractHash;
    }

    const nextWorkText = `${renderFrontmatter(nextFrontmatter, ["schema", "specKey", "status", "contractHash"])}\n${parsed.body}`;
    await atomicWriteText(workFile, nextWorkText);

    return {
      specKey,
      fromStatus,
      toStatus,
      workPath: workFile,
      ...(contractHash ? { contractHash } : {}),
    };
  });
}
