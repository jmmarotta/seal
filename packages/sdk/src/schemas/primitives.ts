import { z } from "zod";

import {
  EVIDENCE_PROOF_TYPES,
  EVIDENCE_STATUSES,
  INVARIANT_STATUSES,
  LEARNING_STATUSES,
  WORK_STATUSES,
} from "../constants";

export const nonEmptyStringSchema = z.string().trim().min(1);
export const nonNegativeIntegerSchema = z.number().int().min(0);

export const unknownObjectSchema = z.object({}).catchall(z.unknown());

export const specKeySchema = z.string().regex(/^[A-Z]+-[0-9]+$/);
export const workStatusSchema = z.enum(WORK_STATUSES);
export const invariantStatusSchema = z.enum(INVARIANT_STATUSES);
export const learningStatusSchema = z.enum(LEARNING_STATUSES);
export const evidenceProofTypeSchema = z.enum(EVIDENCE_PROOF_TYPES);
export const evidenceStatusSchema = z.enum(EVIDENCE_STATUSES);
