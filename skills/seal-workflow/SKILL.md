---
name: seal-workflow
description: Use SEAL workflow in repos with `.seal/`. Trigger for planning/tracking work, creating/updating/listing spec workspaces, choosing next spec, validating SEAL state, or editing `.seal/specs/*/{spec,work,learnings}.md` and `.seal/invariants/*.md` with valid contracts.
---

# SEAL Workflow

Use `seal` for create/list/status/check actions. Edit markdown files directly for
contract, execution, evidence, and invariant content.

## Runbook

1. If `.seal/` is missing, run `seal init --prefix <PREFIX>`.
2. If asked what to work on, run `seal list` (or `seal list --all` / `seal list --status <status>`).
3. If no matching spec exists, create one with `seal new "<Title>" [--status planned|active|blocked]`.
4. Edit `.seal/specs/<SPEC_KEY>/spec.md` first to lock contract intent and keep invariant deltas current.
5. Update `.seal/specs/<SPEC_KEY>/work.md` while implementing; keep `## Plan`, `## Deliverables`, `## Verification`, `## Review`, and `## Evidence` current.
6. Change state with `seal edit status <SPEC_KEY> <status>` only; do not set `done` by manual file edits.
7. Before handoff, run `seal check` (and `seal check --json` for automation). Use `--strict-docs-evidence` when strict docs mapping is required.

## Invariants

- Keep contract and execution separated: `spec.md` defines what must be true; `work.md` tracks mutable execution state.
- Preserve required frontmatter schemas and key/path alignment (`specKey` matches folder; `invariantKey` matches filename).
- Preserve required section order in `spec.md`, `work.md`, and optional `learnings.md` when present.
- Keep `INBOX.md` entries as top-level `I-<N>` items with unique keys.
- Keep exactly one fenced `json` block under `## Evidence` with `schema: seal.evidence.v1`.
- `done` requires valid `contractHash` and at least one passing `artifact` evidence entry with a verified hash.
- `attestation` and `note` entries are allowed but do not satisfy the `done` machine-evidence gate.
- Artifact evidence paths must resolve safely under `.seal/specs/<SPEC_KEY>/`.
- For post-done contract changes, reopen (`done -> active`), update contract/work/evidence, then reseal (`active -> done`).
- Treat `seal check` problems as action items unless the user explicitly defers.

## Common Flows

- Promote queue item: add/update `I-<N>` in `.seal/INBOX.md` -> `seal new "<Title>"` -> remove/update source INBOX item in the same change -> fill `spec.md` and `work.md`.
- Execute active spec: `seal list` -> edit spec/work files -> record verification and artifact evidence -> `seal edit status <SPEC_KEY> done` -> `seal check`.
- Reopen a sealed spec: `seal edit status <SPEC_KEY> active` -> update contract and evidence -> `seal edit status <SPEC_KEY> done` -> `seal check`.
- Validate docs mapping: if `## Deliverables` references `docs/*.md`, ensure docs files exist; use `seal check --strict-docs-evidence` to enforce `docsPath` mapping.

## References

- `references/commands.md`
- `references/file-format.md`
