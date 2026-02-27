---
schema: seal.spec.md.v1
specKey: SEA-1
---

# Fixture missing docs

## Objective

Detect missing docs deliverables.

## Requirements

- Report missing docs paths when deliverables mention docs files.

## Contract

### Interface

- `seal check` should report missing docs file.

### Invariants

- No legacy `.aglit` structure exists.

## Verification Intent

- bun test

## Invariant Deltas

- Introduced: none
- Updated: none
- Retired: none
