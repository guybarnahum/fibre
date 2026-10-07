---
id: validation-prototype-roadmap
status: accepted
last-reviewed: 2026-10-05
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

These bounded proofs are now joined by N1-N4: a canonical Genesis-born Thread can restore an authoritative present across bounded wall-clock dormancy and a deployed Person -> Thread meeting can enter that exact reconciled life.

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

### M2-N3 — Genesis -> continuous LivedNow — CLOSED

A newly born Thread now moves from grounded Genesis prior life into post-birth continuing life:

```text
Genesis
  -> canonical identity/embodiment
  -> first Flight Plan
  -> CurrentSituation
  -> multi-day compute dormancy
  -> catch-up
  -> present now
```

### M2-N4 — Person -> Thread /meet — CLOSED

The deployed meeting now enters a scene produced by continuous LivedNow rather than by a meeting fixture, and the subsequent encounter remains bound to the exact returned `situationId`.

### M2-N5 — Encounter Story -> Thread Experience — CLOSED LIVE

N5 is closed. The accepted general seam is:

```text
World occurrence
  -> objective Encounter Story
  -> Thread-specific noticing / experience
  -> optional journal
  -> selective consequence
```

Environmental noticing, voluntary social meeting, silent-witness asymmetry, journal/memory separation, objective visualization lineage and the combined visitor-work path are accepted. The live closure proved prior voluntary availability -> revised Flight Plan -> active mediated work presence -> public Meet -> Encounter Story -> Thread Experience -> exactly-once Fibre Credit settlement.

Historical natural-social W0-W7 work remains useful evidence and a preserved follow-on, but it is not the current M2 roadmap.

### M2-N6 — Rich Public Lived Encounter — ACTIVE

insidefibre.com should expose a bounded current life before interaction, allow a committed visitor encounter inside that exact scene, and later show the same Thread living a later moment.

The current sequence is:

```text
visit current life
  -> enter exact lived scene
  -> optional committed meeting
  -> ordinary consequence
  -> leave
  -> later visit
  -> later life
```

N6 deliberately reuses the accepted meeting/work/encounter machinery. It does not introduce a conversation session or second current-life authority.

Follow [N6 rich public lived encounter slices](n6-public-lived-encounter-slices.md). The remaining N6.6 public endpoint/Viewer proof is preserved and resumable.

### M2-N7 — Live encounters and social consequence — ACTIVE

The first sustained direct World conversation showed that N6's causal authorities are sound but its interaction transport is still turn-shaped. N7 removes that implementation constraint:

```text
continuing World life
  + asynchronous participant speech/actions
  -> speaking opportunities at punctuation / pause / end-of-stream
  -> interruptible streamed expression
  -> only exposed speech becomes Encounter Story truth
  -> participant-specific Experience
  -> bounded later consolidation
  -> relationship / memory / question / intention consequence when warranted
```

N7 deliberately converges Person -> Thread and Thread -> Thread on one Live Encounter primitive. It introduces no durable chat session, no turn manager, no token-by-token cognition and no causal sociability score.

Follow [N7 live encounter slices](n7-live-encounter-slices.md) and [Live encounters](../architecture/live-encounters.md).

## After M2

Generalize the proven lived seam rather than introduce disconnected systems:

```text
one convincing continuously lived life
  -> general encounters, reciprocal meetings and relationships
  -> broader autonomous planning / travel / virtual-world activity
  -> work / economy / reputation
  -> reproduction / inheritance / mutation
  -> institutions and larger society
```

## Development rule

Fibre advances through the smallest real capability that proves a new piece of life.

Do not let infrastructure completeness, generic frameworks, test volume or milestone bookkeeping substitute for the organism itself. Git history preserves old roadmap archaeology; `HEAD` should describe the current Fibre direction.
