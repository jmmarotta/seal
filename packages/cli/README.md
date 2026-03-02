# seal

SEAL is a contract-first workflow for spec execution and verification.

It stores specs, work logs, and invariants in a local `.seal/` directory so the
full execution ledger stays in git.

Requires Bun 1.3+ at runtime.

## Install

```bash
bun add -g seal
# or
npm install -g seal
```

Run without installing:

```bash
bunx seal@latest --help
```

Local development from this repository:

```bash
# in packages/cli
bun run build
bun link

# now available in your shell
seal --help
```

Optional: in another project directory, link it as a dependency:

```bash
bun link seal
```

## Quick start

```bash
# from your repository
seal init --prefix SEA
seal new "Deterministic changelog generation"
seal list
seal check
```

## Commands

```text
seal init [--prefix <value>]
seal new [--status planned|active|blocked] <title>
seal list [--all] [--status planned|active|blocked|done|canceled]
seal edit status <spec-key> <status>
seal check [--json] [--strict-docs-evidence]
```

- `init`: creates `.seal/` layout and saves `prefix` in `.seal/config.json`.
- `new`: creates `.seal/specs/<SPEC_KEY>/` with `spec.md` and `work.md`.
- `list`: prints active work by default; pass `--all` to include terminal items.
- `edit status`: updates `work.md` status with transition checks.
- `check`: validates workspace structure, schemas, statuses, references, and evidence.

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

The CLI searches upward from your current directory to find the workspace root
that contains `.seal/`, so you can run commands from nested folders.
