# SEAL Overview

SEAL means **Spec Execution Assurance Ledger**.

It is a contract-first workflow that tracks implementation intent, execution, and proof in
files that are easy for humans to review and easy for machines to validate.

## Core model

- **Spec contract (`spec.md`)**: what must be true.
- **Execution state (`work.md`)**: plan, delivery status, and evidence.
- **Proof (`## Evidence`, `artifacts/`)**: machine-verifiable evidence for completion.
- **Durable constraints (`.seal/invariants/`)**: cross-spec rules that persist over time.
- **Queue (`INBOX.md`)**: lightweight backlog for ideas not yet promoted.

## Trust boundary

- `done` is a seal state, not just a label.
- A done spec requires:
  - valid `contractHash`,
  - passing machine-verifiable evidence.
- Any post-done contract-impacting change requires reopening and resealing.

## Why this design

- Keeps command surface small and content file-first.
- Uses snapshot checks (`seal check`) instead of event-history enforcement.
- Reduces hidden state by validating coherence and evidence deterministically.

## Not in scope

- No legacy `.aglit` issue/project model.
- No migration layer in v1.
