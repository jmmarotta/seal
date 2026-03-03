# @jmmarotta/seal-sdk

Core SDK for SEAL (Spec Execution Assurance Ledger).

This package provides the programmatic APIs behind the `@jmmarotta/seal` CLI:
workspace initialization, spec/work updates, status transitions, validation, and
rendering helpers.

Requires Bun 1.3+ at runtime.

## Install

```bash
bun add @jmmarotta/seal-sdk
# or
npm install @jmmarotta/seal-sdk
```

## Quick example

```ts
import {
  checkWorkspace,
  createSpecWorkspace,
  editSpecStatus,
  initWorkspace,
  renderCheckReport,
} from "@jmmarotta/seal-sdk";

const rootDir = process.cwd();

await initWorkspace(rootDir, "SEA");

const created = await createSpecWorkspace(rootDir, {
  title: "Deterministic changelog generation",
  status: "active",
});

await editSpecStatus(rootDir, {
  specKey: created.specKey,
  toStatus: "done",
});

const report = await checkWorkspace(rootDir);
console.log(renderCheckReport(report, { rootDir }));
```

## Main exports

- `initWorkspace`: create `.seal/` layout and config.
- `createSpecWorkspace`: create `.seal/specs/<SPEC_KEY>/` with `spec.md` + `work.md`.
- `listSpecs`: list spec summaries with status filters.
- `editSpecStatus`: apply validated status transitions and manage `contractHash`.
- `checkWorkspace`: run deterministic workspace checks.
- `renderCheckReport`: render human-readable checker output.

## Schemas and contracts

The SDK enforces SEAL contracts with the `seal.*.v1` schemas and markdown section
requirements documented in the repository:

- `docs/overview.md`
- `docs/workflow.md`
- `docs/file-format.md`
- `docs/checker.md`
