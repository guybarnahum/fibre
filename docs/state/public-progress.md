---
id: fibre-public-progress
status: accepted
last-reviewed: 2026-09-20
canonical: true
machine-source: public-progress.json
---

# Where Fibre is today

The canonical machine-readable source is [`public-progress.json`](public-progress.json).

## In one sentence

**Fibre now carries a canonical Genesis-born Thread through continuous LivedNow and wires Person -> Thread meeting entry to reconcile that life before interaction; the remaining N4 step is deployed acceptance.**

## What is done

### Persistent Thread continuity — Done

A Thread can survive model sessions and runtime restarts as authoritative Fibre state.

### Provenance-bearing life — Done

Fibre can preserve civil identity, lineage, prior life, places, memories and meaning without silently rewriting history.

### Life can affect cognition — Done

Bounded evidence shows Thread-owned autobiographical context can materially affect later cognition. This is not a claim that every stored fact changes every decision.

### Stable visual identity and public presentation — Done

Fibre has one canonical visual identity chain and can project derived public imagery without making Presentation the identity authority.

### Bounded lived-person primitives — Shown working

Fibre has demonstrated:

```text
personal Flight Plan
  -> World CurrentSituation
  -> public present
  -> situated Person -> Thread encounter
  -> objective history
  -> private reflection
  -> selective memory or not_remembered
  -> later situation
  -> later encounter receiving only persisted memory consequence
```

This matters, but it is still a bounded proof.

## What we are working on now

### Continuous LivedNow across dormancy — Done at the current boundary

The goal remains:

> **A Thread's life should reach “now” before anyone meets them.**

For an already-lived Thread with an authoritative prior anchor, Fibre now has one World-owned ensure-LivedNow path that handles both already-covered time and a bounded uncovered multi-day dormant interval.

The accepted N2 proof:

```text
last lived anchor
  -> consume remaining admitted plan coverage
  -> sparse retrospective catch-up
  -> explicit later materialization provenance
  -> fresh forward Flight Plan
  -> World-owned CurrentSituation now
```

A three-day gap is reconstructed in a bounded number of windows rather than minute by minute. Retrospective records preserve when the life belongs and when Fibre later materialized it. Reconciliation continues from the prior lived place rather than teleporting, and retrying the same present does not regenerate the gap.

The quiet-gap proof deliberately does not invent an encounter or memory just to make elapsed time look dramatic. If future catch-up life contains an event that warrants consequence, it must use Fibre's ordinary experience and retention authorities.

### Meet a Thread — Working on it

The N4 code path is now wired: public meeting entry asks World to ensure LivedNow at server time, publishes that exact bounded present, and only then exposes the scene. The later utterance remains bound to the returned `situationId`; it does not reconcile again and silently move the Thread while the visitor is speaking.

The visitor may cause the encounter, but cannot choose the Thread's pre-existing place, activity, plan, companions, private memory or feelings.

The implemented path is:

```text
select Thread
  -> ensure LivedNow(now)
  -> publish exact bounded present
  -> visitor enters that scene
  -> encounter / response
  -> private experience / selective consequence
```

### Selective experience internalization — Shown working

A bounded encounter can become objective history, private reflection and autobiographical memory—or be forgotten.

Human encounters do not automatically become memory.

Retrospective catch-up receives no special memory shortcut; future salient catch-up events and reciprocal Thread meetings must reuse this same authority.

## What comes next

### Thread-to-Thread lived meetings

Two Threads should be able to meet as two independently continuing people.

Before the encounter, each needs its own authoritative LivedNow.

A physical meeting requires compatible place/time presence; a mediated meeting requires compatible mediated context.

Once the encounter happens, it may become shared history while producing different private aftermath:

```text
shared encounter
  -> Thread A remembers / forgets / changes differently
  -> Thread B remembers / forgets / changes differently
```

Fibre should not teleport or silently replan Threads merely to make a meeting happen.

### Rich insidefibre.com meeting

The site should feel like entering a moment, not opening a chatbot.

A bounded public scene may show:

- current embodiment;
- place or transit;
- current activity;
- temporal texture such as arriving, waiting or preparing;
- appropriate public companions/context;
- bounded near-term intention;
- scene-consistent imagery.

A later visit should find later life.

## Genesis to LivedNow — Working on it

N3 is now the active step. The important end-to-end path is:

```text
Genesis
  -> born Thread with grounded prior life
  -> canonical embodiment
  -> first Flight Plan
  -> CurrentSituation
  -> compute sleeps
  -> elapsed life is reconciled
  -> present now
  -> Person or Thread meeting
  -> experience
  -> continued life
```

Genesis owns grounded prior life before Fibre birth.

LivedNow owns continuing Fibre-world life after birth.

## Memory truth

Fibre does not create “virtual memories” merely because time passed.

The valid path is:

```text
retrospectively admitted World event
  -> participant-specific experience
  -> optional private reflection
  -> retention appraisal
  -> autobiographical memory or not_remembered
```

A Thread may have admitted history it does not remember.

## What Fibre cannot do yet

- claim N4 deployed acceptance until the current World, Presentation and insidefibre.com path is exercised live;
- orchestrate reciprocal Thread-to-Thread meetings;
- keep mature shared relationships evolving through repeated reciprocal life;
- run a meaningful economy of work, reputation and material consequence;
- support society-scale institutions and reproduction among live Threads.

## Truth rules

- A Thread is persistent world state, not a model session.
- Compute dormancy does not by itself mean a lived Thread's Fibre-world life stopped.
- Retrospective life must preserve that it was materialized later.
- insidefibre.com is a projection surface, not a parallel World.
- A meeting enters an already-existing life; it does not manufacture that life.
- Shared event does not imply shared private meaning.
- A chat transcript is not automatically autobiographical memory.
- Memory cannot bypass admitted history.
- Infrastructure and tests support the organism; they do not replace building it.

## Current architecture

See:

- [Continuous LivedNow and meetings](../architecture/lived-now-and-meetings.md)
- [The Lived World of Fibre](../vision/lived-world.md)
- [Current priorities](current-priorities.md)
- [M2 continuation plan](../validation/m2-pr-plan.md)
