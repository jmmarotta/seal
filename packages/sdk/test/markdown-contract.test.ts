import { describe, expect, it } from "bun:test";

import {
  extractSectionBody,
  findHeadingLine,
  firstNonEmptyLine,
  validateRequiredSectionsInOrder,
} from "../src/markdown-contract";

describe("markdown contract helpers", () => {
  it("ignores fenced headings during required section checks", () => {
    const body = [
      "# Spec",
      "",
      "```md",
      "## Objective",
      "```",
      "",
      "## Requirements",
      "- Must be real",
      "",
    ].join("\n");

    const errors = validateRequiredSectionsInOrder(body, ["## Objective", "## Requirements"]);
    expect(errors).toContain("Missing required section: ## Objective");
  });

  it("extracts section body until the next same-or-higher heading", () => {
    const body = [
      "# Spec",
      "",
      "## Objective",
      "Primary objective.",
      "",
      "### Detail",
      "Nested detail.",
      "",
      "## Requirements",
      "- Requirement",
      "",
    ].join("\n");

    expect(extractSectionBody(body, "## Objective")).toBe(
      "Primary objective.\n\n### Detail\nNested detail.\n",
    );
  });

  it("returns the first non-empty line without trimming", () => {
    expect(firstNonEmptyLine("\n  # Heading\n")).toBe("  # Heading");
  });

  it("finds heading lines outside fenced blocks", () => {
    const body = ["```md", "## Objective", "```", "## Objective", "body"].join("\n");
    expect(findHeadingLine(body, "## Objective")).toBe(3);
  });
});
