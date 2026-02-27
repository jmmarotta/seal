# Invariants

Invariants capture durable behavioral constraints that outlive any single spec.

## Lifecycle

- `draft`: proposed, not yet enforced.
- `active`: enforced and linked to concrete verification.
- `retired`: no longer applicable; cannot be reintroduced.

## File contract

Each invariant lives at `.seal/invariants/INV-<N>.md` with:

- frontmatter schema `seal.invariant.md.v1`
- matching `invariantKey` and filename
- required sections (`Statement`, `Scope`, `Verified By`, `Change History`)

## Verification linkage

Active invariants must list at least one `Verified By` entry.

Good `Verified By` references:

- test commands/suites
- checker rules
- schema enforcement
- operational runbooks

## Spec integration via `Invariant Deltas`

Specs declare invariant changes using `Introduced`, `Updated`, and `Retired` keys.

Checker constraints include:

- no key can appear in multiple delta categories in one spec
- already-retired invariants cannot be updated/reintroduced
- retirement should align with invariant file status

## Review guidance

- Confirm every active invariant has current verification backing.
- Treat retirements as explicit design decisions, not incidental edits.
- Keep invariant language implementation-agnostic and behavior-focused.
