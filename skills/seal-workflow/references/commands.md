# SEAL Commands

## Syntax

```bash
seal init --prefix <PREFIX>

seal new "<TITLE>" [--status <planned|active|blocked>]

seal list [--all] [--status <planned|active|blocked|done|canceled>]

seal edit status <SPEC_KEY> <planned|active|blocked|done|canceled>

seal check [--json] [--strict-docs-evidence]
```

## Status transitions

- `planned -> active|blocked|canceled`
- `active -> blocked|done|canceled`
- `blocked -> active|canceled`
- `done -> active` (reopen for contract-impacting changes)
- `canceled` is terminal

## Notes

- `seal init` creates `.seal/config.json`, `.seal/INBOX.md`, `.seal/specs/`, and `.seal/invariants/`.
- `seal new` output: `<SPEC_KEY> <absolute-path>`.
- `seal new` defaults to `planned` when `--status` is omitted.
- `seal list` defaults to non-terminal specs (`planned|active|blocked`); use `--all` to include terminal statuses.
- `seal edit status ... done` writes `contractHash` from canonical `spec.md`; non-`done` statuses clear `contractHash`.
- `seal check` reports workspace counts and actionable problems.
- `seal check --json` is for CI/remediation loops.
- `seal check --strict-docs-evidence` requires docs deliverables to map to passing artifact evidence entries via `docsPath`.
