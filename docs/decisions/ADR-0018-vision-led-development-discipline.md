---
id: ADR-0018
status: accepted
last-reviewed: 2026-08-28
---

# ADR-0018: Vision-led development and abstraction stop conditions

## Status

Accepted.

## Context

Fibre requires serious infrastructure: durable semantic state, provider-neutral production persistence, reproducible model invocation, media generation, deployment adapters and other operational machinery. Those foundations matter because a Thread must remain a coherent persistent individual rather than a disposable model session.

The same work can become counterproductive when infrastructure becomes its own objective. Store-by-store migrations, generalized capability surfaces and hypothetical provider portability can consume development effort without making Threads more individual, more causally grounded, more persistent, more socially embedded or more capable of living in the World.

Fibre is not an infrastructure framework with an agent demo. Infrastructure exists to preserve and enable the Fibre organism.

## Decision

Fibre development is **vision-led**. The default priority is work that creates, strengthens or proves a concrete Fibre capability or standing claim.

Infrastructure and abstraction work is justified when it does at least one of the following:

1. enables a concrete near-term Fibre capability;
2. preserves a Fibre semantic invariant that would otherwise be violated;
3. removes a demonstrated blocker to the next standing milestone;
4. is required for an imminent production path that Fibre is actually preparing to run;
5. provides a representative architectural proof needed before Fibre capability work can safely continue.

Infrastructure work is **not** justified merely because:

- another store can be migrated for symmetry;
- an abstraction could be more general;
- a hypothetical future provider might need another layer;
- a diagram would become more uniform;
- known migration debt still exists but is not blocking the Fibre capability currently being built.

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
  -> executable invariant / conformance test
  -> enough adoption to validate the boundary
  -> return to Fibre capability development
  -> migrate remaining debt when a real feature or production path reaches it
```

This is especially important for `InfraDriver`. Provider-neutral persistence remains an accepted production constraint, but the goal is to prove that Fibre semantics survive the boundary — not to spend the critical path abstracting every existing local store before advancing identity, development, relationships, economy or lived experience.

## Priority consequence

When a choice exists between:

- extending an already-proven infrastructure abstraction into another non-blocking corner; and
- advancing a standing Fibre capability such as causal identity/history consumption, Whole-Person/M2 standing, self-authored development, reciprocal relationships, embodiment, lived history or economic consequence;

Fibre capability work wins by default.

The exception is when the infrastructure work is necessary to make that Fibre capability correct, durable or deployable.

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

- engineering effort remains tied to the Fibre vision and standing milestones;
- infrastructure is tested against real semantic requirements rather than invented generality;
- architectural proofs can stop when they have earned confidence;
- known cleanup can remain explicit without becoming a false prerequisite for organism development;
- future planning has a clear test for whether a proposed abstraction belongs on the critical path.

Costs:

- the repository may temporarily contain mixed migrated and legacy persistence paths;
- some infrastructure cleanup will be intentionally deferred;
- engineers must exercise judgment about what constitutes a sufficient representative proof;
- later production work may reopen deferred migration debt when a real capability reaches it.

This ADR complements, rather than weakens, [`ADR-0017-provider-neutral-production-persistence.md`](ADR-0017-provider-neutral-production-persistence.md). ADR-0017 defines the production boundary. ADR-0018 defines how much abstraction work belongs on the critical path at any given time.
