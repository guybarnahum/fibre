---
id: fibre-current-state
status: accepted
last-reviewed: 2026-09-20
canonical: true
---

# Current state of Fibre

Fibre is a persistent world for artificial persons called **Threads**. A Thread is durable world state with identity, history, private interior state, relationships, embodiment, permissions and a life trajectory spanning temporary model executions.

Models provide temporary cognition. Fibre owns continuity, authoritative state, validation, persistence, replay and consequence.

## Accepted foundation

- A Thread is a persistent life, not a model session.
- History, private contemporaneous journal, autobiographical memory and remembered meaning are distinct.
- Historical state is append-only or explicitly superseding.
- Meaning-bearing identity, memory, relationship, need, emotion and self-understanding are natural-language-first.
- Mechanical/private regulatory state may be numeric when it is control state rather than semantic meaning.
- Model output is candidate cognition; providers do not own Thread life state.
- Identity is authoritative. Presentation is projection. Publication is permission.
- Civil identity/FIN and Fibre Identity Card issuance have explicit authority boundaries.
- Visual identity uses one canonical root/reference chain across age and scene.

## Current milestone posture

The current north star is **continuous LivedNow + meetings**.

Existing M2 work has already proven the bounded primitives needed for that goal:

```text
M1 + identity/history/birth/causal foundations            CLOSED
G/H public path + minimum recovery                        CLOSED
FID + Directory/Meet selection seam                       CLOSED
R1-R4 intrinsic regulation                                CLOSED

bounded Flight Plan / CurrentSituation                    PROVEN
bounded Person -> Thread situated encounter               PROVEN
encounter -> reflection -> selective memory               PROVEN
later situation + later encounter continuity              PROVEN
World-owned ensure-LivedNow over covered plan time         PROVEN
continuous LivedNow across wall-clock dormancy            NOT YET
deployed /meet over continuous LivedNow                   NOT YET
Thread -> Thread reciprocal meeting                       NOT YET
```

The important correction is:

> **Fibre has LivedNow primitives, but not yet continuous LivedNow.**

The bounded proofs establish the semantics. The active engineering work is to make those semantics survive elapsed wall-clock time and become the prerequisite for real meetings.

See:

- [Continuous LivedNow and meetings](../architecture/lived-now-and-meetings.md)
- [Current priorities](current-priorities.md)
- [ADR-0023](../decisions/ADR-0023-retrospective-lived-continuity.md)

## What exists now

Current Fibre can already represent and persist:

```text
developmental context + relationships
  -> intrinsic drives
  -> Thread-authored half-day/day Flight Plan
  -> optional caregiver-owned care plan
  -> World-enacted CurrentSituation
  -> authorized inspection + bounded public present
  -> situated human encounter
  -> objective encounter history
  -> private contemporaneous reflection
  -> selective autobiographical retention or not_remembered
  -> later World situation
  -> later encounter receiving only persisted autobiographical consequence
```

A Flight Plan is intended life, not World truth.

World observation may diverge without rewriting the plan. Care may constrain enacted life without overwriting the dependent Thread's own will.

The existing B2 proof demonstrates that the visitor can leave, World can move the Thread to a later stop, persistence can reopen, and a later encounter sees only what the Thread actually retained.

That is meaningful continuity evidence.

## What does not exist yet

The current implementation does **not** yet provide one production-shaped World capability that can establish a credible present after arbitrary elapsed time.

In particular, Fibre still lacks:

- automatic renewal of expired Flight Plans;
- retrospective coverage of multi-hour/multi-day frozen or dormant intervals;
- explicit provenance for life materialized after its lived time;
- catch-up behind the new World-owned ensure-LivedNow seam when plan coverage is absent;
- a deployed `/meet` path that always reconciles LivedNow before interaction;
- Thread-to-Thread meetings between two independently current lives;
- a rich public scene driven by that continuous present.

Without those, a stale persisted CurrentSituation can still expose runtime scheduling rather than life.

## Continuous LivedNow

Continuous LivedNow answers:

> **Where is this Thread now, what are they doing, and how did their continuing life reach this moment?**

The intended causal path is:

