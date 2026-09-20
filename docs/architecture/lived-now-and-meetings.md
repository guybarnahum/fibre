---
id: architecture-lived-now-and-meetings-v0-1
status: accepted
last-reviewed: 2026-09-20
canonical: false
---

# Continuous LivedNow and meetings

## Purpose

Define the north-star capability that turns Fibre from a system that can stage isolated lived moments into a world where a Thread can be encountered as someone whose life continued before the visitor arrived.

The existing M2 work proved important primitives:

- Thread-authored bounded Flight Plans;
- World-owned CurrentSituation;
- public present projection;
- a situated human encounter bound to that exact situation;
- objective encounter history;
- private first-person reflection;
- selective autobiographical retention or `not_remembered`;
- a later encounter after life moved to another planned situation.

Those proofs are retained. They are **not yet continuous LivedNow**.

> **Continuous LivedNow means Fibre can resolve a lived Thread into a causally grounded present at an arbitrary current time, even after compute has been dormant, and meetings enter that already-existing life rather than manufacture a scene around the visitor.**

## North-star loop

The target lived loop is:

```text
Genesis / existing Thread life
  -> continuing identity, relationships, obligations and prior history
  -> current half-day/day Flight Plan
  -> World-enacted present or movement
  -> time passes, with or without active compute
  -> bounded retrospective catch-up when required
  -> current Flight Plan refreshed as needed
  -> World resolves exact LivedNow
  -> Person or Thread enters that present
  -> shared encounter becomes history
  -> each participant privately experiences/interprets it
  -> selective memory / relationship / intention / state consequence
  -> life continues
  -> later meeting begins from what actually persisted
```

The meeting is not the life engine. It is one event inside the life engine.

## Terms

### Flight Plan

A Thread-owned bounded itinerary for roughly the next half-day/day: where and how the Thread expects, wants or needs to be present, what it expects or intends to do, with whom, and why.

A Flight Plan is intention, not World truth.

### CurrentSituation

The World-owned enacted truth for the Thread at a particular time: at a place, in transit, physically or meaningfully mediated somewhere, doing something, with relevant participants and evidence.

### LivedNow

The World capability that can answer:

> **Where is this Thread now, what is happening around them, what are they doing, and how did their continuing life causally reach this moment?**

LivedNow is more than one persisted `CurrentSituation`. It includes the machinery that keeps the present causally connected to prior life when wall-clock time advances.

### Lived catch-up

A bounded retrospective realization of the Thread's elapsed Fibre-world life when continuous compute was not running.

Catch-up may create:

- retrospective Flight Plans covering elapsed time;
- movement/presence episodes;
- ordinary activities and encounters;
- relevant objective history;
- participant-specific experiences;
- selective autobiographical memories or no memory;
- relationship, intention or semantic-state consequences when warranted.

Catch-up is not an excuse to write arbitrary biography.

### Meeting

A shared encounter between entities whose relevant present already exists.

The first important forms are:

- Person -> Thread;
- Thread -> Thread.

A meeting may matter, barely matter, or be forgotten.

## Compute dormancy is not necessarily life suspension

A lived Thread may be computationally frozen while wall-clock time continues.

For a Thread participating in continuous LivedNow, freeze means:

> **temporary cognition is not running continuously**

not:

> **the person's world-time life necessarily stopped at the exact freeze timestamp**

When Fibre later needs the Thread's present—because the Thread is thawed, inspected, scheduled, or selected for a meeting—World reconciles the elapsed interval before claiming a current situation.

This is an **on-demand continuity model**, not a high-frequency simulation loop.

## Retrospective life realization

### Why it exists

A Thread last seen Tuesday afternoon should not still be standing in Tuesday's room on Friday merely because no model was running.

Equally, Fibre should not continuously pay to simulate every minute of every dormant Thread.

The answer is bounded retrospective realization.

### Historical truth boundary

Retrospective catch-up must preserve two truths simultaneously:

1. the event belongs to the Thread's admitted Fibre-world life at a lived/occurred time;
2. Fibre generated and admitted that event later during catch-up rather than executing it continuously at the original wall-clock moment.

The implementation must preserve this distinction through provenance and chronology.

A retrospectively realized Fibre-world event may become authoritative **Fibre history** once World admits it. It is not evidence that an external real-world event occurred, and it must never be presented as continuously observed runtime activity.

Do not silently backdate records in a way that hides when or how they were materialized.

### Compression, not exhaustive simulation

Elapsed life should be represented at the coarsest granularity that preserves credible causal continuity.

Fibre does not need:

