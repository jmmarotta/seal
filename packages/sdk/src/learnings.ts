import { LEARNINGS_SCHEMA, type LearningStatus } from "./constants";
import { renderFrontmatter } from "./frontmatter";
import { atomicWriteText, fileExists } from "./io";
import {
  findHeadingLine,
  firstNonEmptyLine,
  validateRequiredSectionsInOrder,
} from "./markdown-contract";
import { learningsPath } from "./paths";
import { learningStatusSchema, specKeySchema } from "./schemas/primitives";

const REQUIRED_SECTIONS = ["## Generalizations", "## Proposed Integrations"] as const;
const RESOLUTION_SECTION = "## Resolution";

export interface EnsureLearningsFileResult {
  path: string;
  created: boolean;
}

export function isLearningStatus(value: string): value is LearningStatus {
  return learningStatusSchema.safeParse(value).success;
}

export function renderLearningsTemplate(
  specKey: string,
  status: LearningStatus = "pending",
): string {
  const frontmatter = renderFrontmatter(
    {
      schema: LEARNINGS_SCHEMA,
      specKey,
      status,
    },
    ["schema", "specKey", "status"],
  );

  return [
    frontmatter,
    "",
    `# Learnings for ${specKey}`,
    "",
    "## Generalizations",
    "",
    "## Proposed Integrations",
    "",
    "## Resolution",
    "",
  ].join("\n");
}

export function validateLearningsBody(
  body: string,
  specKey: string,
  status: LearningStatus,
): string[] {
  const errors: string[] = [];

  const heading = firstNonEmptyLine(body)?.trim();
  if (heading !== `# Learnings for ${specKey}`) {
    errors.push(`Missing required heading: # Learnings for ${specKey}`);
  }

  errors.push(...validateRequiredSectionsInOrder(body, REQUIRED_SECTIONS));

  let cursor = -1;
  for (const section of REQUIRED_SECTIONS) {
    const line = findHeadingLine(body, section);
    if (line >= 0) {
      cursor = Math.max(cursor, line);
    }
  }

  const resolutionLine = findHeadingLine(body, RESOLUTION_SECTION);
  if (status !== "pending" && resolutionLine < 0) {
    errors.push(`Missing required section: ${RESOLUTION_SECTION}`);
  }

  if (resolutionLine >= 0 && resolutionLine < cursor) {
    errors.push(`Section out of order: ${RESOLUTION_SECTION}`);
  }

  return errors;
}

export async function ensureLearningsFile(
  rootDir: string | undefined,
  specKeyInput: string,
  statusInput: LearningStatus = "pending",
): Promise<EnsureLearningsFileResult> {
  const specKey = specKeyInput.trim().toUpperCase();
  if (!specKeySchema.safeParse(specKey).success) {
    throw new Error(`Invalid spec key: ${specKeyInput}`);
  }

  const statusParsed = learningStatusSchema.safeParse(statusInput);
  if (!statusParsed.success) {
    throw new Error(`Invalid learnings status: ${String(statusInput)}`);
  }

  const filePath = learningsPath(rootDir, specKey);
  const exists = await fileExists(filePath);
  if (exists) {
    return { path: filePath, created: false };
  }

  await atomicWriteText(filePath, renderLearningsTemplate(specKey, statusParsed.data));
  return { path: filePath, created: true };
}
