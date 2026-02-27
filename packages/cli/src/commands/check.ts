import type { FlagParametersForType } from "@stricli/core";
import { buildCommand } from "@stricli/core";

import { checkWorkspace, renderCheckReport } from "@jmmarotta/seal-sdk";

import type { SealCliContext } from "../types";
import { requireWorkspaceRoot } from "../workspace";

interface CheckFlags {
  json?: boolean;
  strictDocsEvidence?: boolean;
}

const checkFlags: FlagParametersForType<CheckFlags, SealCliContext> = {
  json: {
    kind: "boolean",
    brief: "Emit machine-readable JSON report",
    optional: true,
  },
  strictDocsEvidence: {
    kind: "boolean",
    brief: "Require docs deliverables to map to artifact evidence docsPath entries",
    optional: true,
  },
};

export const checkCommand = buildCommand({
  func: async function (this: SealCliContext, flags: CheckFlags) {
    const root = await requireWorkspaceRoot(this.cwd);
    const report = await checkWorkspace(root, {
      strictDocsEvidence: flags.strictDocsEvidence ?? false,
    });

    if (flags.json) {
      this.process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
      return;
    }

    this.process.stdout.write(renderCheckReport(report, { rootDir: root }));
  },
  parameters: {
    flags: checkFlags,
    aliases: {
      j: "json",
      e: "strictDocsEvidence",
    },
  },
  docs: {
    brief: "Validate SEAL workspace state",
  },
});
