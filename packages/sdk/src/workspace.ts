import { ensureLayout } from "./io";

export async function ensureSeal(rootDir?: string): Promise<void> {
  await ensureLayout(rootDir);
}
