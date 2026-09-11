---
id: fibre-current-state
status: accepted
last-reviewed: 2026-09-10
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

[`../validation/m2-pr-plan.md`](../validation/m2-pr-plan.md) is the M2 authority. [`../validation/m2-meeting-runbook.md`](../validation/m2-meeting-runbook.md) is the operator acceptance path.

```text
M1 + identity/history/birth/causal foundations            CLOSED
G/H public path + minimum recovery                        CLOSED
FID + Directory/Meet                                      CLOSED
R1-R4 intrinsic regulation                                CLOSED
M2-A lived present / Flight Plan / situated encounter     CLOSED
M2-B experience internalization + continuation            IMPLEMENTED
M2 acceptance gate                                        PENDING RUN
```

The remaining M2 work is validation, not another architecture slice: run the representative lived-person proof, run repository gates, and exercise one real deployed `/meet` encounter. Do not expand M2 with speculative frameworks before those gates expose a concrete missing capability.

## What M2 now contains

The Thread can enter the present with a life already underway:

```text
developmental context + relationships
  -> intrinsic drives make conditions matter
  -> Thread-authored half-day/day Flight Plan
  -> optional caregiver-owned care plan
  -> World-enacted CurrentSituation
  -> authorized private inspection + lossy public present
  -> visitor enters that exact situation
  -> objective encounter history
  -> private contemporaneous Thread Journal
  -> selective autobiographical retention or none
  -> life continues independently
  -> later meeting receives only consequences that persisted
```

A Flight Plan is intended life, not World truth. World observation may diverge without rewriting the plan. Care may constrain enacted life without overwriting the dependent Thread's own will.

A visitor does not create the Thread's present. The browser supplies only an utterance and the displayed `situationId` as a stale-scene precondition. Presentation checks the published present; World independently checks authoritative CurrentSituation before cognition.

## Intrinsic regulation remains below semantic life

```text
desired/avoided condition
  + actual/predicted World state
  -> drive pressure / progress / surprise / attainment
  -> intrinsic affect
  -> cognition may interpret
  -> semantic emotion / need / meaning
```

The distinctions remain load-bearing:

```text
regulatory drive  != semantic need
intrinsic affect  != semantic emotion
presence pressure != relationship meaning
care requirement  != dependent person's private desire
```

Similar regulatory conditions may be interpreted differently by different lives.

## Experience and memory

M2 adds a private Thread Journal as the contemporaneous subjective layer between objective history and later autobiographical memory:

```text
History             what Fibre has evidence happened
Journal             what it was like for me then
Memory              what I still retain autobiographically
Remembered meaning  what the retained experience durably came to mean
```

The journal is private inner voice, not a transcript and not proof of later recall. Human encounters receive no special retention privilege. `not_remembered` is a valid outcome.

Ordinary encounter cognition receives bounded retained autobiographical memory. It does not receive old objective encounter history or old journal records as hidden perfect recall. Therefore Fibre can preserve evidence that something happened without forcing the Thread to remember it.

## B2 continuation proof

The representative B2 proof deliberately adds no continuation framework. It composes the existing organism:

```text
persisted personal Flight Plan with later life
  -> World enacts first stop
  -> first encounter enters through normal World encounter API
  -> history + private reflection + selective memory
  -> visitor is gone
  -> World enacts a later stop from the Thread's own plan
  -> stores reopen across persistence boundary
  -> second encounter enters the later World situation
  -> retained branch can carry memory
  -> forgotten branch cannot reconstruct recollection from hidden records
```

This is the milestone's central claim: **the visitor enters an existing life; the life continues after the visitor leaves.**

## Public meeting path

The public path is:

```text
insidefibre.com /meet
  -> Thread Presentation public present
  -> POST /api/threads/:threadId/encounter
  -> Presentation verifies same published situation
  -> World verifies same authoritative CurrentSituation
  -> temporary Thread cognition
  -> public response text
  -> private experience internalization behind the boundary
```

The exact operator procedure, direct API commands and M2 acceptance commands are in [`../validation/m2-meeting-runbook.md`](../validation/m2-meeting-runbook.md).

## Immediate next action

Do not add M2 primitives now. Run the acceptance proof and the deployed meeting.

If those gates pass, record **M2 — lived person CLOSED** and move from architecture construction to exercising/debugging the real lived system and choosing the next organism-level milestone from what the experience exposes.

If a gate fails, repair the smallest violated Fibre invariant rather than introducing a generic framework.

## Development discipline

Build the smallest organism-level capability with a concrete beneficiary and stop condition.

No generic emotion simulator, no giant drive ontology, no high-frequency world ticking, no conversation store, no role-to-attachment shortcut, no drive-to-emotion mapping, and no second current-life authority. Reuse existing World, Semantic State, cognition, memory and Presentation boundaries.

> **Someone was here yesterday. Something happened. It mattered — or it didn't. And today, their life continues.**