# Changesets

Use Changesets to track package version bumps and changelog intent.

## Local flow

1. Add a changeset in your feature branch:

   ```bash
   bun run changeset
   ```

2. Commit the generated markdown file in `.changeset/`.
3. Merge to `main`.

## Release flow

- The `changesets` GitHub workflow opens/updates a "Version packages" PR from merged changesets.
- Merge that PR to apply version/changelog updates.
- Publish using the publish workflow tags:
  - `vX.Y.Z` to publish both packages.
  - `seal-vX.Y.Z` to publish `@jmmarotta/seal` only.
  - `seal-sdk-vX.Y.Z` to publish `@jmmarotta/seal-sdk` only.
