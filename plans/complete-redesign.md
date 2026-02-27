# Complete Redesign Plan (SEAL)

## Objective

Rewrite AGLIT as SEAL, a radically simple, agent-first change-contract system where humans and agents can:

1. Capture ideas in a queue (`INBOX.md`).
2. Promote an idea into a spec workspace.
3. Execute work from a stable contract plus mutable work state.
4. Prove completion with machine-verifiable evidence.
5. Capture reusable learnings and durable invariants.

This redesign optimizes for APOSD principles: low cognitive load, low change amplification, clear boundaries, and explicit invariants.

SEAL stands for Spec Execution Assurance Ledger.

## Problem Statement

The current issue/project model is useful but too heavy for fast human-agent loops:

- Intent, implementation details, and proof can drift apart.
- Reviewers often need to parse too much mutable content to understand the contract.
- Intake is not treated as a first-class queue.
- Agent iteration is not strongly constrained by an auditable, machine-checkable harness.

The redesign keeps repo-local Markdown and deterministic checks, but changes the unit of work to a spec workspace keyed by a prefix-backed spec key.

## Design Laws

1. Harness over prompting:
   - Reliability comes from checks and explicit gates.
2. Mutable while active, sealed when done:
   - Active work can evolve.
   - Done work is sealed by `contractHash`; changes require reopen and recertification.
3. Separate contract from execution:
   - `spec.md` states what must be true.
   - `work.md` captures mutable planning and delivery state.
4. Keep file operations file-first:
   - Agents edit content directly in files.
   - CLI only handles structural and state transitions.
5. Invariants are durable outcomes:
   - Specs define changes.
   - Invariants record long-lived guarantees produced by those changes.
6. Keep execution snapshots high-signal:
   - Keep `work.md` focused on plan, verification, review, and evidence.
   - Avoid per-edit operational noise.

## Locked Decisions

- Rename the redesign surface to SEAL (Spec Execution Assurance Ledger).
- Use TypeScript/Bun for the redesign.
- Use `.seal/` as the repository metadata root.
- CLI binary is `seal`; keep subcommand surface minimal: `init`, `new`, `list`, `edit status`, `check`.
- Keep `contractHash` for `done` specs as a contract seal.
- Allow flexible process: a `done` spec can be reopened (`done -> active`) when contract changes are needed.
- Returning to `done` requires updated evidence and a new `contractHash`.
- No UUIDs in frontmatter for now; `specKey` is the identity.
- No priority model.
- No `promote` command and no `--from`; promotion is two explicit steps.
- No `promotedFrom` field.
- `learnings.md` is optional and created only when first needed.
- Add durable invariant registry under `.seal/invariants/`.
- Keep `INBOX.md` format intentionally flexible.
- No backward compatibility with the old AGLIT issue/project model in v1.
- No migration command or migration doc in v1 of this redesign.

## Target Repository Model

```text
.seal/
  INBOX.md
  config.json
  specs/
    ABC-1/
      spec.md
      work.md
      learnings.md          # optional, create on first need
      artifacts/
        ... evidence files with hashes
  invariants/
    INV-1.md
docs/
  overview.md
  workflow.md
  file-format.md
  checker.md
  invariants.md
  agent-guidelines.md
```

## Key and Naming Model

- `seal init --prefix ABC` configures key prefix.
- Spec key format: `<PREFIX>-<N>` (for example `ABC-1`, `ABC-2`).
- Workspace path: `.seal/specs/<SPEC_KEY>/`.
- Invariant key format: `INV-<N>` in `.seal/invariants/`.

## INBOX Contract (`.seal/INBOX.md`)

- Purpose: queue of ideas awaiting shaping.
- Format: flexible Markdown list items keyed as `I-<N>`.
- Hard requirements:
  - Keys are unique.
  - Each queue entry is parseable as a top-level list item starting with `I-<N>`.
- Content after the key is intentionally unconstrained so humans and agents can shape context naturally.
- Recommended (not required): title, objective draft, constraints, open questions, references.

Example:

