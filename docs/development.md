# Development

This document covers local development, CI behavior, release policy, and npm publishing.

## Prerequisites

- Bun 1.3+ for local development and tests.
- Node 24 in GitHub Actions publish workflow (required for trusted publishing).
- Optional: GitHub CLI (`gh`) for workflow and PR automation.

## Local setup

```bash
bun install
```

Local quality gates:

- `bun run fmt:check`
- `bun run lint`
- `bun run typecheck`
- `bun run test`
- `bun run ci:seal-check`

## Local CLI install workflows

Use `bun link` for day-to-day local CLI usage:

```bash
bun run --cwd packages/cli build
bun link --cwd packages/cli
seal --help
```

Publish-like tarball smoke test:

```bash
bun run --cwd packages/cli build
TARBALL="$(bun pm --cwd packages/cli pack --quiet --ignore-scripts --destination "$PWD/packages/cli" | tr -d '\n')"
bun remove -g @jmmarotta/seal
bun add -g "$TARBALL"
seal --help
```

## CI workflows

- `ci.yml`
  - `checks` job: format, lint, typecheck, `ci:seal-check`.
  - `tests` job: test suite.
  - PR changeset gate: `changeset status --since=main` (skips `changeset-release/*` branches).
- `changesets.yml`
  - Triggers after successful `CI` workflow runs from `push` on `main`.
  - Opens/updates a `Version packages` PR.
- `publish.yml`
  - Manual dispatch or tag-triggered publishes.
  - Gated by successful `checks` and `tests` jobs.
  - Uses npm trusted publishing (OIDC) with provenance.

## Changesets policy

For package-affecting changes, add a changeset in feature PRs:

```bash
bun run changeset
```

For no-release changes (for example tests/tooling only):

```bash
bun run changeset --empty
```

Useful commands:

- `bun run changeset:status`
- `bun run changeset:status:since-main`
- `bun run changeset:version`

## Release tags

- `vX.Y.Z`: publish both `@jmmarotta/seal` and `@jmmarotta/seal-sdk`.
- `seal-vX.Y.Z`: publish only `@jmmarotta/seal`.
- `seal-sdk-vX.Y.Z`: publish only `@jmmarotta/seal-sdk`.

## Release runbook

1. Add and commit changeset files in feature PRs.
2. Merge feature PR into `main`.
3. Merge the `Version packages` PR created by the `Changesets` workflow.
4. Publish via one of:

   ```bash
   gh workflow run publish.yml -f target=all -f dry_run=false
   # or target=cli / target=sdk
   ```

   or push a release tag (`vX.Y.Z`, `seal-vX.Y.Z`, `seal-sdk-vX.Y.Z`).

5. Verify versions:

   ```bash
   npm view @jmmarotta/seal version
   npm view @jmmarotta/seal-sdk version
   ```

## Branch protection

For `main`, require status checks:

- `checks`
- `tests`

## Trusted publisher setup

Configure npm Trusted Publisher for both packages:

- `@jmmarotta/seal`
- `@jmmarotta/seal-sdk`

Settings:

- Repository: `jmmarotta/seal`
- Workflow file: `.github/workflows/publish.yml`
- Environment: blank

## Publish troubleshooting

- `ENEEDAUTH`: trusted publisher config is missing/mismatched.
- `E422` provenance repository mismatch: package `repository.url` must match repo used in provenance.
- CLI publish build/type resolution failures: ensure `@jmmarotta/seal-sdk` stays externalized in CLI build and path mapping remains in `packages/cli/tsconfig.json`.
