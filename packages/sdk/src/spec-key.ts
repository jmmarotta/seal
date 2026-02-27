import { specKeySchema } from "./schemas/primitives";

export interface ParsedSpecKey {
  prefix: string;
  number: number;
}

export function normalizeSpecKey(input: string): string {
  const normalized = input.trim().toUpperCase();
  if (!specKeySchema.safeParse(normalized).success) {
    throw new Error(`Invalid spec key: ${input}`);
  }
  return normalized;
}

export function parseSpecKey(value: string): ParsedSpecKey | null {
  if (!specKeySchema.safeParse(value).success) {
    return null;
  }

  const separator = value.lastIndexOf("-");
  if (separator <= 0) {
    return null;
  }

  const prefix = value.slice(0, separator);
  const numberRaw = value.slice(separator + 1);
  const number = Number(numberRaw);
  if (!Number.isInteger(number) || number < 1) {
    return null;
  }

  return { prefix, number };
}

export function compareSpecKeys(a: string, b: string): number {
  const left = parseSpecKey(a);
  const right = parseSpecKey(b);

  if (!left || !right) {
    return a.localeCompare(b);
  }

  if (left.prefix !== right.prefix) {
    return left.prefix.localeCompare(right.prefix);
  }

  return left.number - right.number;
}
