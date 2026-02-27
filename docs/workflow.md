# Workflow

This is the default operating loop from idea to sealed completion.

## 1) Capture in INBOX

- Add queue items in `.seal/INBOX.md` using top-level `I-<N>` keys.
- Keep each item scoped to one promotable problem.

## 2) Promote to spec workspace

- Run `seal new "Title" [--status planned|active|blocked]`.
- Remove or update the originating INBOX item in the same PR.
- The workspace is created at `.seal/specs/<SPEC_KEY>/`.

## 3) Define contract

- Fill `spec.md` sections, especially `Objective`, `Requirements`, and contract details.
- Update `Invariant Deltas` when spec behavior changes durable constraints.

## 4) Execute and checkpoint

- Maintain plan/proof in `work.md`.
- Keep `## Verification`, `## Review`, and `## Evidence` current as work evolves.

## 5) Seal completion

- Transition to done with `seal edit status <SPEC_KEY> done`.
- This writes `contractHash` for the current canonical `spec.md`.

## 6) Validate coherence

- Run `seal check` for human-readable output.
- Run `seal check --json` for automation loops and CI.

## Reopen and reseal

- Reopen with `seal edit status <SPEC_KEY> active`.
- Update contract/work/evidence as needed.
- Seal again with `seal edit status <SPEC_KEY> done` (which recomputes `contractHash`).