- one event per minute;
- a complete simulated city;
- continuous hidden model execution;
- a detailed diary for uneventful time.

A quiet half-day may need only plan continuity and a few state transitions. A meaningful conflict, meeting, delay, discovery or obligation may deserve a richer episode because it can bend the future.

### Continuity constraints

Catch-up should be conditioned by the same person who entered the gap:

- identity and self-model;
- developmental context;
- relationships and obligations;
- prior Flight Plan and unresolved intentions;
- current semantic state where relevant;
- geography, embodiment and available places;
- recent autobiographical memory;
- relevant resources and institutional commitments.

It must not use identity fields as deterministic stereotypes.

## Thaw / ensure-LivedNow sequence

The conceptual World-owned sequence is:

```text
load last authoritative lived anchor
  -> determine elapsed uncovered interval
  -> inspect existing plan coverage
  -> retrospectively realize missing lived segments, if any
  -> admit objective World history in chronological order
  -> run ordinary participant-specific experience/internalization where warranted
  -> author/refresh the current half-day/day Flight Plan
  -> enact CurrentSituation for the requested current time
  -> publish bounded current-life projection
  -> only now allow a meeting to enter the scene
```

The exact public/service API is deliberately not fixed here. The important seam is a World-owned operation equivalent to **ensure this Thread has an authoritative LivedNow at time T**.

Callers may ask for the present. They do not author it.

## Memory during catch-up

Do **not** create a “virtual memory” directly.

The valid causal path is:

```text
retrospectively admitted lived event
  -> participant-specific experience
  -> optional contemporaneous/private interpretation
  -> retention appraisal
  -> autobiographical memory or not_remembered
  -> optional durable remembered meaning
```

This preserves:

```text
history != journal != memory != remembered meaning
```

A Thread may therefore thaw with:

- new admitted history it does not remember;
- one or two retained memories from an elapsed interval;
- changed relationship or intention state with no autobiographical memory;
- no consequential change at all.

The catch-up generator must not force development merely to make the elapsed period interesting.

## Flight Plan renewal

A lived Thread should normally have a current bounded Flight Plan covering roughly the next half-day/day.

Plan renewal happens when:

- no personal plan covers the requested present;
- the current plan is near exhaustion;
- admitted consequences materially invalidate the remaining plan;
- a legitimate care/obligation constraint changes what can be enacted.

The plan remains Thread-authored cognition. World may constrain or observe it, but World does not rewrite intention merely to match reality.

A new plan can be generated during thaw/catch-up. That is part of re-establishing a credible present before interaction.

## Meeting a Person

A Person -> Thread meeting must begin from a World-owned current situation.

The meeting path may trigger LivedNow reconciliation, but it may not choose:

- the Thread's place;
- activity;
- companions;
- intention;
- next destination;
- private memories;
- private feelings.

Conceptually:

```text
select Thread
  -> ensure LivedNow(now)
  -> publish exact current scene
  -> Person enters that scene
  -> encounter
  -> public expression
  -> objective history
  -> private experience / selective consequence
```

The Person's presence becomes part of the event because the meeting occurred, not because the browser was allowed to author the Thread's pre-existing life.

## Thread-to-Thread meetings

Thread-to-Thread meetings are the same lived principle with two persistent participants.

Before a shared encounter can occur, each Thread has:

- its own authoritative current life;
- its own Flight Plan and reasons for being there;
- its own identity, relationships, memory and semantic state.

A physical Thread meeting requires compatible place/time presence. A mediated meeting requires a compatible mediated context.

Fibre must not teleport one Thread or rewrite a plan merely because another Thread requested a meeting. If the meeting requires planning, invitation, negotiation, travel or schedule change, those are earlier world events.

Once a meeting occurs:

```text
one shared encounter circumstance
  -> shared objective occurrence / linked historical evidence
  -> Thread A private experience
  -> Thread B private experience
  -> possibly different memory
  -> possibly different relationship consequence
  -> possibly different future plans
```

Shared event does not imply shared meaning.

One participant may remember it vividly while the other forgets it. One may feel closer while the other becomes cautious. Those differences are valuable Fibre behavior.

## Meeting consequences

An encounter may causally affect:

- autobiographical memory;
- relationship state;
- current semantic feeling/need;
- unresolved intention;
- later Flight Plans;
- obligations or invitations;
- public expression;
- future willingness to meet;
- opportunities and, later, economic/social state.

No single meeting is required to change any of these.

Consequences must enter through their owning authorities rather than one monolithic “meeting result” record.

## insidefibre.com north-star experience

