import type { InputParser } from "@stricli/core";
import { buildCommand } from "@stricli/core";

import {
  editSpecStatus,
  isWorkStatus,
  normalizeSpecKey,
  type WorkStatus,
} from "@jmmarotta/seal-sdk";

import type { SealCliContext } from "../types";
import { requireWorkspaceRoot } from "../workspace";

const statusParser: InputParser<WorkStatus> = (input: string) => {
  const value = input.toLowerCase();
  if (isWorkStatus(value)) {
    return value as WorkStatus;
  }
  throw new Error(`Invalid status: ${input}`);
};

const specKeyParser: InputParser<string> = (input: string) => {
  return normalizeSpecKey(input);
};

export const editStatusCommand = buildCommand({
  func: async function (this: SealCliContext, _flags: {}, specKey: string, status: WorkStatus) {
    const root = await requireWorkspaceRoot(this.cwd);
    const result = await editSpecStatus(root, {
      specKey,
      toStatus: status,
    });

    this.process.stdout.write(`${result.specKey} ${result.fromStatus} -> ${result.toStatus}\n`);
  },
  parameters: {
    flags: {},
    positional: {
      kind: "tuple",
      parameters: [
        {
          brief: "Spec key",
          parse: specKeyParser,
        },
        {
          brief: "Target status",
          parse: statusParser,
        },
      ],
    },
  },
  docs: {
    brief: "Edit spec status",
  },
});
