import { z } from "zod";

import { INVARIANT_SCHEMA, LEARNINGS_SCHEMA, SPEC_SCHEMA, WORK_SCHEMA } from "../constants";
import {
  invariantStatusSchema,
  learningStatusSchema,
  specKeySchema,
  unknownObjectSchema,
  workStatusSchema,
} from "./primitives";

const CONTRACT_HASH_REGEX = /^[0-9a-f]{64}$/i;

export const invariantKeySchema = z.string().regex(/^INV-\d+$/);
export const contractHashSchema = z.string().regex(CONTRACT_HASH_REGEX);

export const specFrontmatterSchema = unknownObjectSchema
  .extend({
    schema: z.literal(SPEC_SCHEMA),
    specKey: specKeySchema,
  })
  .strip();

export const workFrontmatterSchema = unknownObjectSchema
  .extend({
    schema: z.literal(WORK_SCHEMA),
    specKey: specKeySchema,
    status: workStatusSchema,
    contractHash: contractHashSchema.optional(),
  })
  .strip();

export const invariantFrontmatterSchema = unknownObjectSchema
  .extend({
    schema: z.literal(INVARIANT_SCHEMA),
    invariantKey: invariantKeySchema,
    status: invariantStatusSchema,
  })
  .strip();

export const learningsFrontmatterSchema = unknownObjectSchema
  .extend({
    schema: z.literal(LEARNINGS_SCHEMA),
    specKey: specKeySchema,
    status: learningStatusSchema,
  })
  .strip();