```markdown
- I-12: Add deterministic release notes generation
  - Objective: Generate release notes from merged specs and tags.
  - Constraints: No network call in local check.
  - Open questions: Keep one file per release or append-only log?
```

Promotion flow:

1. Agent/human run `seal new "Title" ...` to create spec workspace.
2. Agent/human remove the corresponding `I-*` item from `INBOX.md` in the same change.

## Layered Model

### 1) Change Contract Layer (`spec.md`)

Defines the contract for one change. This file is normative.

- Editable while `work.md` status is `planned|active|blocked`.
- `done` is a sealed snapshot enforced by `contractHash`.
- Post-done contract updates require `done -> active`, refreshed evidence, and reseal on return to `done`.
- Use a new spec with `supersedes` when replacing a completed workstream instead of evolving it.

### 2) Work State Layer (`work.md`)

Tracks mutable planning and execution state.

- `work.md` stores status and working sections.

### 3) Durable Invariant Layer (`.seal/invariants/*.md`)

Stores long-lived guarantees that outlive a single change.

- Specs introduce/update/retire invariants.
- Invariants link to verification signals.

## File Contracts

### `spec.md` (required, normative)

Frontmatter:

```yaml
---
schema: seal.spec.md.v1
specKey: ABC-1
supersedes: ABC-0 # optional
---
```

Required sections:

1. `# <Title>`
2. `## Objective`
3. `## Requirements`
4. `## Contract`
   - `### Interface`
   - `### Invariants`
5. `## Verification Intent`
6. `## Invariant Deltas`

Optional sections:

- `## Non-Goals`
- `## Dependencies`
- `## Notes`

Rules:

- Top of file must stay high-signal and low-churn.
- `## Invariant Deltas` must explicitly list introduced/updated/retired invariants.

### `work.md` (required, mutable)

Frontmatter:

```yaml
---
schema: seal.work.md.v1
specKey: ABC-1
status: planned|active|blocked|done|canceled
contractHash: <sha256> # required when status=done; seal of canonical spec.md content
---
```

Required sections:

1. `# Work for <SPEC_KEY>`
2. `## Plan`
3. `## Deliverables`
4. `## Verification`
5. `## Review`
6. `## Evidence`

Optional sections:

- `## Execution Log`
- `## Follow-ups`

Rules:

- `contractHash` is computed when transitioning to `done`.
- Canonical hash input is `spec.md` UTF-8 content normalized to LF newlines (`\n`).
- If contract-relevant content changes after `done`, status must transition to `active` before edits are accepted by `check`.
- Returning to `done` requires refreshed evidence and a recomputed `contractHash`.

Evidence section rule:

- Exactly one fenced `json` block with schema `seal.evidence.v1`.

Legacy compatibility note:

- Existing `trace.jsonl` files may remain in spec workspaces.
- `seal check` ignores trace files in snapshot mode.

### `learnings.md` (optional, create on first need)

Frontmatter:

```yaml
---
schema: seal.learnings.md.v1
specKey: ABC-1
status: pending|integrated|integrated-adapted|rejected
---
```

Required sections:

1. `# Learnings for <SPEC_KEY>`
2. `## Generalizations`
3. `## Proposed Integrations`
4. `## Resolution` (required once status is not `pending`)

Semantics:

- `pending`: captured, awaiting decision.
- `integrated`: applied as written.
- `integrated-adapted`: applied with modifications.
- `rejected`: not adopted.

### Invariant files (`.seal/invariants/INV-*.md`)

Frontmatter:

```yaml
---
schema: seal.invariant.md.v1
invariantKey: INV-1
status: draft|active|retired
---
```

Required sections:

1. `# <Invariant Title>`
2. `## Statement`
3. `## Scope`
4. `## Verified By`
5. `## Change History`

Rules:

- `status=active` invariants must have at least one `Verified By` entry.
- `Verified By` can reference tests, checks, schemas, policies, or manual runbooks.

## Coherence and Validation Rules (`check`)

### Structural checks

