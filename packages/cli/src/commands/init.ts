import type { FlagParametersForType } from "@stricli/core";
import { buildCommand } from "@stricli/core";

import { initWorkspace } from "@jmmarotta/seal-sdk";

import type { SealCliContext } from "../types";
import { findWorkspaceRoot } from "../workspace";

interface InitFlags {
  prefix: string;
}

const initFlags: FlagParametersForType<InitFlags, SealCliContext> = {
  prefix: {
    kind: "parsed",
    parse: String,
    brief: "Spec key prefix",
  },
};

export const initCommand = buildCommand({
  func: async function (this: SealCliContext, flags: InitFlags) {
    const root = (await findWorkspaceRoot(this.cwd)) ?? this.cwd;
    const result = await initWorkspace(root, flags.prefix);

    this.process.stdout.write(`Initialized SEAL workspace at ${result.sealDir}\n`);
    this.process.stdout.write(`Spec prefix: ${result.specPrefix}\n`);
  },
  parameters: {
    flags: initFlags,
    aliases: {
      p: "prefix",
    },
  },
  docs: {
    brief: "Initialize SEAL in this workspace",
  },
});
