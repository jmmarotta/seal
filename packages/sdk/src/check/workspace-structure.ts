import * as path from "node:path";

import { fileExists, readTextFile } from "../io";
import { findDuplicateInboxKeys, parseInbox } from "../inbox";
import { configPath, inboxPath, invariantsDir, sealDir, specsDir } from "../paths";
import { addProblem, type CheckProblem } from "./shared";

export interface WorkspaceStructureResult {
  inboxItems: number;
}

export async function checkWorkspaceStructure(
  rootDir: string,
  problems: CheckProblem[],
): Promise<WorkspaceStructureResult> {
  const sealRoot = sealDir(rootDir);
  const specsRoot = specsDir(rootDir);
  const invariantsRoot = invariantsDir(rootDir);
  const configFile = configPath(rootDir);
  const inboxFile = inboxPath(rootDir);

  if (await fileExists(path.join(rootDir, ".aglit"))) {
    addProblem(
      problems,
      path.join(rootDir, ".aglit"),
      "Legacy .aglit root is not supported in SEAL v1",
    );
  }

  for (const legacyPath of [path.join(sealRoot, "issues"), path.join(sealRoot, "projects")]) {
    if (await fileExists(legacyPath)) {
      addProblem(problems, legacyPath, "Legacy issue/project layout is not supported in SEAL v1");
    }
  }

  for (const requiredPath of [sealRoot, specsRoot, invariantsRoot, configFile, inboxFile]) {
    if (!(await fileExists(requiredPath))) {
      addProblem(problems, requiredPath, "Missing required path");
    }
  }

  let inboxItems = 0;
  if (await fileExists(inboxFile)) {
    const inbox = await readTextFile(inboxFile);
    const parsedInbox = parseInbox(inbox);
    inboxItems = parsedInbox.entries.length;

    for (const error of parsedInbox.errors) {
      addProblem(problems, inboxFile, error);
    }

    for (const duplicate of findDuplicateInboxKeys(parsedInbox.entries)) {
      addProblem(problems, inboxFile, `Duplicate inbox key: ${duplicate}`);
    }
  }

  return { inboxItems };
}
