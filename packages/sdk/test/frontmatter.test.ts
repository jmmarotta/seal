import { describe, expect, it } from "bun:test";

import { getString, parseFrontmatter, renderFrontmatter } from "../src/index";

describe("frontmatter", () => {
  it("parses valid frontmatter", () => {
    const input = `---\nschema: seal.spec.md.v1\nspecKey: SEA-1\n---\n# Title\n`;
    const parsed = parseFrontmatter(input);

    expect(parsed.hasFrontmatter).toBe(true);
    expect(parsed.error).toBeUndefined();
    expect(getString(parsed.data, "schema")).toBe("seal.spec.md.v1");
    expect(getString(parsed.data, "specKey")).toBe("SEA-1");
    expect(parsed.body).toBe("# Title\n");
  });

  it("returns original body when frontmatter is absent", () => {
    const input = "# Title\n";
    const parsed = parseFrontmatter(input);

    expect(parsed.hasFrontmatter).toBe(false);
    expect(parsed.body).toBe(input);
    expect(parsed.data).toEqual({});
  });

  it("reports unclosed frontmatter delimiters", () => {
    const input = "---\nschema: seal.spec.md.v1\nspecKey: SEA-1\n# Title\n";
    const parsed = parseFrontmatter(input);

    expect(parsed.hasFrontmatter).toBe(true);
    expect(parsed.error?.message).toContain("missing closing");
  });

  it("renders frontmatter in stable order", () => {
    const rendered = renderFrontmatter(
      {
        specKey: "SEA-2",
        schema: "seal.spec.md.v1",
      },
      ["schema", "specKey"],
    );

    expect(rendered).toBe("---\nschema: seal.spec.md.v1\nspecKey: SEA-2\n---");
  });
});
