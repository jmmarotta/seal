import { describe, expect, it } from "bun:test";

import { canTransitionWorkStatus, normalizeSpecKey } from "../src/index";
import {
  learningsFrontmatterSchema,
  specFrontmatterSchema,
  workFrontmatterSchema,
} from "../src/schemas/frontmatter";

describe("schema coverage", () => {
  it("validates spec frontmatter shape", () => {
    const parsed = specFrontmatterSchema.safeParse({
      schema: "seal.spec.md.v1",
      specKey: "SEA-1",
      extra: "ignored",
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.schema).toBe("seal.spec.md.v1");
      expect(parsed.data.specKey).toBe("SEA-1");
      expect((parsed.data as { extra?: unknown }).extra).toBeUndefined();
    }
  });

  it("validates work frontmatter contractHash format", () => {
    const valid = workFrontmatterSchema.safeParse({
      schema: "seal.work.md.v1",
      specKey: "SEA-2",
      status: "done",
      contractHash: "a".repeat(64),
    });
    expect(valid.success).toBe(true);

    const invalid = workFrontmatterSchema.safeParse({
      schema: "seal.work.md.v1",
      specKey: "SEA-2",
      status: "done",
      contractHash: "bad",
    });
    expect(invalid.success).toBe(false);
  });

  it("validates learnings status enum", () => {
    const valid = learningsFrontmatterSchema.safeParse({
      schema: "seal.learnings.md.v1",
      specKey: "SEA-3",
      status: "integrated-adapted",
    });
    expect(valid.success).toBe(true);

    const invalid = learningsFrontmatterSchema.safeParse({
      schema: "seal.learnings.md.v1",
      specKey: "SEA-3",
      status: "closed",
    });
    expect(invalid.success).toBe(false);
  });

  it("reuses shared spec key and transition helpers", () => {
    expect(normalizeSpecKey(" sea-9 ")).toBe("SEA-9");
    expect(() => normalizeSpecKey("9-sea")).toThrow("Invalid spec key");

    expect(canTransitionWorkStatus("planned", "active")).toBe(true);
    expect(canTransitionWorkStatus("done", "active")).toBe(true);
    expect(canTransitionWorkStatus("done", "done")).toBe(false);
    expect(canTransitionWorkStatus("canceled", "active")).toBe(false);
  });
});
