import { checkInvariantDeltas } from "./check/invariant-deltas";
import { checkInvariantFiles } from "./check/invariant-files";
import { type InvariantDeltaRecord } from "./check/shared";
import { checkSpecWorkspace } from "./check/spec-workspace";
import { checkWorkspaceStructure } from "./check/workspace-structure";
import { listSpecKeys } from "./io";
import { compareSpecKeys } from "./spec-key";
import type { CheckOptions, CheckProblem, CheckReport } from "./check/shared";

export type { CheckOptions, CheckProblem, CheckReport } from "./check/shared";

export async function checkWorkspace(
  rootDir?: string,
  options: CheckOptions = {},
): Promise<CheckReport> {
  const workspaceRoot = rootDir ?? process.cwd();
  const problems: CheckProblem[] = [];

  const { inboxItems } = await checkWorkspaceStructure(workspaceRoot, problems);
  const invariantResult = await checkInvariantFiles(workspaceRoot, problems);

  const specKeys = (await listSpecKeys(workspaceRoot)).sort(compareSpecKeys);
  const artifactHashCache = new Map<string, string>();
  const invariantDeltaRecords: InvariantDeltaRecord[] = [];

  for (const specKey of specKeys) {
    const specResult = await checkSpecWorkspace({
      rootDir: workspaceRoot,
      specKey,
      options,
      problems,
      invariantKeys: invariantResult.invariantKeys,
      artifactHashCache,
    });
    if (specResult.invariantDeltaRecord) {
      invariantDeltaRecords.push(specResult.invariantDeltaRecord);
    }
  }

  checkInvariantDeltas(invariantDeltaRecords, invariantResult.invariantStatuses, problems);

  return {
    problems,
    specs: specKeys.length,
    invariants: invariantResult.invariantFiles.length,
    inboxItems,
  };
}
