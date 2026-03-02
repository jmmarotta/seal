# SEAL File Format

## Paths

- Queue: `.seal/INBOX.md`
- Specs: `.seal/specs/<SPEC_KEY>/spec.md`
- Work state: `.seal/specs/<SPEC_KEY>/work.md`
- Learnings (optional): `.seal/specs/<SPEC_KEY>/learnings.md`
- Evidence artifacts: `.seal/specs/<SPEC_KEY>/artifacts/`
- Invariants: `.seal/invariants/INV-<N>.md`

## Enums

- `work status`: `planned|active|blocked|done|canceled`
- `learnings status`: `pending|integrated|integrated-adapted|rejected`
- `invariant status`: `draft|active|retired`

## Required `spec.md` frontmatter

```yaml
---
schema: seal.spec.md.v1
specKey: ABC-1
---
```

Required section order:

1. `# <Title>`
2. `## Objective`
3. `## Requirements`
4. `## Contract`
5. `### Interface`
6. `### Invariants`
7. `## Verification Intent`
8. `## Invariant Deltas`

`## Invariant Deltas` lines must include:

- `- Introduced: ...` or `none`
- `- Updated: ...` or `none`
- `- Retired: ...` or `none`

## Required `work.md` frontmatter

```yaml
---
schema: seal.work.md.v1
specKey: ABC-1
status: planned|active|blocked|done|canceled
contractHash: <sha256> # required only when status=done
---
```

Required section order:

1. `# Work for <SPEC_KEY>`
2. `## Plan`
3. `## Deliverables`
4. `## Verification`
5. `## Review`
6. `## Evidence`

## Optional `learnings.md` frontmatter

```yaml
---
schema: seal.learnings.md.v1
specKey: ABC-1
status: pending|integrated|integrated-adapted|rejected
---
```

Required sections when file exists:

1. `# Learnings for <SPEC_KEY>`
2. `## Generalizations`
3. `## Proposed Integrations`
4. `## Resolution` (required when status is not `pending`)

## Required invariant frontmatter

```yaml
---
schema: seal.invariant.md.v1
invariantKey: INV-1
status: draft|active|retired
---
```

Required sections:

1. `# <Title>`
2. `## Statement`
3. `## Scope`
4. `## Verified By`
5. `## Change History`

## Evidence contract (`seal.evidence.v1`)

- `## Evidence` in `work.md` must contain exactly one fenced `json` block.
- Top-level required fields: `schema`, `entries`.
- `schema` must equal `seal.evidence.v1`.
- Each entry requires `proofType` and `status`.
- Allowed `proofType`: `artifact`, `attestation`, `note`.
- Allowed `status`: `pass`, `fail`, `info`.
- `artifact` requires `path` and `sha256`; optional `docsPath` for strict docs mapping.
- `attestation` requires `provider` and `runId`.
- `note` requires `note`.
- `done` requires at least one passing `artifact` entry with a hash that matches artifact content.
- `note` and `attestation` entries are valid context but do not satisfy the done machine-evidence gate.

## Editing constraints

- Keep `INBOX.md` entries as top-level `I-<N>` bullets and avoid duplicate keys.
- Keep frontmatter parseable YAML and preserve `schema` keys.
- Keep `specKey` aligned with `.seal/specs/<SPEC_KEY>/`.
- Keep `invariantKey` aligned with `.seal/invariants/INV-<N>.md`.
- Do not manually set `contractHash`; use `seal edit status` for transitions.
- Keep artifact paths scoped under `.seal/specs/<SPEC_KEY>/` and avoid path traversal.
