# Development Contract Discipline

Fibre is under active development. During architecture and implementation work, the current contract is authoritative.

## Principle

Do not preserve obsolete compatibility paths merely to keep older tests, mocks, fixtures, or temporary callers working.

When a service boundary gains a required capability, update the callers and test doubles to implement that capability. Prefer a strict contract that fails fast over optional behavior that can silently hide an incorrectly composed production path.

Compatibility or migration behavior is justified only when there is an explicit product or deployment requirement to support an older persisted format, released interface, external consumer, or staged rollout. In that case the compatibility surface must be deliberate, documented, bounded, and removable.

## Testing rule

Tests and mocks must follow the architecture, not constrain it to an obsolete shape.

If a production collaborator now requires methods `A`, `B`, and `C`, a unit mock that only implements `A` and `B` should be updated to implement `C`; production code should not make `C` optional solely for the mock.

## Why

Optional compatibility branches can turn a real architecture invariant into best-effort behavior. That creates false-green tests and allows production miscomposition to degrade silently instead of failing at the boundary where the error belongs.

The default during development is therefore:

- current architecture over legacy behavior;
- strict required interfaces over permissive fallbacks;
- update tests and fixtures with the contract;
- add compatibility only for an explicit migration requirement.
