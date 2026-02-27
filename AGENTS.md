# Guidelines

## Project Intent

SEAL is the canonical implementation of the redesign documented in
`plans/complete-redesign.md`.

## Workflow Priorities

- Keep the command surface minimal and contract-focused.
- Preserve clear separation between contract (`spec.md`) and execution state
  (`work.md`).
- Prefer deterministic checks and explicit invariants over prompt-only control.
- Keep work/evidence sections high-signal and current.

## Naming and Layout

- Repository metadata root is `.seal/`.
- CLI command is `seal`.
- Schema namespace is `seal.*.v1`.
