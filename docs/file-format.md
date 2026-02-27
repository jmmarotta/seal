# File Formats

## Workspace layout

```text
.seal/
  config.json
  INBOX.md
  specs/
    <SPEC_KEY>/
      spec.md
      work.md
      learnings.md        # optional
      artifacts/
  invariants/
    INV-<N>.md
```

## `spec.md`

Frontmatter:

```yaml
---
schema: seal.spec.md.v1
specKey: ABC-1
---
```

Required sections (ordered):

1. `# <Title>`
2. `## Objective`
3. `## Requirements`
4. `## Contract`
5. `### Interface`
6. `### Invariants`
7. `## Verification Intent`
8. `## Invariant Deltas`

`## Invariant Deltas` lines:

- `- Introduced: INV-1, INV-2` or `none`
- `- Updated: INV-3` or `none`
- `- Retired: INV-4` or `none`

## `work.md`

Frontmatter:

```yaml
---
schema: seal.work.md.v1
specKey: ABC-1
status: planned|active|blocked|done|canceled
contractHash: <sha256>   # only when status=done
---
```

Required sections (ordered):

1. `# Work for <SPEC_KEY>`
2. `## Plan`
3. `## Deliverables`
4. `## Verification`
5. `## Review`
6. `## Evidence`

`## Evidence` must contain exactly one fenced `json` block.

## Evidence payload (`seal.evidence.v1`)

```json
{
  "schema": "seal.evidence.v1",
  "entries": [
    {
      "proofType": "artifact|attestation|note",
      "status": "pass|fail|info"
    }
  ]
}
```

Entry rules:

- `artifact`: requires `path`, `sha256`; optional `docsPath` (`docs/<file>.md`) for strict docs mapping.
- `attestation`: requires `provider`, `runId`.
- `note`: requires `note`.

Legacy note:

- Existing `trace.jsonl` files are ignored by SEAL v1 snapshot checks.

## `learnings.md` (optional)

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
4. `## Resolution` (required when status is not `pending`)

## Invariant file (`INV-<N>.md`)

Frontmatter:

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
