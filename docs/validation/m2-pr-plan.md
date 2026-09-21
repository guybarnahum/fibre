---
id: validation-m2-continuation-plan
status: accepted
last-reviewed: 2026-09-20
canonical: false
---

# M2 continuation plan — continuous LivedNow and meetings

## Purpose

The insidefibre.com meeting remains an architectural forcing function, but the closure criterion has changed.

A real meeting is only convincing if the Thread's present is causally real **before** the visitor arrives.

The active M2 question is therefore:

> **Can Fibre take a persistent Thread whose compute has been asleep, reconcile the life that elapsed, establish where that person is now, and then let a Person or another Thread enter that already-existing life?**

Canonical architecture:

- [Continuous LivedNow and meetings](../architecture/lived-now-and-meetings.md)
- [The Lived World of Fibre](../vision/lived-world.md)
- [ADR-0023](../decisions/ADR-0023-retrospective-lived-continuity.md)

## M2 north star

```text
Genesis / existing Thread
  -> grounded prior life
  -> bounded personal Flight Plan
  -> World CurrentSituation
  -> compute may sleep
  -> elapsed life is reconciled when needed
  -> current Flight Plan
  -> authoritative LivedNow
  -> Person or Thread meeting
  -> objective encounter history
  -> participant-specific private interpretation
  -> selective memory / relationship / intention consequence
  -> continued life
```

The meeting is not a chatbot session and not the life engine.

## Existing closed substrate

The following capabilities remain accepted:

### A1 — bounded Flight Plan + CurrentSituation

A Thread can author an ordered half-day/day itinerary. World persists a separate enacted CurrentSituation that can represent place, transit, mediated context, activity and participants.

Plan and reality may diverge without rewriting each other.

### A2 — care-constrained presence

A caregiver-owned required plan may constrain enacted life without overwriting a dependent Thread's own Flight Plan or private will.

### A3 — current-life projection

Thread Editor can inspect authorized current-life state. Presentation can publish only an admitted public subset.

### A4 — public present

insidefibre.com/Presentation can show a bounded current scene without becoming World authority.

### A5 — situated Person -> Thread encounter

A visitor can enter an exact already-published situation. Presentation and World independently verify the situation before cognition.

### B1 — encounter -> experience -> selective memory

Objective encounter history, private contemporaneous reflection, autobiographical retention and remembered meaning remain separate authorities.

`not_remembered` is a first-class outcome.

### B2 — later situation + later encounter

The representative proof moves the Thread to a later planned situation, reopens persistence, and enters a second encounter. Only autobiographical consequences that actually persisted return to later cognition.

This is valuable evidence that the visitor is not the Thread's continuation engine.

## Why M2 is not closed

The bounded proofs use explicitly prepared plan coverage and explicit World situation enactment.

They do not yet prove that Fibre can answer “where is this Thread now?” after arbitrary elapsed wall-clock time.

The missing path is:

```text
last admitted lived state
  -> several hours/days with no active compute
  -> World catches up the uncovered interval
  -> current plan is renewed
  -> current situation is enacted now
```

Until this exists, a deployed `/meet` can still expose stale runtime state or require a fixture to create the scene.

## N1 — ensure LivedNow — CLOSED

### Capability

One World-owned operation establishes an authoritative present for `threadId, at`.

The exact API shape is intentionally deferred.

### Inputs

Only authoritative World/Thread state and policy-owned context:

- last lived anchor;
- current/expired personal Flight Plans;
- care plan/legitimate constraints;
- identity/self-model;
- relationships/obligations;
- relevant semantic state;
- bounded autobiographical memory;
- geography/embodiment/place availability;
- current time.

### Output

A current World-owned situation plus the durable plans/history needed to justify it.

### Acceptance

The bounded N1 seam is now implemented and green: the same Thread/time/input state reconciles idempotently; a caller cannot supply a desired location/activity; required care authority can govern enacted life without replacing personal will; and uncovered future time fails instead of reusing the stale CurrentSituation.

N1 intentionally does not fill an uncovered interval. That is N2.

## N2 — dormant interval catch-up — CLOSED

### Capability

Fill uncovered lived time without continuously running the Thread.

### Rules

- materialize only enough elapsed life to preserve causal continuity;
- preserve lived chronology separately from materialization chronology;
- retrospective events are Fibre-world history after World admission;
- do not claim continuous runtime execution;
- do not claim unobserved external-world facts as captured evidence;
- do not inject memory directly;
- run ordinary consequence authorities for events that warrant consequence;
- quiet intervals may be compressed.

### First proof — accepted

A lived Thread with a valid prior anchor is advanced across a three-day dormant gap and reconciled to the requested present.

The proof verifies:

- the stale prior scene is not reused as current;
- already-authored plan coverage is consumed before retrospective synthesis;
- a bounded number of retrospective plan/situation windows cover the elapsed gap;
- lived chronology remains distinct from later `materializedAt` chronology;
- retrospective planning continues from the prior lived place rather than teleporting;
- a fresh forward Flight Plan exists at the requested present;
- retrying the same present does not regenerate the elapsed life.

