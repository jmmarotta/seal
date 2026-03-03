# SEAL

SEAL stands for **Spec Execution Assurance Ledger**.

SEAL is a contract-first, agent-friendly workflow that combines human-readable planning
with machine-validated completion gates.

## Packages

- `packages/sdk` (`@jmmarotta/seal-sdk`): schemas, parsing, workspace checks, and rendering.
- `packages/cli` (`@jmmarotta/seal`): CLI wrapper over the SDK.

## Setup

```bash
bun install
```

Requires Bun 1.3+ (SEAL relies on Bun runtime APIs).

## CLI

Install (published):

```bash
bun add -g @jmmarotta/seal
# or
npm install -g @jmmarotta/seal
```

Run without installing (published):

```bash
bunx @jmmarotta/seal@latest --help
```

Local development from a checkout (`bun link`):

```bash
# from this repo root
bun run --cwd packages/cli build
bun link --cwd packages/cli

# now available in your shell
seal --help
```

Optional: in another project directory, link it as a dependency:

```bash
bun link @jmmarotta/seal
```

Publish-like local install check (tarball):

```bash
bun run --cwd packages/cli build
TARBALL="$(bun pm --cwd packages/cli pack --quiet --ignore-scripts --destination "$PWD/packages/cli" | tr -d '\n')"
bun remove -g @jmmarotta/seal
bun add -g "$TARBALL"
seal --help
```

Use this tarball flow as a packaging smoke test. For day-to-day local CLI usage,
prefer `bun link --cwd packages/cli`.

## Core commands

- `seal init --prefix ABC`
- `seal new "Title" [--status planned|active|blocked]`
- `seal list [--all] [--status <status>]`
- `seal edit status <SPEC_KEY> <status>`
- `seal check [--json] [--strict-docs-evidence]`

## Quick start

```bash
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
