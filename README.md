# SEAL

SEAL stands for **Spec Execution Assurance Ledger**.

SEAL is a contract-first, agent-friendly workflow that combines human-readable planning
with machine-validated completion gates.

## Install CLI

```bash
bun add -g @jmmarotta/seal
# or
npm install -g @jmmarotta/seal
```

Run without installing:

```bash
bunx @jmmarotta/seal@latest --help
```

## Quick start

```bash
seal init --prefix SEA
seal new "Deterministic changelog generation"
seal list
seal check
```

## Core commands

- `seal init --prefix ABC`
- `seal new "Title" [--status planned|active|blocked]`
- `seal list [--all] [--status <status>]`
- `seal edit status <SPEC_KEY> <status>`
- `seal check [--json] [--strict-docs-evidence]`

## Packages

- `packages/cli` (`@jmmarotta/seal`): CLI wrapper over the SDK.
- `packages/sdk` (`@jmmarotta/seal-sdk`): schemas, parsing, workspace checks, and rendering.

## Documentation

- `docs/overview.md` - mental model and terminology.
- `docs/workflow.md` - operating loop from INBOX to done.
- `docs/file-format.md` - exact file/frontmatter contracts.
- `docs/checker.md` - checker rules and common fixes.
- `docs/invariants.md` - invariant lifecycle and verification linkage.
- `docs/agent-guidelines.md` - practical conventions for agent edits.
- `docs/development.md` - development setup, CI/CD, changesets policy, and release runbook.
