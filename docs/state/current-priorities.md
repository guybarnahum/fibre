---
id: fibre-current-priorities
status: accepted
last-reviewed: 2026-09-10
canonical: true
---

# Current priorities

Fibre has completed the intrinsic-regulation detour and the A1-A5 lived-encounter path. [`../validation/m2-pr-plan.md`](../validation/m2-pr-plan.md) remains the M2 continuation authority.

## Active sequence

```text
R1 Layered regulator kernel + sensorium                  CLOSED
R2 Social presence + affective resonance                 CLOSED
R3 Interoception -> semantic feeling                     CLOSED
R4 Functional drive loop + organism trace                CLOSED

A1 Flight Plan + World-observed Lived Now                CLOSED
A2 Care plan + conflicting wills in movement             CLOSED
A3 Current-life projection + Thread Editor               CLOSED
A4 Public present + insidefibre.com scene                 CLOSED
A5 Situated encounter                                    CLOSED
B1 Encounter -> journal -> selective memory              IMPLEMENTED / GATE PENDING
B2 Life continues + second meeting                       IMPLEMENTED / GATE PENDING
                                                        TRUE-E2E CLOSURE
```

All work remains on `agent/m2-lived-encounter`; do not create per-slice branches.

## Current causal loop

```text
Thread already living in World
  -> visitor enters exact enacted situation
  -> objective encounter history
  -> optional private first-person journal
  -> Thread-specific retention appraisal
  -> autobiographical memory or not_remembered
  -> persisted life continues
  -> later situation / later meeting
  -> only retained autobiographical consequence returns to cognition
```

The journal is private contemporaneous inner voice, not objective history and not memory. Autobiographical retention is a separate cognition pass conditioned by the particular Thread: identity/self-model, textual inherited tendencies, intentions, Semantic State, bounded prior memories, the encounter and its journaled interpretation.

The LLM proposes subjective content. Fibre owns admissible context, validates references and chronology, and persists only through the existing autobiographical-memory authority.

## B2 closure invariant

A later encounter may receive bounded autobiographical memories. It must not receive hidden historical encounters or journal records and reconstruct them as recollection.

Therefore:

```text
history exists + journal exists + not_remembered
    -> later ordinary cognition has no recollection context

history exists + retained autobiographical memory
    -> later ordinary cognition may be shaped by that memory
```

The representative B2 proof reopens persisted memory state and places the Thread in a later lived situation before the second encounter. This composes with the existing persisted Flight Plan / CurrentSituation machinery; do not build a second continuation or conversation engine.

## Semantic boundaries

```text
regulatory drive        != semantic need
intrinsic affect        != semantic emotion
mechanical signal       != autobiographical meaning
objective history       != private journal
private journal         != autobiographical memory
historical availability != autobiographical recall
care requirement        != dependent person's private desire
```

## Stop rules

- No conversation/session store.
- No whole-history prompt pretending to be memory.
- No global event-to-memory salience formula.
- No second location/current-life authority.
- No Viewer-owned current state or private journal/memory leakage.
- No generic memory/vector infrastructure before bounded retrieval proves insufficient.
- Keep tests focused on causal Fibre invariants and one representative lived loop.

## Branch

Continue on:

```text
agent/m2-lived-encounter
```