- Required directories/files exist.
- Frontmatter parses and schema values match file type.
- `specKey` matches workspace folder.
- Existing `trace.jsonl` files are ignored.
- Legacy issue/project artifacts are not supported in v1 (`.seal/issues/`, `.seal/projects/`, and any `.aglit/` root fail `check`).

### Queue checks

- `INBOX.md` keys are unique (`I-<N>`).
- Queue entries are parseable as top-level `I-<N>` items.
- No required field grammar is enforced for queue item body content.

### Spec checks

- Required sections exist and are ordered.
- Objective and Requirements are non-empty.
- Contract contains both Interface and Invariants.
- Invariant Deltas section exists and is syntactically valid.

### Work checks

- `status` is valid enum.
- Required sections exist.
- Allowed status transitions:
  - `planned -> active|blocked|canceled`
  - `active -> blocked|done|canceled`
  - `blocked -> active|canceled`
  - `done -> active` (reopen for contract updates)
  - `canceled` is terminal
- `done` requires valid passing machine-verifiable evidence.
- `done` requires `contractHash`, and hash must match canonical current `spec.md`.
- Leaving `done` requires clearing stale `contractHash`; recompute only when returning to `done`.

### Invariant checks

- All invariant keys referenced in `spec.md` exist.
- Retired invariants are not newly introduced by later specs.
- Active invariants include at least one `Verified By` entry.

### Evidence checks

- Exactly one fenced `json` block under `## Evidence`.
- Payload schema equals `seal.evidence.v1`.
- Entry fields validated by proof type.
- `artifact` proof paths must resolve safely under `.seal/specs/<SPEC_KEY>/`.
- `note` proof entries are allowed but do not satisfy `done` gate.

### Docs checks

- If Deliverables claim docs updates, listed docs files exist.
- Optional: require evidence entry for docs artifact hashes when status is `done`.

## Command Surface (Minimal)

```text
seal init --prefix ABC
seal new "Title" [--status planned]
seal list [--all] [--status active]
seal edit status <SPEC_KEY> <status>
seal check [--json]
```

Command semantics:

- `seal init --prefix ABC`
  - Creates `.seal/` layout and stores prefix in config.
- `seal new "Title" [--status planned]`
  - Allocates next `<PREFIX>-N` key.
  - Creates workspace with `spec.md`, `work.md`, and `artifacts/`.
- `seal list [--all] [--status active]`
  - Defaults to non-terminal specs (`planned|active|blocked`).
  - `--all` includes `done|canceled`.
- `seal edit status <SPEC_KEY> <status>`
  - Updates status.
  - When changing to `done`, computes and writes `contractHash`.
  - When changing from `done`, clears `contractHash`.
- `seal check [--json]`
  - Runs all coherence and evidence validations.
  - `--json` provides machine-readable output for harness loops.

Intentionally not included:

- No inbox commands (agents edit `INBOX.md` directly).
- No promote command (promotion is explicit two-step flow).
- No migration command in this version.

## Non-Trivial User/Agent Example

Scenario: add deterministic changelog generation.

1. Human adds `I-14` to `INBOX.md`.
2. Agent shapes objective and requirements in the queue item.
3. Agent runs `seal new "Deterministic changelog generation" --status planned`.
4. Agent removes `I-14` from `INBOX.md` in same PR.
5. Agent fills `spec.md` with contract and invariant deltas.
6. Agent fills `work.md` plan, verification, review notes, and evidence.
7. Agent implements code/docs and updates evidence artifacts/hashes.
8. Agent runs `seal edit status ABC-3 done`.
9. Agent runs `seal check --json`; CI enforces same checks.

## Implementation Plan (TS/Bun)

### Package strategy

- Keep `packages/sdk` as the core model/validation package.
- Keep `packages/cli` as command surface and output renderer.

### Core modules

- `config.ts` - prefix config and workspace init.
- `inbox.ts` - queue parser/writer helpers.
- `spec.ts` - spec key allocation and workspace creation.
- `work.ts` - status transitions and `contractHash` updates.
- `invariants.ts` - invariant file parse/validate.
- `evidence.ts` - evidence parse/validate.
- `check.ts` - full coherence engine.
- `render.ts` - human-readable CLI rendering.

