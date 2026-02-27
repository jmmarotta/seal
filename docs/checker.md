# Checker

`seal check` validates workspace coherence and reports actionable problems.

## Output modes

- `seal check`: human-readable report.
- `seal check --json`: machine-readable report for CI/remediation loops.
- `seal check --strict-docs-evidence`: require docs deliverables to map to artifact evidence via `docsPath`.

## What is validated

### Structure

- Required roots and files under `.seal/`.
- Legacy `.aglit/`, `.seal/issues/`, and `.seal/projects/` are rejected.
- Existing `.seal/specs/*/trace.jsonl` files are ignored.

### Frontmatter and contracts

- `spec.md`, `work.md`, `learnings.md` (if present), and invariants frontmatter.
- Required sections and section order.
- Spec objective/requirements non-empty.

### Inbox

- Keys must be top-level `I-<N>`.
- Duplicate keys are rejected.

### Invariants

- Referenced keys must exist.
- Active invariants require non-empty `Verified By` entries.
- Delta semantics: overlap detection, duplicate introductions/retirements, and retired-state consistency.

### Evidence

- One fenced JSON block under `## Evidence`.
- Schema and entry-type field validation.
- Safe artifact pathing inside `.seal/specs/<SPEC_KEY>/`.
- Artifact hash verification.
- `done` requires passing artifact evidence (attestation-only is insufficient).

### Deliverables/docs coherence

- If deliverables list docs paths, those files must exist.
- Optional strict mode can require `docsPath` mapping in artifact evidence.

## Common fixes

- **`Objective section must be non-empty`**: fill `## Objective` in `spec.md`.
- **`done status requires valid contractHash`**: reopen and reseal through `seal edit status`.
- **`Deliverables references missing docs file`**: create file or remove stale path.
- **`done status requires at least one passing machine-verifiable evidence entry`**: add a passing `artifact` entry under `## Evidence`.
