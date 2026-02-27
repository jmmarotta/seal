import { NON_TERMINAL_WORK_STATUSES, type WorkStatus } from "./constants";
import { parseFrontmatter } from "./frontmatter";
import { listSpecKeys, readTextFile } from "./io";
import { specPath, workPath } from "./paths";
import { workStatusSchema } from "./schemas/primitives";
import { compareSpecKeys } from "./spec-key";

export interface SpecSummary {
  specKey: string;
  status: WorkStatus;
  title: string;
}

export interface ListSpecsOptions {
  all?: boolean;
  status?: WorkStatus;
}

function parseFrontmatterOrThrow(
  specKey: string,
  text: string,
  fileKind: "spec" | "work",
): ReturnType<typeof parseFrontmatter> {
  const parsed = parseFrontmatter(text);
  if (!parsed.hasFrontmatter) {
    throw new Error(`Missing frontmatter in ${fileKind} file for ${specKey}`);
  }
  if (parsed.error) {
    throw new Error(
      `Frontmatter parse error in ${fileKind} file for ${specKey}: ${parsed.error.message}`,
    );
  }
  return parsed;
}

function parseTitle(specKey: string, text: string): string {
  const body = parseFrontmatterOrThrow(specKey, text, "spec").body;
  const match = body.match(/^#\s+(.+)$/m);
  return match?.[1]?.trim() || specKey;
}

function parseStatus(specKey: string, text: string): WorkStatus {
  const { data } = parseFrontmatterOrThrow(specKey, text, "work");
  const parsed = workStatusSchema.safeParse(data.status);
  if (!parsed.success) {
    throw new Error(`Invalid status in work file for ${specKey}: ${String(data.status)}`);
  }
  return parsed.data;
}

function shouldInclude(summary: SpecSummary, options: ListSpecsOptions): boolean {
  if (options.status) {
    return summary.status === options.status;
  }
  if (options.all) {
    return true;
  }
  return (NON_TERMINAL_WORK_STATUSES as readonly string[]).includes(summary.status);
}

export async function listSpecs(
  rootDir: string | undefined,
  options: ListSpecsOptions = {},
): Promise<SpecSummary[]> {
  const keys = await listSpecKeys(rootDir);
  const sorted = [...keys].sort(compareSpecKeys);

  const summaries: SpecSummary[] = [];
  for (const specKey of sorted) {
    const [specText, workText] = await Promise.all([
      readTextFile(specPath(rootDir, specKey)),
      readTextFile(workPath(rootDir, specKey)),
    ]);

    const summary: SpecSummary = {
      specKey,
      status: parseStatus(specKey, workText),
      title: parseTitle(specKey, specText),
    };

    if (shouldInclude(summary, options)) {
      summaries.push(summary);
    }
  }

  return summaries;
}
