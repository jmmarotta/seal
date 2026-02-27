export interface MarkdownHeadingInfo {
  level: number;
}

export interface MarkdownRenderCallbacks {
  heading?: (children: string, info: MarkdownHeadingInfo) => string;
}

interface BunMarkdown {
  render: (input: string, callbacks?: MarkdownRenderCallbacks) => string;
}

interface BunYaml {
  parse: (input: string) => unknown;
}

interface BunGlobal {
  YAML?: BunYaml;
  markdown?: BunMarkdown;
}

function getBun(): BunGlobal {
  return (globalThis as { Bun?: BunGlobal }).Bun ?? {};
}

export function parseYaml(input: string): unknown {
  const bun = getBun();
  if (!bun.YAML?.parse) {
    throw new Error("Bun.YAML.parse unavailable");
  }
  return bun.YAML.parse(input);
}

export function tryRenderMarkdown(input: string, callbacks?: MarkdownRenderCallbacks): boolean {
  const bun = getBun();
  if (!bun.markdown?.render) {
    return false;
  }
  bun.markdown.render(input, callbacks);
  return true;
}
