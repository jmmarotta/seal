import type { FlagParametersForType, InputParser } from "@stricli/core";
import { buildCommand } from "@stricli/core";

import { isWorkStatus, listSpecs, type WorkStatus } from "@jmmarotta/seal-sdk";

import type { SealCliContext } from "../types";
import { requireWorkspaceRoot } from "../workspace";

interface ListFlags {
  all?: boolean;
  status?: WorkStatus;
}

const statusParser: InputParser<WorkStatus> = (input: string) => {
  const value = input.toLowerCase();
  if (isWorkStatus(value)) {
    return value as WorkStatus;
  }
  throw new Error(`Invalid status: ${input}`);
};

const listFlags: FlagParametersForType<ListFlags, SealCliContext> = {
  all: {
    kind: "boolean",
    brief: "Include done and canceled specs",
    optional: true,
  },
  status: {
    kind: "parsed",
    parse: statusParser,
    brief: "Filter by status",
    optional: true,
  },
};

export const listCommand = buildCommand({
  func: async function (this: SealCliContext, flags: ListFlags) {
    const root = await requireWorkspaceRoot(this.cwd);
    const summaries = await listSpecs(root, {
      all: flags.all ?? false,
      ...(flags.status ? { status: flags.status } : {}),
    });

    if (!summaries.length) {
      this.process.stdout.write("No specs.\n");
      return;
    }

    for (const summary of summaries) {
      this.process.stdout.write(`${summary.specKey} [${summary.status}] ${summary.title}\n`);
    }
  },
  parameters: {
    flags: listFlags,
    aliases: {
      a: "all",
      s: "status",
    },
  },
  docs: {
    brief: "List spec workspaces",
  },
});
