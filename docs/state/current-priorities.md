---
id: fibre-current-priorities
status: accepted
last-reviewed: 2026-09-20
canonical: true
---

# Current priorities

Fibre's active north star is now **continuous LivedNow + meetings**.

The bounded M2 slices proved the core pieces of a lived person. N1 establishes World-owned present life, N2 restores it across bounded multi-day dormancy, and N3 makes a canonical Genesis birth enter that same continuity seam and survive the same dormant path. N4 is now wired so meeting entry reconciles LivedNow before the visitor enters; the active work is deployed acceptance of that exact path.

Canonical architecture:

- [Continuous LivedNow and meetings](../architecture/lived-now-and-meetings.md)
- [The Lived World of Fibre](../vision/lived-world.md)
- [ADR-0023: Retrospective lived continuity across compute dormancy](../decisions/ADR-0023-retrospective-lived-continuity.md)

## What is already proven

```text
R1-R4 intrinsic regulation                                CLOSED

A1 bounded Flight Plan + CurrentSituation                 CLOSED
A2 care plan + conflicting wills                          CLOSED
A3 current-life inspection/projection                     CLOSED
A4 public present projection                              CLOSED
A5 situated Person -> Thread encounter                    CLOSED
B1 encounter -> private reflection -> selective memory    CLOSED
B2 later situation + later encounter continuity           CLOSED
```

These are valuable **primitives and bounded proofs**.

They do not yet prove:

```text
wall-clock dormancy
  -> elapsed-life catch-up
  -> plan renewal
  -> authoritative present now
  -> real deployed /meet
```

Therefore Fibre should no longer describe the remaining work as merely “run the live meeting.” The deployed meeting depends on continuous LivedNow first.

## Active sequence

```text
N1  World-owned ensure-LivedNow seam                      CLOSED
N2  dormant/frozen interval catch-up                      CLOSED
N3  Genesis -> first LivedNow -> multi-day continuity     CLOSED
N4  Person -> Thread /meet over real LivedNow             CURRENT
N5  Thread -> Thread reciprocal meeting                   NEXT
N6  rich insidefibre.com lived meeting                    NEXT
```

Keep these slices narrow. Reuse the existing Flight Plan, CurrentSituation, encounter, memory, relationship, Presentation and canonical embodiment authorities.

For a lived Thread, treat a current half-day/day Flight Plan as a rolling continuity expectation. If compute slept, thaw/catch-up may realize the missing plan/history retrospectively, but it must preserve lived-time versus materialization-time provenance and may form memory only through the normal experience/retention path.

Do not create a parallel life engine.

## N1 — ensure LivedNow — CLOSED

World now has one narrow `ensure({ threadId, at })` seam. For time already covered by an admitted personal Flight Plan, it deterministically enacts the World-owned CurrentSituation, respects a covering required care constraint, rejects caller-authored scene fields, and is idempotent for the same requested present.

When no personal Flight Plan covers the requested time, the seam still refuses to reuse a stale CurrentSituation or accept a meeting-authored scene. With the N2 reconciliation dependencies present, that uncovered interval now routes into bounded dormant catch-up before the present is established.

The seam composes existing `LivedNowStore`, Flight Plan, care-resolution and CurrentSituation authorities. It does not create another planner, scheduler or life store.

## N2 — dormant interval catch-up — CLOSED

A lived Thread may be computationally frozen while world time passes. The first N2 proof now takes a valid prior lived anchor across a three-day dormant gap, consumes the remaining already-authored plan coverage first, materializes only a bounded number of retrospective plan/situation windows, authors fresh forward coverage, and establishes a non-stale present.

When an uncovered interval exists, World may retrospectively realize the smallest credible continuation:

- bounded retrospective Flight Plans;
- place/transit/activity episodes;
- encounters only when warranted;
- objective history;
- participant-specific consequences through normal authorities.

Historical honesty is mandatory:

```text
lived/occurred time
    !=
later materialization/admission time
```

Do not inject “virtual memories.”

The valid path is:

```text
retrospectively admitted event
  -> experience / interpretation
  -> selective memory or not_remembered
```

Quiet time remains sparse. This is not a minute-by-minute simulator.

The admitted retrospective records preserve both their lived timestamps and `materialization: { mode: "retrospective", materializedAt }`. Catch-up is bounded to a small number of windows, continues from the prior lived place instead of teleporting, and retrying the same requested present does not regenerate the gap. The quiet-gap proof does not manufacture an encounter or memory merely to demonstrate consequence; when future catch-up synthesis admits an event that warrants consequence, it must use the ordinary experience/retention authorities already proven by B1/B2.

## N3 — Genesis to continuing life — CLOSED

