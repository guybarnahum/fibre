---
id: fibre-current-state
status: accepted
last-reviewed: 2026-09-21
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
bounded multi-day LivedNow catch-up + plan renewal         PROVEN
Genesis -> same continuing LivedNow path                   PROVEN
wired /meet over continuous LivedNow                       PROVEN
live deployed /meet acceptance                             PROVEN
Thread -> Thread reciprocal meeting implementation        PROVEN
live deployed Thread -> Thread acceptance                  NOT YET
```

The important correction is:

> **Fibre now has bounded continuous-LivedNow reconciliation from canonical Genesis birth through a multi-day dormant gap.**

N4 is closed in deployment. N5 is implemented and green in-repository: two independently reconciled Threads form independent participation stances; compatible mutual acceptance creates one shared objective meeting and separate private aftermath; a decline creates no encounter. The active milestone risk is deployed acceptance against real staging Threads.

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

For a canonical Genesis-born Thread, the World-owned seam can now create the first anchor/plan/current situation, cross an uncovered multi-day interval, preserve retrospective materialization provenance, renew forward Flight Plan coverage and establish a non-stale present.

Fibre still lacks:

- richer catch-up events when elapsed life warrants encounters or other consequences beyond the sparse quiet-gap proof;
- deployed acceptance of Thread-to-Thread meeting between two real independently current Threads;
- a rich public scene driven by that continuous present.

The reciprocal meeting implementation now proves the intended causal shape in-repository: separate LivedNow reconciliation, independent `accept | decline | defer` appraisal, place/context compatibility, one shared objective meeting only after mutual acceptance, and participant-specific journal/memory aftermath. The remaining N5 risk is whether the deployed staging world has two genuinely compatible lives and executes the same path without arranging or teleporting them.

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

A lived Thread always has physical presence in World: either at a physical place or in transit between physical places. A mediated interaction may coexist with that physical presence; it never replaces it.

The accepted N4 path proves that a visitor can enter an already-established scene. The next refinement is Thread-owned meeting participation:

```text
insidefibre.com /meet
  -> select eligible Thread
  -> World ensures LivedNow(now)
  -> Thread appraises whether to meet now
      -> decline / defer (+ optional expression or later suggestion)
      -> accept
          -> Thread Presentation publishes exact bounded scene
          -> visitor enters that scene
          -> World verifies same authoritative CurrentSituation
          -> temporary Thread cognition
          -> public response
          -> objective encounter history
          -> private experience / selective consequence
```

The appraisal should use the current activity/Flight Plan plus bounded Thread-owned relationship, memory, needs, feelings and intentions. A requester cannot force interruption, and relationship context may make a Thread more or less accommodating without mechanically deciding the outcome.

The visitor may cause the request to meet. The Thread decides whether the encounter happens now. The visitor does not create the life that preceded it.

## Meeting another Thread

A Thread-to-Thread meeting requires two independently continuing lives.

Before the encounter:

- each Thread has its own plan;
- each has its own World-owned physical presence;
- each has its own reasons for being there;
- their physical or mediated presences are compatible;
- each independently chooses whether to participate now.

Only after compatible presence and mutual participation does the shared encounter become common objective history. Each participant then records her own private encounter experience and may write a journal entry in her own voice before independently retaining or forgetting the event.

```text
shared occurrence
  -> Thread A private journal -> retained memory or not_remembered
  -> Thread B private journal -> retained memory or not_remembered
```

The journal is contemporaneous private interpretation, not objective history and not autobiographical memory. The same shared meeting can therefore be described with different feelings and meaning by each Thread without contradiction.

The current Admin Observatory can read the private R2 journal book. Journal artifacts live at `journals/<threadId>/journal.md` in the additive private Thread-object bucket; existing immutable presentation assets remain in their established presentation bucket and require no migration.

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

Do not build another planner, scheduler, social framework or journal subsystem.

The N5 organism path is implemented. The immediate next work is deployed acceptance:

```text
Thread A ensure LivedNow(now) ─┐
                               ├-> resolve compatible presence
Thread B ensure LivedNow(now) ─┘
        -> independent meeting stances
        -> mutual acceptance or no meeting
        -> one shared encounter
        -> two private journal accounts
        -> independent memory retention
```

Provision the new private Thread-object R2 bucket, deploy World/Admin, then exercise the path using two real staging Threads whose lives are actually compatible. An incompatible result is truthful and must not be repaired by teleporting or silently replanning either Thread.

N5 closes only after live acceptance confirms the shared event plus asymmetric private aftermath and the journal books are inspectable in Admin.

## Development discipline

Build the smallest organism-level capability with a concrete beneficiary and stop condition.

No generic emotion simulator, no giant drive ontology, no high-frequency world ticking, no conversation store, no universal scheduler, and no second current-life authority.

Tests should prove lived continuity, authority, selective consequence and reciprocal individuality—not incidental HTTP or helper mechanics.

> **Someone was here yesterday. Something happened. It mattered — or it didn't. And today, their life continues.**
