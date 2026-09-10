---
id: architecture-thread-directory-and-meet-v0-1
status: active
last-reviewed: 2026-09-10
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
4. returns the discovery profile plus the public Presentation/current-situation reference needed to encounter that Thread **where they already are**.

The call must not choose the Thread's location, activity, personal flight plan, caregiver plan or immediate intention. Those facts must already exist through their owning Fibre authorities before selection.

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

A dependent person's private will/care negotiation is not automatically public. Presentation decides the bounded exterior projection; World/Thread state remains authoritative underneath it.

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
- return the existing Presentation/current-situation reference;
- never materialize or rewrite the selected Thread's life.

### A0.3 — Thread Editor

- FIN/name search;
- lightweight filters;
- `Meet a Thread`;
- open the selected Thread in the authorized modern inspection view.

## Development discipline

Prefer small semantic capabilities over generic infrastructure. Reuse existing Fibre interfaces, write only enough tests to protect the actual authority/visibility boundaries, and optimize for advancing lived experience rather than framework completeness.
