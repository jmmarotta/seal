import type { FlagParametersForType, InputParser } from "@stricli/core";
import { buildCommand } from "@stricli/core";

import { createSpecWorkspace, isWorkStatus, type WorkStatus } from "@jmmarotta/seal-sdk";

import type { SealCliContext } from "../types";
import { requireWorkspaceRoot } from "../workspace";

interface NewFlags {
  status?: WorkStatus;
}

const NEW_ALLOWED_STATUSES = ["planned", "active", "blocked"] as const;

const statusParser: InputParser<WorkStatus> = (input: string) => {
  const value = input.toLowerCase();
  if (isWorkStatus(value) && (NEW_ALLOWED_STATUSES as readonly string[]).includes(value)) {
    return value as WorkStatus;
  }
  throw new Error(`Invalid status for seal new: ${input}`);
};

const newFlags: FlagParametersForType<NewFlags, SealCliContext> = {
  status: {
    kind: "parsed",
    parse: statusParser,
    brief: "Initial status (planned|active|blocked)",
    optional: true,
  },
};

export const newCommand = buildCommand({
  func: async function (this: SealCliContext, flags: NewFlags, title: string) {
    const root = await requireWorkspaceRoot(this.cwd);
    const created = await createSpecWorkspace(root, {
      title,
      ...(flags.status ? { status: flags.status } : {}),
    });

    this.process.stdout.write(`${created.specKey} ${created.workspacePath}\n`);
  },
  parameters: {
    flags: newFlags,
    aliases: {
      s: "status",
    },
    positional: {
      kind: "tuple",
      parameters: [
        {
          brief: "Spec title",
          parse: String,
        },
      ],
    },
  },
  docs: {
    brief: "Create a new spec workspace",
  },
});
