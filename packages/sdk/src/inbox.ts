export interface InboxEntry {
  key: string;
  line: number;
}

export interface InboxParseResult {
  entries: InboxEntry[];
  errors: string[];
}

const TOP_LEVEL_VALID_KEY = /^-\s+(I-\d+)\b/;
const TOP_LEVEL_ANY_KEY = /^-\s+(I-[^\s:]+)\b/;
const NESTED_ANY_KEY = /^\s+-\s+(I-[^\s:]+)\b/;

export function parseInbox(text: string): InboxParseResult {
  const entries: InboxEntry[] = [];
  const errors: string[] = [];
  const lines = text.split(/\r?\n/);

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] ?? "";
    const lineNumber = i + 1;

    const validTopLevel = line.match(TOP_LEVEL_VALID_KEY);
    if (validTopLevel?.[1]) {
      entries.push({ key: validTopLevel[1], line: lineNumber });
      continue;
    }

    const invalidTopLevel = line.match(TOP_LEVEL_ANY_KEY);
    if (invalidTopLevel?.[1]) {
      errors.push(`line ${lineNumber}: invalid inbox key ${invalidTopLevel[1]} (expected I-<N>)`);
      continue;
    }

    const nestedKey = line.match(NESTED_ANY_KEY);
    if (nestedKey?.[1]) {
      errors.push(`line ${lineNumber}: inbox item ${nestedKey[1]} must be a top-level bullet`);
    }
  }

  return { entries, errors };
}

export function findDuplicateInboxKeys(entries: readonly InboxEntry[]): string[] {
  const counts = new Map<string, number>();
  for (const entry of entries) {
    counts.set(entry.key, (counts.get(entry.key) ?? 0) + 1);
  }

  const duplicates: string[] = [];
  for (const [key, count] of counts) {
    if (count > 1) {
      duplicates.push(key);
    }
  }

  duplicates.sort((a, b) => a.localeCompare(b));
  return duplicates;
}
