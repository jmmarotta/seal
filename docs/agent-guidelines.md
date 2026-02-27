# Agent Guidelines

Use these conventions when an agent edits SEAL workspaces.

## Editing discipline

- Prefer contract updates in `spec.md` before implementation edits.
- Keep each PR scoped to one spec key when possible.
- Do not manually force `work.md` to `done`; use `seal edit status`.

## Evidence discipline

- Prefer artifact evidence with deterministic hashes.
- Keep artifact paths under `.seal/specs/<SPEC_KEY>/artifacts/`.
- Use `note` evidence for context only; it does not satisfy done gates.

## Reopen and reseal

- If contract-impacting updates occur after done, reopen to `active`.
- Update verification/review/evidence sections as needed before resealing.

## Learnings discipline

- Create `learnings.md` only when there is reusable insight.
- Promote durable learnings into invariants where appropriate.

## Inbox discipline

- Keep INBOX items as top-level `I-<N>` bullets.
- Remove or update promoted items in the same change that creates the spec.
