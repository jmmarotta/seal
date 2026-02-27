import * as path from "node:path";

import type { CheckReport } from "./check";

export interface RenderCheckReportOptions {
  rootDir?: string;
}

export function renderCheckReport(report: CheckReport, options?: RenderCheckReportOptions): string {
  const lines: string[] = [];
  lines.push(`specs: ${report.specs}`);
  lines.push(`invariants: ${report.invariants}`);
  lines.push(`inboxItems: ${report.inboxItems}`);
  lines.push(`problems: ${report.problems.length}`);

  if (report.problems.length) {
    lines.push("");
    for (const problem of report.problems) {
      const filePath =
        options?.rootDir && path.isAbsolute(problem.filePath)
          ? path.relative(options.rootDir, problem.filePath) || problem.filePath
          : problem.filePath;
      lines.push(`- [${problem.level}] ${filePath}: ${problem.message}`);
    }
  }

  return `${lines.join("\n")}\n`;
}