A canonical Genesis birth now exits through the same World-owned LivedNow seam used later: the `THREAD_SEEDED` event defines the Fibre birth boundary, the latest grounded Genesis place anchors the first plan/present, and a direct request several days later reuses N2 catch-up rather than a Genesis-specific life engine.

The important E2E is no longer merely:

```text
Genesis -> born Thread -> presentation
```

It is:

```text
Genesis
  -> born Thread with grounded prior life
  -> canonical embodiment
  -> first lived continuity anchor
  -> first personal Flight Plan
  -> World CurrentSituation
  -> compute sleeps
  -> several days pass
  -> catch-up + plan renewal
  -> authoritative present now
```

This is the bridge between Genesis and the lived world.

Genesis supplies grounded prior life. LivedNow owns life after Fibre birth.

## N4 — Person -> Thread meeting — IMPLEMENTED, DEPLOYED ACCEPTANCE PENDING

`/meet` now asks World to establish LivedNow before exposing the scene. Meeting is an intersection with ongoing life, not a scene-creation API.

```text
select Thread
  -> ensure LivedNow(now)
  -> publish exact bounded present
  -> Person enters that scene
  -> objective encounter
  -> private experience
  -> selective consequence
```

The visitor cannot choose the Thread's location, activity, private state or plan.

The automated path proves meeting entry cannot author the scene, reconciles before exposure, and keeps later utterances bound to the returned `situationId`. N4 closes only after the deployed public stack demonstrates that same path against a real Thread.

## N5 — Thread -> Thread meeting

Thread-to-Thread meetings are intersections of two continuing lives.

Each participant must independently have:

- a current Flight Plan;
- a World-owned present;
- a reason for being there;
- its own identity, relationships, memory and semantic state.

A physical meeting requires compatible place/time presence. A mediated meeting requires compatible mediated context.

Do not teleport Threads together merely because a meeting was requested.

One shared occurrence may produce different private aftermath:

```text
shared encounter
  -> Thread A experience / memory / relationship consequence
  -> Thread B experience / memory / relationship consequence
```

Shared event does not imply shared meaning.

## N6 — rich insidefibre.com meeting

The public experience should feel like entering a life, not opening a chatbot.

A bounded public scene may expose:

- current embodiment;
- place or transit state;
- current activity;
- temporal texture such as arriving, waiting or preparing;
- public accompaniment/context;
- an appropriate near-term intention;
- scene-consistent imagery;
- the meeting entry point.

The Viewer remains projection-only.

A later visit should find that the Thread moved on.

## Current causal loop

```text
continuing Thread
  -> Flight Plan
  -> enacted World situation
  -> elapsed life / catch-up
  -> present now
  -> encounter
  -> objective history
  -> optional private reflection
  -> retention appraisal
  -> autobiographical memory or not_remembered
  -> possible relationship / intention / state consequence
  -> future Flight Plan
```

## Memory invariant

A later encounter may receive bounded autobiographical memories.

It must not receive hidden history or private journal records and silently reconstruct them as recollection.

Therefore:

```text
history exists + not_remembered
    -> later ordinary cognition has no autobiographical recollection

history exists + retained autobiographical memory
    -> later cognition may be shaped by that memory
```

This applies equally to real-time encounters and retrospectively realized catch-up life.

## High-value acceptance sequence

Prefer a few organism-level proofs:

1. **multi-day dormant continuity** — a stale Thread becomes current through retrospective lived continuity rather than remaining in the old scene;
2. **historical honesty** — retrospective materialization is inspectable;
3. **selective retention** — catch-up history can be remembered or forgotten through the normal memory authority;
4. **Person meet** — `/meet` joins an already-established current scene;
5. **Thread meet** — two independently current Threads share one encounter but form different private consequences;
6. **continued life** — a later visit finds later life, not a resumed chat session;
7. **idempotence** — retrying catch-up does not duplicate plans, events, memories or encounters.

## Explicitly not the current priority

- continuous high-frequency simulation;
- a universal calendar/scheduler product;
- broad infrastructure abstraction;
- exhaustive resilience matrices;
- a conversation/session store;
- an event-to-memory formula;
- society-scale economy before reciprocal lived meetings work;
- security or hardening work unrelated to a demonstrated Fibre need.

## Development discipline

Always prefer the lightest implementation that preserves the ambitious Fibre architecture.

Every piece of code should earn its place by advancing a persistent artificial person's lived continuity, individuality, relationship, agency or future possibility.

Tests must be even stricter:

- high-value;
- semantic;
- non-brittle;
- short meaningful failures;
- no incidental HTTP/header/helper trivia unless that boundary itself protects a Fibre invariant.

## Branch posture

Current work is on `main` unless the owner explicitly chooses another branch.

Historical agent branches are not planning authority.