```text
last authoritative lived anchor
  -> determine elapsed uncovered interval
  -> retrospectively realize bounded missing life if necessary
  -> admit World history with honest retrospective provenance
  -> run ordinary participant-specific consequences where warranted
  -> author/refresh current Flight Plan
  -> enact CurrentSituation at the requested time
  -> publish bounded present
```

This is on-demand continuity, not continuous high-frequency simulation.

## Freeze and lived time

A Thread may be computationally frozen while world time passes.

For a lived Thread, compute dormancy is not automatically treated as a literal pause in the person's Fibre-world life.

When Fibre next needs the present, World may retrospectively realize a bounded continuation across the gap. Thaw therefore means restoring lived continuity—not reopening the stale last CurrentSituation as though no time passed.

The system must preserve both:

```text
when the event belongs in lived chronology
    !=
when Fibre actually materialized/admitted it
```

Retrospective history may become authoritative Fibre-world history after admission. It is not evidence of continuous runtime execution or external-world observation.

## Experience and memory

The authority distinctions remain load-bearing:

```text
History             what Fibre has evidence happened in its World
Journal             what it was like for me then
Memory              what I still retain autobiographically
Remembered meaning  what retained experience durably came to mean
```

Retrospective catch-up does not bypass this model.

Do not generate “virtual memories” directly.

The correct path remains:

```text
retrospectively admitted event
  -> private experience / interpretation
  -> retention appraisal
  -> autobiographical memory or not_remembered
```

A Thread may have catch-up history it does not remember.

## Meeting a Person

The public meeting path should become:

```text
insidefibre.com /meet
  -> select eligible Thread
  -> World ensures LivedNow(now)
  -> Thread Presentation publishes exact bounded scene
  -> visitor enters that scene
  -> World verifies same authoritative CurrentSituation
  -> temporary Thread cognition
  -> public response
  -> objective encounter history
  -> private experience / selective consequence
```

The visitor may cause the meeting. The visitor does not create the life that preceded it.

## Meeting another Thread

A Thread-to-Thread meeting requires two independently continuing lives.

Before the encounter:

- each Thread has its own plan;
- each has its own World-owned current situation;
- each has its own reasons for being there;
- their physical or mediated presences are compatible.

The shared encounter then becomes common objective history or linked evidence, while each participant independently interprets and retains it.

```text
shared occurrence
  -> Thread A private aftermath
  -> Thread B private aftermath
```

Shared event does not imply shared meaning.

## Genesis to lived continuity

The important end-to-end target is now:

```text
Genesis
  -> born Thread with grounded prior life
  -> canonical embodiment
  -> first lived continuity anchor
  -> first personal Flight Plan
  -> World CurrentSituation
  -> compute sleeps
  -> elapsed days are reconciled
  -> current Flight Plan
  -> present now
  -> Person or Thread meeting
  -> experience
  -> continued life
```

Genesis remains the authority for prior life before Fibre birth.

Continuous LivedNow owns the continuing world-time life after Fibre birth.

## Immediate next action

Do not build another planner, simulator or conversation framework.

The bounded World-owned ensure-LivedNow seam now exists for times already covered by admitted plans. The immediate next work is N2: when that seam encounters an uncovered multi-hour or multi-day gap, retrospectively realize the smallest credible continuation with explicit lived-time/materialization-time provenance, renew plan coverage, then establish the present.

The next implementation should advance this exact capability:

```text
stale lived Thread
  -> catch up honestly
  -> become current
  -> be meetable
```

Only after that path is real should deployed Person -> Thread `/meet` depend on it.

Only after that should Fibre add Thread-to-Thread meeting orchestration and the richer insidefibre.com meeting experience.

## Development discipline

Build the smallest organism-level capability with a concrete beneficiary and stop condition.

No generic emotion simulator, no giant drive ontology, no high-frequency world ticking, no conversation store, no universal scheduler, and no second current-life authority.

Tests should prove lived continuity, authority, selective consequence and reciprocal individuality—not incidental HTTP or helper mechanics.

> **Someone was here yesterday. Something happened. It mattered — or it didn't. And today, their life continues.**
