import { INVARIANT_STATUSES, type InvariantStatus } from "./constants";
import {
  extractSectionBody,
  firstNonEmptyLine,
  validateRequiredSectionsInOrder,
} from "./markdown-contract";

const REQUIRED_INVARIANT_SECTIONS = [
  "## Statement",
  "## Scope",
  "## Verified By",
  "## Change History",
] as const;

export interface ParsedInvariantDeltas {
  introduced: string[];
  updated: string[];
  retired: string[];
  errors: string[];
}

function hasNonEmptyListEntry(text: string): boolean {
  return text
    .split(/\r?\n/)
    .some((line) => /^\s*([-*]|\d+\.)\s+/.test(line) && !/^\s*([-*]|\d+\.)\s+none\s*$/i.test(line));
}

function parseInvariantListValue(label: string, value: string, errors: string[]): string[] {
  const trimmed = value.trim();
  if (!trimmed) {
    errors.push(`${label} must list INV-<N> keys or none`);
    return [];
  }

  if (/^none$/i.test(trimmed)) {
    return [];
  }

  const parts = trimmed
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

  if (!parts.length) {
    errors.push(`${label} must list INV-<N> keys or none`);
    return [];
  }

  const keys: string[] = [];
  const seen = new Set<string>();

  for (const part of parts) {
    if (!/^INV-\d+$/.test(part)) {
      errors.push(`${label} contains invalid invariant key: ${part}`);
      continue;
    }
    if (seen.has(part)) {
      errors.push(`${label} contains duplicate invariant key: ${part}`);
      continue;
    }
    seen.add(part);
    keys.push(part);
  }

  return keys;
}

function parseInvariantDeltaLine(
  sectionBody: string,
  label: "Introduced" | "Updated" | "Retired",
  errors: string[],
): string[] {
  const pattern = new RegExp(`^\\s*-\\s*${label}\\s*:\\s*(.*)$`, "im");
  const match = sectionBody.match(pattern);
  if (!match) {
    errors.push(`Invariant Deltas missing ${label} entry`);
    return [];
  }

  return parseInvariantListValue(label, match[1] ?? "", errors);
}

export function isInvariantStatus(value: string): value is InvariantStatus {
  return (INVARIANT_STATUSES as readonly string[]).includes(value);
}

export function validateInvariantBody(body: string, status: InvariantStatus): string[] {
  const errors: string[] = [];
  const heading = firstNonEmptyLine(body);
  if (!heading || !/^#\s+\S/.test(heading)) {
    errors.push("Missing required top-level title heading");
  }

  errors.push(...validateRequiredSectionsInOrder(body, REQUIRED_INVARIANT_SECTIONS));

  if (status === "active") {
    const verifiedBy = extractSectionBody(body, "## Verified By");
    if (verifiedBy === null) {
      errors.push("Missing required section: ## Verified By");
    } else if (!hasNonEmptyListEntry(verifiedBy)) {
      errors.push("Active invariant must include at least one Verified By entry");
    }
  }

  return errors;
}

export function parseInvariantDeltas(sectionBody: string): ParsedInvariantDeltas {
  const errors: string[] = [];
  const introduced = parseInvariantDeltaLine(sectionBody, "Introduced", errors);
  const updated = parseInvariantDeltaLine(sectionBody, "Updated", errors);
  const retired = parseInvariantDeltaLine(sectionBody, "Retired", errors);

  return {
    introduced,
    updated,
    retired,
    errors,
  };
}