### Test strategy

- Unit tests for each parser/validator.
- Golden tests for CLI output.
- Integration tests over fixture repositories.
- Done-state gating tests for `contractHash` and evidence.

## Documentation Plan (`docs/`)

- `docs/overview.md` - mental model and terminology.
- `docs/workflow.md` - INBOX to done operating loop.
- `docs/file-format.md` - exact frontmatter and section contracts.
- `docs/checker.md` - all check rules and common fixes.
- `docs/invariants.md` - invariant lifecycle and verification linkage.
- `docs/agent-guidelines.md` - conventions for agent edits and evidence discipline.

## Verification Strategy

### Automated

- `check` validates structure, coherence, invariants, and evidence.
- CI runs format, lint, typecheck, tests, and `check`.
- `check --json` output is consumable by remediation loops.

### Manual

- Review `spec.md` first for contract quality.
- Review `work.md` for plan/proof coherence.
- Review `learnings.md` only when present.

## Risks and Mitigations

1. Over-structuring slows authoring.
   - Keep command surface minimal and content file-first.
2. Work notes become noisy and less useful.
   - Keep `work.md` focused on outcomes, verification, and evidence.
3. Invariants become aspirational instead of enforced.
   - Require `Verified By` entries for active invariants.
4. Contract rewrite after done erodes trust.
   - Enforce `contractHash` plus reopen-and-recertify workflow.
5. Agent bypasses flow with manual status edits.
   - Require status transitions through `seal edit status` for valid `contractHash` handling.

## Milestones

### M1: Contract lock

Status: complete.

- Finalize file contracts and validation rules.
- Freeze command surface and frontmatter/evidence schemas.

### M2: Core workspace flow

Status: complete.

- Implement `init`, `new`, `list`, `edit status`, `check` scaffolding.
- Create required files including `spec.md`, `work.md`, and `artifacts/`.

### M3: Checker hardening

Status: complete.

- Implement all coherence, invariant, and evidence rules.
- Add `contractHash` done-state enforcement.

### M4: Docs and quality

Status: complete.

- Publish `docs/` set.
- Stabilize errors and remediation guidance.

### M5: Rollout

Status: complete.

- Switch default workflow to redesign model.
- Remove old issue/project surface from docs and CLI help text.

## Definition of Done

Redesign is complete when all are true:

1. Minimal command surface is implemented and documented.
2. New workspace creation includes `spec.md`, `work.md`, and `artifacts/`.
3. `spec.md` and `work.md` contracts are enforced by `check`.
4. Done specs are sealed by `contractHash`; contract updates require reopen (`done -> active`), recertification, and reseal.
5. Invariant registry exists and is integrated with spec deltas.
6. `learnings.md` supports optional lifecycle with status validation.
7. CI enforces deterministic checks end-to-end.

## Initial Task Breakdown

### Foundation

- [x] Implement new schema constants (`spec`, `work`, `learnings`, `invariant`).
- [x] Implement section validators for all Markdown contracts.
- [x] Implement prefix-backed spec key allocator.

### Workspace creation

- [x] Implement `new` scaffolding for `spec.md`, `work.md`, and `artifacts/`.
- [x] Add fixtures and integration tests for workspace initialization.

### Status flow

- [x] Implement `edit status` transition handling with allowed-transition validation.
- [x] Implement reopen flow (`done -> active`) and clear stale `contractHash`.
- [x] Compute/update `contractHash` on each transition to `done`.

### Invariants

- [x] Implement invariant parser/validator for `.seal/invariants/`.
- [x] Implement `Invariant Deltas` resolution checks.
- [x] Enforce `Verified By` requirement for active invariants.

### Evidence and checker

- [x] Adapt evidence checks to per-spec `artifacts/` pathing.
- [x] Implement full `check` rule set and JSON output.
- [x] Add exhaustive failure-case tests with actionable errors.

### Documentation and rollout

- [x] Write docs set in `docs/`.
- [x] Update CLI help text to redesign terms.
- [x] Document removal of old issue/project model support.
