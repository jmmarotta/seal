# Changesets

Use Changesets to track package version bumps and changelog intent.

## Local flow

1. Add a changeset in your feature branch:

   ```bash
   bun run changeset
   ```

2. Commit the generated markdown file in `.changeset/`.
3. Merge to `main`.

### Changeset gate in CI

- PR checks run `changeset status --since=main`.
- If no new changeset is present, the check fails.
- For no-release changes (for example tests or tooling only), run:

  ```bash
  bun run changeset --empty
  ```

## Release flow

- The `changesets` GitHub workflow opens/updates a "Version packages" PR from merged changesets.
- Merge that PR to apply version/changelog updates.
- Publish using the publish workflow tags:
  - `vX.Y.Z` to publish both packages.
  - `seal-vX.Y.Z` to publish `@jmmarotta/seal` only.
  - `seal-sdk-vX.Y.Z` to publish `@jmmarotta/seal-sdk` only.
