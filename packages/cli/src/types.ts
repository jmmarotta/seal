import type { CommandContext } from "@stricli/core";

export interface SealCliContext extends CommandContext {
  cwd: string;
}
