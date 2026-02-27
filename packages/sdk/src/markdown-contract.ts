export interface MarkdownHeading {
  line: number;
  level: number;
  text: string;
}

type FenceMarker = "`" | "~";

function parseHeadingSpec(heading: string): { level: number; text: string } | null {
  const match = heading.trim().match(/^(#{1,6})\s+(.+?)\s*$/);
  if (!match) {
    return null;
  }

  const hashes = match[1];
  const headingText = match[2];
  if (!hashes || !headingText) {
    return null;
  }

  return {
    level: hashes.length,
    text: headingText.trim(),
  };
}

function fenceMarker(line: string): FenceMarker | null {
  const match = line.match(/^\s*(`{3,}|~{3,})/);
  if (!match) {
    return null;
  }

  const marker = match[1];
  if (!marker) {
    return null;
  }

  return marker.startsWith("`") ? "`" : "~";
}

function isFenceBoundary(line: string, marker: FenceMarker): boolean {
  if (marker === "`") {
    return /^\s*`{3,}/.test(line);
  }
  return /^\s*~{3,}/.test(line);
}

export function collectHeadings(text: string): MarkdownHeading[] {
  const lines = text.split(/\r?\n/);
  const headings: MarkdownHeading[] = [];
  let activeFence: FenceMarker | null = null;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] ?? "";

    if (activeFence) {
      if (isFenceBoundary(line, activeFence)) {
        activeFence = null;
      }
      continue;
    }

    const marker = fenceMarker(line);
    if (marker) {
      activeFence = marker;
      continue;
    }

    const headingMatch = line.match(/^\s{0,3}(#{1,6})\s+(.+?)\s*$/);
    if (!headingMatch) {
      continue;
    }

    const hashes = headingMatch[1];
    const headingText = headingMatch[2];
    if (!hashes || !headingText) {
      continue;
    }

    headings.push({
      line: i,
      level: hashes.length,
      text: headingText.trim(),
    });
  }

  return headings;
}

export function findHeadingLine(body: string, heading: string): number {
  const target = parseHeadingSpec(heading);
  if (!target) {
    return -1;
  }

  const match = collectHeadings(body).find(
    (item) => item.level === target.level && item.text === target.text,
  );
  return match ? match.line : -1;
}

export function validateRequiredSectionsInOrder(
  body: string,
  requiredSections: readonly string[],
): string[] {
  const headings = collectHeadings(body);
  const errors: string[] = [];
  let cursor = -1;

  for (const section of requiredSections) {
    const target = parseHeadingSpec(section);
    if (!target) {
      errors.push(`Missing required section: ${section}`);
      continue;
    }

    const match = headings.find((item) => item.level === target.level && item.text === target.text);
    if (!match) {
      errors.push(`Missing required section: ${section}`);
      continue;
    }

    if (match.line < cursor) {
      errors.push(`Section out of order: ${section}`);
    }
    cursor = match.line;
  }

  return errors;
}

export function extractSectionBody(body: string, heading: string): string | null {
  const target = parseHeadingSpec(heading);
  if (!target) {
    return null;
  }

  const headings = collectHeadings(body);
  const start = headings.find((item) => item.level === target.level && item.text === target.text);
  if (!start) {
    return null;
  }

  const lines = body.split(/\r?\n/);
  let end = lines.length;
  for (const headingEntry of headings) {
    if (headingEntry.line <= start.line) {
      continue;
    }
    if (headingEntry.level <= target.level) {
      end = headingEntry.line;
      break;
    }
  }

  return lines.slice(start.line + 1, end).join("\n");
}

export function firstNonEmptyLine(text: string): string | null {
  for (const line of text.split(/\r?\n/)) {
    if (line.trim()) {
      return line;
    }
  }
  return null;
}
