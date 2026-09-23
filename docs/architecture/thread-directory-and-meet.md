---
id: architecture-thread-directory-and-meet-v0-1
status: active
last-reviewed: 2026-09-23
canonical: false
---

# Thread Directory and Meet

## Purpose

Provide one lightweight seam for finding existing Threads and entering the life of an eligible Thread without creating a second identity, location or encounter authority.

FID, Thread Editor, Thread Presentation and insidefibre.com may consume this seam. None becomes the canonical Thread directory.

## Principle

Start with the smallest useful capability and existing Fibre authorities:

- exact FIN resolution through Civil Registry;
- discoverable/public Threads through Thread Presentation;
- authorized operator search through bounded Thread-owned projections;
- current situation and plans remain World/Thread-owned;
- `InfraDriver` stays below service/deployment boundaries and out of browser code.

The first implementation may scan/filter a bounded eligible set. Add indexing only when population or latency requires it.

## Service shape

```text
ThreadDirectory
  findByFin(fin)
  search({ query?, attributes?, scope?, limit? })
  meet({ seed?, attributes?, excludeThreadIds?, scope? })
```

`scope` controls visibility/authorization. Search never reveals private/restricted attributes merely because they exist.

## Discovery profile

Search operates on a bounded discoverable projection, not arbitrary hydrated Thread state.

```text
ThreadDiscoveryProfile {
  threadId
  fin?
  displayName?
  lifecycleStatus?
  developmentalContext?
  attributes {}
  presentationRef?
  snapshotDigest?
}
```

Keep the public attribute vocabulary small and driven by real product needs.

## Exact FIN and search

FIN lookup remains authoritative:

```text
FIN
  -> Civil Registry
  -> threadId
  -> authorized discovery/inspection projection
```

Initial search supports simple case-insensitive name matching plus bounded approved attributes. No ranking engine is required.

## Meet a Thread

`meet()` is a Fibre encounter primitive, not a recommendation system and not a situation generator.

It:

1. establishes the eligible visible candidate set;
2. applies optional filters/exclusions;
3. selects one Thread;
4. asks World to ensure that selected Thread has an authoritative LivedNow for the encounter time;
5. returns the discovery profile plus the resulting public Presentation/current-situation reference needed to encounter that Thread **where they already are**.

`meet()` may therefore trigger thaw/catch-up reconciliation. It still does **not** choose the Thread's location, activity, personal Flight Plan, caregiver plan, companions or immediate intention. Those facts are authored/reconciled by their owning Fibre authorities.

If World cannot establish a trustworthy current situation, the Thread is not meetable at that moment. The meeting path must not manufacture a fallback scene.

A seed may make **which eligible Thread is selected** reproducible. It must never seed or manufacture that Thread's life.

```text
meet({ seed: "walkthrough-001" })
  -> {
       thread,
       selection: {
         policyVersion,
         seed?,
         eligibleCount
       }
     }
```

## Thread Editor

Thread Editor is the authorized operator lens over the same directory and World/Presentation contracts.

The modern surface should support:

- search by FIN or name;
- lightweight approved filters;
- `Meet a Thread`;
- inspection of the selected person's identity, developmental context, personal/care plans when authorized, enacted current situation, relationships, history, memory, embodiment and provenance.

The editor remains read-oriented and must not become a generic database browser or semantic authority.

## insidefibre.com

insidefibre.com consumes public Presentation/Directory projections only.

Its purpose is not inspection. The selected Thread should appear as a person already living a moment: current embodiment, place, activity, relevant accompaniment/context and an encounter entry point grounded in that same situation.

For the public **Meet a Thread** experience, reliability comes from prior voluntary availability rather than click-time coercion. A Thread may accept a bounded paid commitment to meet website visitors during a window. That accepted commitment is owned by ordinary Thread/World life authorities and may shape Flight Planning and mediated presence before a visitor arrives.

The Directory/Viewer may then select only from Threads whose accepted commitment makes them genuinely available. It does not create the commitment, move the Thread, invent willingness or treat payment as a general price for social attention.

Conceptually:

```text
Thread accepts Inside Fibre availability work
  -> commitment enters lived life
  -> Flight Plan / LivedNow establish mediated availability
  -> Directory exposes eligible available Thread
  -> visitor clicks Meet
  -> visitor enters the already-committed mediated meeting
```

This is intentionally narrower than a general employment marketplace. The first goal is one reliable Person -> Thread meeting on insidefibre.com. Exact job-market and professional-service abstractions remain deferred until this lived seam requires them.

That first reliable path is now closed live in staging. A real Thread voluntarily accepted a bounded future visitor-availability shift; the commitment revised the Flight Plan; LivedNow later enacted the mediated work presence; public Meet selected the Thread only during that active committed window; the visitor exchange became a normal Encounter Story and Thread Experience; and the agreed Fibre Credits settled exactly once. Public Presentation exposes only bounded availability timing, never the commitment ID, compensation or private acceptance reasoning.

A dependent person's private will/care negotiation is not automatically public. Presentation decides the bounded exterior projection; World/Thread state remains authoritative underneath it.

## Thread-to-Thread meetings

Directory selection is not the authority that creates a Thread-to-Thread encounter either.

Before a reciprocal meeting, both participants must independently resolve to authoritative LivedNow. A physical encounter requires compatible place/time presence; a mediated encounter requires compatible mediated context.

If two Threads are not already on intersecting paths, any invitation, negotiation, plan change or travel needed to create the meeting happens **before** the encounter through ordinary Fibre authorities.

Once the meeting occurs, Fibre should preserve one shared occurrence or linked shared evidence while allowing separate private experience, memory and relationship consequences for each Thread.

See [Continuous LivedNow and meetings](lived-now-and-meetings.md).

## Development slices

### A0.1 — Directory read seam

- FIN -> Thread through Civil Registry;
- discover eligible Threads through modern service projections;
- bounded `ThreadDiscoveryProfile`;
- simple name + approved-attribute filtering;
- no new search index.

### A0.2 — Meet

- select from the same eligible set;
- optional filters/exclusions;
- deterministic seeded **selection**;
- request World-owned LivedNow reconciliation for the selected Thread;
- return the reconciled Presentation/current-situation reference;
- never author the selected Thread's life inside Directory/Viewer code.

### A0.3 — Thread Editor

- FIN/name search;
- lightweight filters;
- `Meet a Thread`;
- open the selected Thread in the authorized modern inspection view.

## Development discipline

Prefer small semantic capabilities over generic infrastructure. Reuse existing Fibre interfaces, write only enough tests to protect the actual authority/visibility boundaries, and optimize for advancing lived experience rather than framework completeness.