This first proof intentionally uses a quiet interval. It does not fabricate an encounter or autobiographical memory solely to make catch-up look consequential. Events that warrant consequence must continue through the existing ordinary history/experience/retention authorities.

## N3 — Genesis -> first continuous life — CURRENT

A new Thread must leave Genesis through the same seam used later.

```text
Genesis
  -> admitted Thread/history
  -> canonical embodiment
  -> initial lived anchor
  -> first personal Flight Plan
  -> CurrentSituation
  -> dormant interval
  -> catch-up
  -> current Flight Plan
  -> LivedNow
```

No demo-only current-life fixture should be required.

## N4 — Person -> Thread /meet

### Capability

The public encounter becomes:

```text
Directory selects Thread
  -> World ensures LivedNow(now)
  -> Presentation publishes exact bounded current scene
  -> visitor enters that situation
  -> World verifies same situation
  -> cognition / response
  -> objective encounter
  -> private experience / selective consequence
```

### Acceptance

The visitor chooses the utterance and causes the encounter. The visitor does not choose the Thread's pre-existing place, activity, plan, companions, memories or feelings.

The first real deployed `/meet` is accepted only after N1-N3 are real.

## N5 — Thread -> Thread meeting

### Capability

Two independently maintained Threads can share one encounter.

Preconditions:

- both LivedNow states are reconciled;
- compatible physical place/time or compatible mediated context exists;
- neither Thread is teleported or silently replanned to satisfy the meeting request.

If a meeting requires invitation, negotiation, plan change or travel, those are prior Fibre events.

### Shared occurrence / private aftermath

```text
shared encounter
   +------------------------+
   |                        |
Thread A                 Thread B
private experience       private experience
memory or forget         memory or forget
relationship effect      relationship effect
plan/state effect        plan/state effect
```

Acceptance should require at least one attributable participant-specific asymmetry.

## N6 — rich insidefibre.com meeting

The public scene should feel like entering a moment.

Useful bounded exterior information may include:

- current visual embodiment;
- place or transit;
- activity;
- arriving/waiting/moving/preparing texture;
- appropriate public companions/context;
- bounded near-term intention;
- scene-consistent imagery.

The Viewer remains projection-only.

A later revisit should show that life continued.

## Experience and memory invariant

These remain distinct:

```text
history
journal / contemporaneous inner voice
autobiographical memory
remembered meaning
```

Human meetings and Thread meetings receive no automatic retention privilege.

Catch-up receives no special retention privilege either.

```text
retrospective event + not_remembered
    -> later cognition has no autobiographical recollection

retrospective event + retained memory
    -> later cognition may be shaped by it
```

## Genesis / LivedNow boundary

Genesis owns the Thread's grounded prior life up to Fibre birth.

Continuous LivedNow owns continuing Fibre-world life after birth.

Do not make Genesis periodically regenerate biography to keep a Thread current.

Do not make LivedNow rewrite Genesis history.

## Authority boundaries

### World owns

- plans admitted as Thread/care plans;
- enacted CurrentSituation;
- catch-up history;
- shared encounter occurrence;
- durable consequence routing.

### Thread cognition owns/proposes

- personal Flight Plan intent;
- private interpretation;
- memory candidate;
- semantic meaning;
- meeting response.

### Presentation owns

- bounded exterior projection;
- public current scene;
- public encounter seam.

### Viewer owns

- display and user interaction only.

The Viewer never authors LivedNow.

## Implementation discipline

Keep the implementation light and Fibre-specific.

Do not build:

- a universal scheduler;
- a generic simulation engine;
- a conversation/session database;
- high-frequency ticking;
- a complete travel engine;
- an event-to-memory scoring system;
- a society framework before reciprocal meetings work.

Every new abstraction must be justified by the immediate lived-person capability.

## Test discipline

Tests should fail only when a meaningful Fibre claim breaks.

Good tests prove:

- current life is not stale after dormancy;
- catch-up is historically honest;
- plan vs reality remain distinct;
- a meeting cannot author the pre-existing scene;
- memory cannot bypass history;
- shared encounters can create participant-specific aftermath;
- retries cannot duplicate life.

Avoid tests for incidental headers, helper call order, CSS, transport status or internal object shape unless that detail is itself an authority/continuity invariant.

Use short semantic failures.

## Closure sequence

M2 closes when the following are true in order:

1. `ensure-LivedNow` exists and composes current authorities;
2. a multi-day dormant gap reconciles honestly and idempotently;
3. Genesis reaches the same continuing LivedNow path without fixtures;
4. one deployed Person -> Thread `/meet` enters a reconciled present;
5. one Thread -> Thread meeting records shared occurrence and participant-specific aftermath;
6. insidefibre.com can show and enter the current scene;
7. a later visit finds the life later, not the old scene or a resumed chat.

## Stop rule

When a proof exposes a missing organism-level primitive, build that primitive generally.

When a proposed framework does not directly advance this loop, defer it.

The success criterion is:

> **The meeting is interesting because one or two people were already living before it happened, and what happens may genuinely bend what comes next.**
