import { setConfig } from "./config";
import { fileExists, atomicWriteText } from "./io";
import { lockPath, inboxPath, resolveRoot, sealDir, configPath } from "./paths";
import { withLock } from "./lock";

const DEFAULT_INBOX = [
  "# INBOX",
  "",
  "Use `I-<N>` keys to capture ideas for promotion into specs.",
  "",
  "- I-1: Example idea",
  "  - Objective: Describe what should be true when complete.",
  "",
].join("\n");

export interface InitWorkspaceResult {
  rootDir: string;
  sealDir: string;
  configPath: string;
  inboxPath: string;
  specPrefix: string;
  createdInbox: boolean;
  lockPath: string;
}

export async function initWorkspace(
  rootDir: string | undefined,
  prefix: string,
): Promise<InitWorkspaceResult> {
  const normalizedRoot = resolveRoot(rootDir);

  const specPrefix = prefix.trim();
  if (!specPrefix) {
    throw new Error("Spec prefix is required. Run `seal init --prefix ABC`.");
  }

  return withLock(rootDir, async () => {
    await setConfig(rootDir, { specPrefix });

    const inboxFile = inboxPath(rootDir);
    let createdInbox = false;
    if (!(await fileExists(inboxFile))) {
      await atomicWriteText(inboxFile, DEFAULT_INBOX);
      createdInbox = true;
    }

    return {
      rootDir: normalizedRoot,
      sealDir: sealDir(rootDir),
      configPath: configPath(rootDir),
      inboxPath: inboxFile,
      specPrefix: specPrefix.toUpperCase(),
      createdInbox,
      lockPath: lockPath(rootDir),
    };
  });
}
