---
id: ADR-0020
status: accepted
last-reviewed: 2026-09-09
---

# ADR-0020: Vision-led development and abstraction stop conditions

## Status

Accepted.

## Context

Fibre requires serious infrastructure: durable semantic state, provider-neutral production persistence, reproducible model invocation, media generation, deployment adapters and other operational machinery. Those foundations matter because a Thread must remain a coherent persistent individual rather than a disposable model session.

The same work becomes counterproductive when infrastructure, test scaffolding, abstraction or generic engineering completeness becomes its own objective. Store-by-store migrations, generalized capability surfaces, exhaustive provider parity, oversized test matrices and boilerplate can consume development effort without making Threads more individual, more causally grounded, more persistent, more socially embedded or more capable of living in the World.

Fibre is not an infrastructure framework with an agent demo. Infrastructure and tests exist to preserve and enable the Fibre organism.

## Decision

Fibre development is **vision-led, lite and elegant**. The default priority is the smallest implementation that advances a concrete Fibre capability while preserving its semantic invariants.

Infrastructure, abstraction and validation work is justified when it does at least one of the following:

1. enables a concrete near-term Fibre capability;
2. preserves a Fibre semantic invariant that would otherwise be violated;
3. removes a demonstrated blocker to the current Fibre milestone;
4. is required for an imminent production path that Fibre is actually preparing to run;
5. provides the smallest representative proof needed before Fibre capability work can safely continue.

Infrastructure or test work is **not** justified merely because:

- another store can be migrated for symmetry;
- an abstraction could be more general;
- a hypothetical future provider might need another layer;
- a generic service pattern would look cleaner on a diagram;
- every theoretical failure mode could be covered;
- a test matrix could be made exhaustive;
- common boilerplate can be introduced without serving a current Fibre capability;
- known migration debt still exists but is not blocking the Fibre capability currently being built.

## Minimum sufficient implementation

Prefer:

```text
real Fibre capability
  -> smallest semantic implementation
  -> focused proof of the important invariants
  -> run existing repository checks
  -> stop
  -> return to the Fibre organism
```

Do not build generic frameworks, speculative extension points, compatibility layers or reusable abstractions before a second real Fibre use requires them.

Duplication that is small, local and obvious may be preferable to premature abstraction. Elegance means clear authority boundaries and small code, not maximum generality.

## Minimum sufficient testing

Tests should provide **high signal per test**.

For a new Fibre capability, add only enough focused coverage to establish:

- the semantic success path;
- the important authority/invariant boundary;
- a demonstrated regression or failure mode when one exists.

Do not manufacture large acceptance matrices, exhaustive combinations, broad provider parity or defensive boilerplate unless a real defect, production boundary or Fibre invariant requires them.

Existing repository-wide checks remain useful as regression protection, but creating more tests is not itself progress toward the Fibre vision.

A test should make failures faster to understand. Test and validation errors must be developer-friendly:

- never print an entire source file, generated file, document, large payload or full object merely because an assertion failed;
- print the smallest useful expected/actual fragment, field, path, key, digest or bounded diff;
- identify the failing semantic condition directly;
- truncate large values and point to the artifact/path when deeper inspection is needed;
- prefer one actionable diagnostic over pages of incidental output.

## Required discipline for infrastructure slices

Every substantial infrastructure slice must be able to name:

- the Fibre capability or semantic invariant it serves;
- the concrete failure or lock-in it prevents;
- the smallest proof that establishes the needed architecture;
- the stop condition after which additional cleanup becomes backlog debt rather than critical-path work.

If those cannot be stated concretely, the work should normally be deferred.

## Proof over exhaustive migration

A cross-cutting architectural rule does not require exhaustive migration before Fibre development may continue.

The preferred sequence is:

```text
real Fibre requirement
  -> hardest representative vertical proof
  -> executable invariant / focused conformance test
  -> enough adoption to validate the boundary
  -> return to Fibre capability development
  -> migrate remaining debt when a real feature or production path reaches it
```

This is especially important for `InfraDriver`. Provider-neutral persistence remains an accepted production constraint, but the goal is to prove that Fibre semantics survive the boundary — not to spend the critical path abstracting every existing local store before advancing identity, development, relationships, economy or lived experience.

## Priority consequence

When a choice exists between:

- extending an already-proven infrastructure abstraction or test matrix into another non-blocking corner; and
- advancing a Fibre capability such as lived embodiment, causal identity/history consumption, self-authored development, reciprocal relationships, lived history or economic consequence;

Fibre capability work wins by default.

The exception is when the infrastructure or validation work is necessary to make that Fibre capability correct, durable or deployable.

## Relationship to technical debt

Deferring non-blocking migration is not permission to create new bypasses.

Accepted architecture rules still govern new code. Existing direct-provider or direct-SQLite paths may remain tracked migration debt after the architectural proof is sufficient. They should be migrated when:

- a Fibre feature touches them materially;
- production deployment requires them;
- they prevent a stronger semantic transaction or standing proof; or
- their continued existence creates a demonstrated correctness risk.

Debt must remain visible, but debt visibility must not become a mandate to clear the entire abstraction backlog before Fibre evolves.

## Consequences

Positive:

- engineering effort remains tied to the Fibre vision;
- implementation remains smaller and easier to reason about;
- tests protect important semantics without dominating the roadmap;
- infrastructure is tested against real requirements rather than invented generality;
- architectural proofs can stop when they have earned confidence;
- known cleanup can remain explicit without becoming a false prerequisite for organism development;
- failure output remains concise and actionable for developers.

Costs:

- the repository may temporarily contain mixed migrated and legacy persistence paths;
- some infrastructure cleanup will be intentionally deferred;
- some edge cases will remain untested until they become real risks;
- engineers must exercise judgment about what constitutes a sufficient representative proof;
- later production work may reopen deferred migration debt when a real capability reaches it.

This ADR complements, rather than weakens, [`ADR-0017-provider-neutral-production-persistence.md`](ADR-0017-provider-neutral-production-persistence.md). ADR-0017 defines the production boundary. ADR-0020 defines how much engineering belongs on the critical path at any given time.
