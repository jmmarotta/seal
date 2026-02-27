# SEAL

SEAL stands for **Spec Execution Assurance Ledger**.

SEAL is a contract-first, agent-friendly workflow that combines human-readable planning
with machine-validated completion gates.

## Core commands

- `seal init --prefix ABC`
- `seal new "Title" [--status planned|active|blocked]`
- `seal list [--all] [--status <status>]`
- `seal edit status <SPEC_KEY> <status>`
- `seal check [--json] [--strict-docs-evidence]`

## Quick start

```bash
bun install
bun run dev init --prefix SEA
bun run dev new "Deterministic changelog generation"
bun run dev list
bun run dev check
```

## Documentation

- `docs/overview.md` - mental model and terminology.
- `docs/workflow.md` - operating loop from INBOX to done.
- `docs/file-format.md` - exact file/frontmatter contracts.
- `docs/checker.md` - checker rules and common fixes.
- `docs/invariants.md` - invariant lifecycle and verification linkage.
- `docs/agent-guidelines.md` - practical conventions for agent edits.

## Quality gates

- `bun run fmt:check`
- `bun run lint`
- `bun run typecheck`
- `bun run test`
- `bun run ci:seal-check` (validates `seal check --json` in CI fixture flow)

## Design source

- `plans/complete-redesign.md`

## Compatibility

SEAL v1 is a clean break. Legacy `.aglit`, `.seal/issues`, and `.seal/projects`
surfaces are intentionally unsupported.
