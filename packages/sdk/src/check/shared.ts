export interface CheckProblem {
  filePath: string;
  message: string;
  level: "error" | "warning";
}

export interface CheckReport {
  problems: CheckProblem[];
  specs: number;
  invariants: number;
  inboxItems: number;
}

export interface CheckOptions {
  strictDocsEvidence?: boolean;
}

export interface InvariantDeltaRecord {
  specKey: string;
  specFile: string;
  introduced: string[];
  updated: string[];
  retired: string[];
}

export function addProblem(
  problems: CheckProblem[],
  filePath: string,
  message: string,
  level: "error" | "warning" = "error",
): void {
  problems.push({ filePath, message, level });
}
