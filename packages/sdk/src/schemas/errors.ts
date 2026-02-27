import type { ZodError } from "zod";

function issuePath(path: readonly PropertyKey[]): string {
  if (!path.length) {
    return "<root>";
  }

  return path
    .map((part) => {
      if (typeof part === "number") {
        return `[${part}]`;
      }
      if (typeof part === "symbol") {
        return part.toString();
      }
      return part;
    })
    .join(".");
}

export function firstIssue(error: ZodError): { path: string; message: string } {
  const issue = error.issues[0];
  if (!issue) {
    return { path: "<root>", message: "validation failed" };
  }

  return {
    path: issuePath(issue.path),
    message: issue.message,
  };
}

export function hasPathIssue(error: ZodError, key: string): boolean {
  return error.issues.some((issue) => issue.path[0] === key);
}