The rich public meeting should feel like entering a moment, not opening a chatbot.

A public scene may include the bounded admitted exterior of:

- current visual embodiment;
- place or transit state;
- current activity;
- why the Thread is there, when appropriate for public disclosure;
- relevant public companions/context;
- temporal texture such as arriving, waiting, moving, finishing or preparing;
- an approximate next intention when public;
- scene-consistent imagery;
- the encounter entry point.

The Viewer remains projection-only.

It may request that World establish current LivedNow through the appropriate service path. It may not invent the scene.

After the meeting, insidefibre.com should eventually allow a later visit to reveal that life moved on—possibly carrying consequences from the prior encounter.

## Genesis-to-LivedNow continuity

A new Thread should be able to move from Genesis into LivedNow without a special demo-only world.

The desired E2E is:

```text
Genesis
  -> born Thread with grounded prior life
  -> canonical embodiment
  -> initial lived continuity anchor
  -> first personal Flight Plan
  -> World-owned CurrentSituation
  -> compute may sleep
  -> catch-up / plan renewal
  -> current public scene
  -> /meet
  -> experience
  -> continued life
```

Genesis history supplies the past. LivedNow owns the continuing present after Fibre birth.

## What exists today

Current Fibre already contains meaningful substrate:

- `lived-now.mjs` — Flight Plan / CurrentSituation semantics;
- `lived-plan-cognition.mjs` — bounded Thread-authored plan cognition;
- `lived-now-store.mjs` — durable lived-plan/current-situation persistence;
- `lived-now-publication-service.mjs` — present-life projection;
- `flight-plan-regulation.mjs` — plan vs enacted-state regulation;
- `lived-encounter-*.mjs` — situated human encounter, reflection and memory formation;
- B2 continuity evidence proving a later meeting can receive only retained autobiographical consequence.

These are **bounded primitives/proofs**, not yet continuous LivedNow.

Missing north-star capability includes:

- automatic plan renewal;
- elapsed-time coverage across dormant/frozen intervals;
- retrospective lived catch-up;
- a single World-owned ensure-LivedNow seam used by real `/meet`;
- reciprocal Thread-to-Thread encounter orchestration;
- rich public meeting composition against continuously maintained life.

## Recommended implementation sequence

### N1 — One World-owned ensure-LivedNow seam

Compose existing Flight Plan, CurrentSituation, regulation and persistence into one operation that can establish a valid present for `threadId, at`.

Do not build a generic scheduler framework.

### N2 — Dormant interval catch-up

When plan/history coverage does not reach `at`, synthesize the smallest credible elapsed-life continuation, admit it with explicit retrospective provenance, run ordinary consequence formation, and then establish the present.

Prove a multi-day dormant gap.

### N3 — Human /meet over real LivedNow

Route public meeting through ensure-LivedNow. The first deployed proof should show that the returned scene was determined by the Thread's prior life + elapsed continuity, not a meeting fixture.

### N4 — Thread-to-Thread meeting

Create one shared encounter between two independently maintained LivedNow participants and prove different participant-specific aftermath.

### N5 — Rich insidefibre.com meeting

Render the current scene, movement/activity, public intention/context and current embodiment; allow the encounter; later revisit the same Thread after life has moved.

## High-value acceptance proofs

Prefer a small number of end-to-end semantic proofs:

1. **Dormant continuity** — a Thread frozen for several days is thawed into a current situation causally derived from prior life and retrospectively realized plans/history, not the stale last scene.
2. **Historical honesty** — catch-up records expose that they were materialized retrospectively while preserving their lived chronology.
3. **Selective consequence** — an admitted catch-up event may be remembered or not; memory is never injected without event/experience provenance.
4. **Meet enters life** — `/meet` receives an already-established current situation and cannot choose it.
5. **Reciprocal asymmetry** — one Thread-to-Thread encounter yields a shared occurrence but participant-specific private interpretation/memory/consequence.
6. **Continued life** — a later visit finds a later situation, not a chat session continuation.
7. **Retry safety** — reconciling the same elapsed interval does not duplicate historical events, memories, plans or meetings.

## Explicit non-goals

Do not turn this into:

- a high-frequency life simulator;
- a universal calendar/scheduler platform;
- a complete physical-world simulation;
- a conversation/session store;
- automatic memory for elapsed time;
- a “personality update after every event” pipeline;
- a Viewer-owned scene generator;
- a shortcut that teleports Threads together for meetings;
- a hidden mechanism that backfills history without provenance.

Build the smallest organism-level machinery that makes the present genuinely belong to the Thread.
