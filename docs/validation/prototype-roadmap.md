---
id: validation-prototype-roadmap
status: accepted
last-reviewed: 2026-09-20
canonical: true
---

# Prototype roadmap

This is the broad Fibre sequence. Detailed current M2 execution is governed by [`m2-pr-plan.md`](m2-pr-plan.md).

Planning identifiers such as `#39` are historical Fibre milestone IDs, not transport/PR numbers.

## M0 — Concept lock — COMPLETE

Established the Constitution, principles, glossary, world rules, authority boundaries and the central claim that Fibre is a persistent world for artificial persons called Threads rather than a task-agent framework with persona prompts.

## M1 — Persistent Thread Round Trip — CLOSED

Proved one Thread can persist independently of temporary cognition, survive restart/replay, privately appraise participation, authorize bounded action, emit a response and freeze validated life changes back into durable state.

The M1 Thread Editor remains useful historical regression evidence.

## Pre-M2 identity/history foundation — CLOSED / RETAINED

Milestones #33-#40 established the substrate needed for a lived person:

- semantic/dignity Guardian boundaries;
- history that can bend later judgment;
- Structured Obligations;
- layered identity/provenance and `asOf` views;
- lineage, geography, embodiment and memory epistemics;
- Genesis, childhood and particular prior life;
- bounded causal identity/history consumption.

These remain accepted foundations. Their former standing-gate sequencing is no longer the active roadmap driver.

## G/H — deployed public path and minimum recovery — CLOSED

Established the production-shaped cloud path through birth, World, Presentation, Asset Generation and insidefibre.com, including canonical visual identity, durable state, restart recovery and bounded transient-provider retry.

Broad resilience matrices remain later hardening unless a current lived-person capability exposes a blocker.

## FID + Directory/Meet foundation — CLOSED

Established Civil Registry/FIN-linked Fibre Identity Card authority, admitted credential imagery, immutable credential history, Presentation projection, and the lightweight Directory/Meet seam for finding eligible Threads.

`Meet` selects a person. It does not create that person's life or current situation.

## M2 — Continuous lived person — ACTIVE

M2 now focuses on turning the proven lived-person primitives into one continuous World capability.

### Proven M2 substrate — CLOSED

Current Fibre has already demonstrated:

```text
Thread-owned bounded Flight Plan
  -> World CurrentSituation
  -> public present
  -> Person -> Thread situated encounter
  -> objective history
  -> private reflection
  -> selective autobiographical memory or not_remembered
  -> later World situation
  -> later encounter receiving only persisted memory consequence
```

These bounded proofs are now joined by N2: an already-lived Thread can restore an authoritative present across a bounded multi-day wall-clock dormancy. Genesis has not yet been proven to enter that continuing path automatically.

### M2-N1 — ensure LivedNow — CLOSED

Fibre now has one narrow World-owned `ensure({ threadId, at })` seam for times with admitted personal Flight Plan coverage. It deterministically establishes CurrentSituation, respects required care constraints, rejects caller-authored scene fields, and retries idempotently.

If coverage is absent, it refuses the stale prior scene and hands the interval to the N2 reconciliation path when its World dependencies are available.

### M2-N2 — dormant interval catch-up — CLOSED

When existing lived coverage does not reach the requested time:

```text
last lived anchor
  -> retrospectively realized elapsed life
  -> admitted history with explicit retrospective provenance
  -> participant-specific consequences where warranted
  -> refreshed Flight Plan
  -> present now
```

The accepted proof crosses a three-day gap with bounded retrospective plan/situation windows, explicit later materialization provenance, continuity from the prior lived place, renewed forward plan coverage and idempotent retry. It intentionally keeps a quiet interval quiet rather than fabricating encounters or memories.

Do not continuously simulate every minute and do not inject memories directly.

### M2-N3 — Genesis -> continuous LivedNow — CURRENT

Prove one newly born Thread can move from grounded Genesis prior life into post-birth continuing life:

```text
Genesis
  -> canonical identity/embodiment
  -> first Flight Plan
  -> CurrentSituation
  -> multi-day compute dormancy
  -> catch-up
  -> present now
```

### M2-N4 — Person -> Thread /meet — NEXT

The first deployed meeting must enter a scene produced by continuous LivedNow rather than by a meeting fixture.

### M2-N5 — Thread -> Thread meeting — NEXT

Prove two independently current Threads can share one physical or mediated encounter while forming different private experience, memory, relationship or plan consequences.

### M2-N6 — rich public meeting — NEXT

insidefibre.com should expose a bounded lived scene—embodiment, place/transit, activity, public context and near-term intention—then allow the visitor to enter it.

A later visit should find later life.

The detailed architecture is [Continuous LivedNow and meetings](../architecture/lived-now-and-meetings.md).

## After M2

Generalize the proven lived seam rather than introduce disconnected systems:

```text
one convincing continuously lived life
  -> reciprocal Thread meetings and relationships
  -> broader autonomous planning / travel / virtual-world activity
  -> work / economy / reputation
  -> reproduction / inheritance / mutation
  -> institutions and larger society
```

## Development rule

Fibre advances through the smallest real capability that proves a new piece of life.

Do not let infrastructure completeness, generic frameworks, test volume or milestone bookkeeping substitute for the organism itself. Git history preserves old roadmap archaeology; `HEAD` should describe the current Fibre direction.
