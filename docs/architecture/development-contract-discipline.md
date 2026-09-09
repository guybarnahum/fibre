# Development Contract Discipline

Fibre is under active development. During architecture and implementation work, the current contract is authoritative.

## Principle

Do not preserve obsolete compatibility paths merely to keep older tests, mocks, fixtures, or temporary callers working.

When a service boundary gains a required capability, update the callers and test doubles to implement that capability. Prefer a strict contract that fails fast over optional behavior that can silently hide an incorrectly composed production path.

Compatibility or migration behavior is justified only when there is an explicit product or deployment requirement to support an older persisted format, released interface, external consumer, or staged rollout. In that case the compatibility surface must be deliberate, documented, bounded, and removable.

## Vision-led implementation

Fibre is not a generic infrastructure project. Implementation should advance the Fibre organism, society and lived experience with the smallest clear capability that proves the next semantic step.

Prefer:

- light, elegant code over framework-building;
- modern Fibre interfaces already in the repo over new abstractions;
- one useful semantic capability per slice;
- direct composition over boilerplate layers;
- actual product/organism needs over speculative scale, symmetry or migration work.

Do not build generic indexing, persistence, orchestration or compatibility machinery until a concrete Fibre capability requires it.

## Testing rule

Tests and mocks must follow the architecture, not constrain it to an obsolete shape.

Use enough tests to protect the semantic invariant and dangerous boundary of the slice. Tests are guardrails, not the product. Do not multiply mocks, fixtures or cases merely to raise coverage or exhaustively test boilerplate.

If a production collaborator now requires methods `A`, `B`, and `C`, a unit mock that only implements `A` and `B` should be updated to implement `C`; production code should not make `C` optional solely for the mock.

## Why

Optional compatibility branches can turn a real architecture invariant into best-effort behavior. Generic boilerplate can also consume development energy without moving Fibre toward richer identity, continuity, relationships, experience or society.

The default during development is therefore:

- current architecture over legacy behavior;
- Fibre capability over generic infrastructure;
- strict required interfaces over permissive fallbacks;
- focused invariant tests over broad boilerplate coverage;
- update tests and fixtures with the contract;
- add compatibility or scale machinery only for an explicit requirement.
