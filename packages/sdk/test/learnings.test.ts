import { afterEach, beforeEach, describe, expect, it } from "bun:test";

import {
  ensureLearningsFile,
  initWorkspace,
  parseFrontmatter,
  readTextFile,
  validateLearningsBody,
} from "../src/index";
import { cleanupTempRoot, createTempRoot, fileExists } from "./helpers";

describe("learnings module", () => {
  let rootDir: string;

  beforeEach(async () => {
    rootDir = await createTempRoot();
    await initWorkspace(rootDir, "SEA");
  });

  afterEach(async () => {
    await cleanupTempRoot(rootDir);
  });

  it("creates learnings file on first need", async () => {
    const first = await ensureLearningsFile(rootDir, "SEA-1");
    expect(first.created).toBe(true);
    expect(await fileExists(first.path)).toBe(true);

    const second = await ensureLearningsFile(rootDir, "SEA-1");
    expect(second.created).toBe(false);
  });

  it("requires resolution section once learnings leave pending", async () => {
    const created = await ensureLearningsFile(rootDir, "SEA-1", "integrated");
    const text = await readTextFile(created.path);
    const parsed = parseFrontmatter(text);
    const withoutResolutionBody = parsed.body.replace(/^## Resolution\s*$/m, "");

    const errors = validateLearningsBody(withoutResolutionBody, "SEA-1", "integrated");
    expect(errors).toContain("Missing required section: ## Resolution");
  });
});
