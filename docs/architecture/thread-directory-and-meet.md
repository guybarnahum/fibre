---
id: architecture-thread-directory-and-meet-v0-1
status: active
last-reviewed: 2026-09-09
canonical: false
---

# Thread Directory and Meet

## Purpose

Provide one lightweight modern Fibre seam for finding existing Threads and for meeting an eligible Thread for visualization / experience seeding.

This is broader than FID issuance. FID, Thread Editor, Thread Presentation and future experience surfaces may consume it, but none of them should become the canonical Thread directory.

## Principle

Start with the smallest useful capability. Do not build a search platform before Fibre needs one.

Use existing Fibre authorities and projections:

- exact FIN resolution through Civil Registry;
- discoverable/public Threads through the existing Thread Presentation catalog/snapshots;
- authorized operator search through bounded Thread-owned identity/presentation projections;
- `InfraDriver` remains below the service/deployment boundary, never in browser code.

The first implementation may scan/filter a bounded eligible set. Add indexing only when actual Thread population or latency requires it.

## Service shape

Conceptually:

```text
ThreadDirectory
  findByFin(fin)
  search({ query?, attributes?, scope?, limit? })
  meet({ seed?, attributes?, excludeThreadIds?, scope? })
```

`scope` controls the visibility/authorization domain, for example public discovery versus an authenticated operator view. Search must never reveal private/restricted attributes merely because they exist in Thread state.

## Discovery profile

Search operates on a bounded, explicitly discoverable projection rather than arbitrary hydrated Thread state.

Conceptually:

```text
ThreadDiscoveryProfile {
  threadId
  fin?                 # according to scope/policy
  displayName?
  lifecycleStatus?
  attributes {}        # only approved discoverable attributes
  presentationRef?
  snapshotDigest?
}
```

The attribute vocabulary should stay small and evolve from real product needs. Do not create a generic property-indexing framework.

## Exact FIN lookup

FIN lookup is authoritative and direct:

```text
FIN
  -> Civil Registry
  -> threadId
  -> authorized discovery/inspection projection
```

A lookup must not reproduce FIN allocation/checksum logic outside Civil Registry.

## Search by name + attributes

The initial search should support simple case-insensitive name matching plus exact/bounded attribute filters over the authorized discovery profile.

Examples:

```text
search({ query: "mina" })
search({ attributes: { geography: "Haifa" } })
search({ query: "mina", attributes: { lifecycleStatus: "active" } })
```

No ranking engine is required initially. Stable deterministic ordering is sufficient.

## Meet a Thread

`meet()` is a Fibre experience primitive, not a recommendation system.

It should:

1. establish the eligible visible candidate set;
2. apply optional attribute filters/exclusions;
3. select one Thread;
4. return its discovery profile plus the presentation/snapshot reference needed to visualize or seed an experience.

For reproducible experience seeding, a caller may supply a seed. The same eligible set + seed should choose the same Thread. Unseeded selection may use deployment randomness.

Conceptually:

```text
meet({
  seed: "walkthrough-001",
  excludeThreadIds: ["thr_..."]
})
  -> {
       thread,
       selection: {
         policyVersion,
         seed?,
         eligibleCount
       }
     }
```

Do not over-record the entire candidate set unless a later scientific/replay requirement needs it.

## Relationship to existing public discovery

Thread Presentation already exposes `/api/threads` over `InfraDriver.catalog`, filtering to currently public presentation channels. The Thread Directory should reuse/compose that modern seam for public discovery rather than replace it with a second provider-specific catalog.

The current public endpoint is intentionally sparse. Directory work may add a bounded public discovery profile, while private/operator discovery stays behind authenticated service boundaries.

## Development slices

### A0.1 — Directory read seam

- exact FIN -> Thread lookup through Civil Registry;
- list/discover eligible Threads through existing modern service projections;
- bounded `ThreadDiscoveryProfile`;
- simple name + approved-attribute filtering;
- no new search index.

Proof: FIN resolves correctly, visibility is respected, simple search returns only authorized fields.

### A0.2 — Meet

- `meet()` over the same eligible discovery set;
- optional filters/exclusions;
- deterministic seeded selection;
- return presentation/snapshot reference for visualization / experience seeding.

Proof: same seed + eligible set selects the same Thread; excluded/private Threads are never selected.

### A0.3 — Thread Editor surface

- search box accepts FIN or name;
- lightweight attribute filters;
- "Meet a Thread" action;
- selected result opens the existing modern Thread inspection experience.

This UI should remain a thin client over Thread Directory / World / Presentation service contracts.

## Fibre development discipline

Fibre development is vision-led:

- prefer small, elegant semantic capabilities over generic infrastructure;
- reuse modern Fibre interfaces before adding abstractions;
- avoid boilerplate, symmetry migrations and speculative scale work;
- write only enough tests to protect the slice's real semantic invariants and dangerous boundaries;
- do not multiply mocks/tests simply to raise coverage;
- keep code readable enough that the architecture is visible in the implementation;
- optimize for advancing the Fibre organism, society and lived experience.

Tests are guardrails, not the product.
