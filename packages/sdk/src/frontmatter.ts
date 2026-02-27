import { parseYaml } from "./bun";

export interface FrontmatterResult {
  data: Record<string, unknown>;
  body: string;
  hasFrontmatter: boolean;
  error?: Error;
}

// This parser reports malformed frontmatter delimiters as parse errors while still
// surfacing YAML parse errors when a frontmatter block is present.
export function parseFrontmatter(text: string): FrontmatterResult {
  const input = text.startsWith("\uFEFF") ? text.slice(1) : text;
  if (!input.startsWith("---")) {
    return { data: {}, body: text, hasFrontmatter: false };
  }

  const lines = input.split(/\r?\n/);
  if (lines[0]?.trim() !== "---") {
    return { data: {}, body: text, hasFrontmatter: false };
  }

  let endIndex = -1;
  for (let i = 1; i < lines.length; i += 1) {
    if (lines[i]?.trim() === "---") {
      endIndex = i;
      break;
    }
  }

  if (endIndex === -1) {
    return {
      data: {},
      body: input,
      hasFrontmatter: true,
      error: new Error("Frontmatter opening delimiter is missing closing ---"),
    };
  }

  const raw = lines.slice(1, endIndex).join("\n");
  let data: Record<string, unknown> = {};
  let error: Error | undefined;
  if (raw.trim()) {
    try {
      const parsed = parseYaml(raw);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        data = parsed as Record<string, unknown>;
      }
    } catch (caught) {
      error = caught instanceof Error ? caught : new Error(String(caught));
    }
  }

  const body = lines.slice(endIndex + 1).join("\n");
  return { data, body, hasFrontmatter: true, error };
}

export function getString(data: Record<string, unknown>, key: string): string | undefined {
  const value = data[key];
  return typeof value === "string" ? value : undefined;
}

export function renderFrontmatter(data: Record<string, string>, order: string[] = []): string {
  const lines: string[] = ["---"];
  const seen = new Set<string>();

  for (const key of order) {
    const value = data[key];
    if (value !== undefined) {
      lines.push(`${key}: ${value}`);
      seen.add(key);
    }
  }

  for (const key of Object.keys(data)) {
    if (seen.has(key)) {
      continue;
    }
    const value = data[key];
    if (value !== undefined) {
      lines.push(`${key}: ${value}`);
    }
  }

  lines.push("---");
  return lines.join("\n");
}
