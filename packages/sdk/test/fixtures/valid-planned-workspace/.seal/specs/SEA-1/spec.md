---
schema: seal.spec.md.v1
specKey: SEA-1
---

# Fixture valid workspace

## Objective

Ensure fixture integration tests can validate a healthy planned workspace.

## Requirements

- Required paths and files must be coherent.

## Contract

### Interface

- `seal check --json` reports no problems for this fixture.

### Invariants

- No legacy `.aglit` structure exists.

## Verification Intent

- bun test

## Invariant Deltas

- Introduced: none
- Updated: none
- Retired: none
