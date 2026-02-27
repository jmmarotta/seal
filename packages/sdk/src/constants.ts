export const SEAL_DIRNAME = ".seal";
export const SPECS_DIRNAME = "specs";
export const INVARIANTS_DIRNAME = "invariants";

export const CONFIG_FILENAME = "config.json";
export const INBOX_FILENAME = "INBOX.md";
export const LOCK_FILENAME = ".lock";

export const SPEC_FILENAME = "spec.md";
export const WORK_FILENAME = "work.md";
export const LEARNINGS_FILENAME = "learnings.md";
export const ARTIFACTS_DIRNAME = "artifacts";

export const CONFIG_SCHEMA = "seal.config.v1";
export const SPEC_SCHEMA = "seal.spec.md.v1";
export const WORK_SCHEMA = "seal.work.md.v1";
export const LEARNINGS_SCHEMA = "seal.learnings.md.v1";
export const INVARIANT_SCHEMA = "seal.invariant.md.v1";
export const EVIDENCE_SCHEMA = "seal.evidence.v1";

export const EVIDENCE_PROOF_TYPES = ["artifact", "attestation", "note"] as const;
export const EVIDENCE_STATUSES = ["pass", "fail", "info"] as const;

export const WORK_STATUSES = ["planned", "active", "blocked", "done", "canceled"] as const;
export const NON_TERMINAL_WORK_STATUSES = ["planned", "active", "blocked"] as const;
export const INVARIANT_STATUSES = ["draft", "active", "retired"] as const;
export const LEARNING_STATUSES = [
  "pending",
  "integrated",
  "integrated-adapted",
  "rejected",
] as const;

export type WorkStatus = (typeof WORK_STATUSES)[number];
export type InvariantStatus = (typeof INVARIANT_STATUSES)[number];
export type LearningStatus = (typeof LEARNING_STATUSES)[number];
export type EvidenceProofType = (typeof EVIDENCE_PROOF_TYPES)[number];
export type EvidenceStatus = (typeof EVIDENCE_STATUSES)[number];
