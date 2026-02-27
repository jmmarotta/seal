import * as path from "node:path";

import { INVARIANT_SCHEMA } from "../constants";
import { parseFrontmatter } from "../frontmatter";
import { listInvariantFiles, readTextFile } from "../io";
import { validateInvariantBody } from "../invariants";
import { invariantFrontmatterSchema } from "../schemas/frontmatter";
import { firstIssue, hasPathIssue } from "../schemas/errors";
import { addProblem, type CheckProblem } from "./shared";

export interface InvariantFilesResult {
  invariantFiles: string[];
  invariantKeys: Set<string>;
  invariantStatuses: Map<string, string>;
}

export async function checkInvariantFiles(
  rootDir: string,
  problems: CheckProblem[],
): Promise<InvariantFilesResult> {
  const invariantFiles = await listInvariantFiles(rootDir);
  const invariantKeys = new Set<string>();
  const invariantStatuses = new Map<string, string>();

  for (const filePath of invariantFiles) {
    const text = await readTextFile(filePath);
    const parsed = parseFrontmatter(text);
    if (!parsed.hasFrontmatter) {
      addProblem(problems, filePath, "Missing frontmatter");
      continue;
    }
    if (parsed.error) {
      addProblem(problems, filePath, `Frontmatter parse error: ${parsed.error.message}`);
      continue;
    }

    const frontmatter = invariantFrontmatterSchema.safeParse(parsed.data);
    if (!frontmatter.success) {
      if (hasPathIssue(frontmatter.error, "schema")) {
        addProblem(problems, filePath, `Invalid schema (expected ${INVARIANT_SCHEMA})`);
      }
      if (hasPathIssue(frontmatter.error, "invariantKey")) {
        addProblem(problems, filePath, "Invalid or missing invariantKey");
      }
      if (hasPathIssue(frontmatter.error, "status")) {
        addProblem(problems, filePath, "Invalid or missing invariant status");
      }

      if (
        !hasPathIssue(frontmatter.error, "schema") &&
        !hasPathIssue(frontmatter.error, "invariantKey") &&
        !hasPathIssue(frontmatter.error, "status")
      ) {
        const issue = firstIssue(frontmatter.error);
        addProblem(
          problems,
          filePath,
          `Invalid invariant frontmatter: ${issue.path} ${issue.message}`,
        );
      }
      continue;
    }

    const { invariantKey, status } = frontmatter.data;
    invariantKeys.add(invariantKey);
    const expected = path.basename(filePath, ".md");
    if (expected !== invariantKey) {
      addProblem(problems, filePath, `invariantKey does not match filename (${expected})`);
    }

    invariantStatuses.set(invariantKey, status);

    for (const error of validateInvariantBody(parsed.body, status)) {
      addProblem(problems, filePath, error);
    }
  }

  return {
    invariantFiles,
    invariantKeys,
    invariantStatuses,
  };
}
