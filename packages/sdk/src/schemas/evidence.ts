import { z } from "zod";

import { nonEmptyStringSchema, unknownObjectSchema } from "./primitives";

const SHA256_REGEX = /^[0-9a-f]{64}$/i;
const DOCS_PATH_REGEX = /^(?:\.\/)?docs\/[A-Za-z0-9._/-]+\.md$/;

function isSafeDocsPath(value: string): boolean {
  if (!DOCS_PATH_REGEX.test(value)) {
    return false;
  }

  const normalized = value.replace(/^\.\//, "");
  if (!normalized.startsWith("docs/")) {
    return false;
  }

  const segments = normalized.split("/");
  if (segments.length < 2) {
    return false;
  }

  return segments.every((segment, index) => {
    if (!segment.length) {
      return false;
    }
    if (segment === "." || segment === "..") {
      return false;
    }
    if (index === 0) {
      return segment === "docs";
    }
    return true;
  });
}

export const evidencePayloadShapeSchema = unknownObjectSchema
  .extend({
    schema: z.string(),
    entries: z.array(z.unknown()),
  })
  .strip();

export const sha256Schema = z.string().trim().regex(SHA256_REGEX);
export const docsPathSchema = z.string().trim().refine(isSafeDocsPath, {
  message: "Invalid docs path",
});

export const artifactEvidenceFieldsSchema = unknownObjectSchema
  .extend({
    path: nonEmptyStringSchema,
    sha256: sha256Schema,
    docsPath: docsPathSchema.optional(),
  })
  .strip();

export const attestationEvidenceFieldsSchema = unknownObjectSchema
  .extend({
    provider: nonEmptyStringSchema,
    runId: nonEmptyStringSchema,
  })
  .strip();

export const noteEvidenceFieldsSchema = unknownObjectSchema
  .extend({
    note: nonEmptyStringSchema,
  })
  .strip();
