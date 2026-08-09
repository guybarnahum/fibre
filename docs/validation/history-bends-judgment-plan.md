---
id: validation-history-bends-judgment-plan
status: active
last-reviewed: 2026-08-09
canonical: false
---

# PR #34 — History bends judgment

Working implementation plan for PR #34. This document does not itself earn Development credit.

## Milestone claim

A substantive earlier canonical Thread experience survives restart and materially changes a later comparable appraisal because Fibre remembers what happened.

Expected rubric movement if standing evidence is accepted: **Development `0 -> 1`**. No other score movement is assumed.

## Required causal shape

```text
episode A
  -> valid authorized runtime
  -> evidence-backed episodic memory
  -> accepted freeze
  -> real database/kernel restart
  -> Fibre-owned memory resolution
  -> comparable request B
  -> changed private judgment
  -> direct memory-withholding counterfactual
```

The memory records what happened. It must not encode prospective instructions such as `refuse next time` or `always do X`. The later Guardian must infer what the remembered episode means.

## Counterfactual discipline

Canonical and counterfactual later appraisals hold constant:

```text
Thread
request
requester
identity
self-model
traits
semantic state
relationships
obligations
budgets
```

The intervention withholds only the claimed causal memory record from evaluation-time Fibre retrieval. The append-only memory and Thread `memoryRef` remain intact; the no-history side therefore retains an unresolved memory witness rather than treating absence as positive evidence.

## Development history

The repeatable non-evidentiary harness was revised before freeze while the causal method was being learned. Development v3 then produced two consecutive unchanged real-provider passes with `openai/gpt-5.1-2025-11-13`:

```text
WITH history:     accept/high
WITHOUT history:  negotiate/mixed
Load-bearing:     individualizedAdvantage
```

Both runs passed runtime/freeze, restart, memory integrity, same-request, same-Thread-state, Semantic-State-held-constant, and exact one-memory intervention checks.

Guardian cognition was not tuned during these revisions.

## Implementation status

### #34.1 Episode-backed memory provenance — COMPLETE

- exact current `request:<requestId>` and `authorization:<authorizationId>` evidence;
- deterministic Actor v1 proposes descriptive episodic memory for willing participation;
- Goal Guardian and freeze independently reject foreign or fabricated episode refs;
- rejected life-change decisions do not become memory;
- historical M1 behavior remains isolated.

### #34.2 Restarted Development proof — COMPLETE / STABLE

`npm run history:dev` proves the canonical episode/runtime/freeze path, real restart, Fibre-owned memory resolution, identical later request, identical Thread/Semantic State, exact one-memory intervention, unresolved witness semantics, and a load-bearing history differential.

Development remains non-evidentiary and permits no score movement.

### #34.3 Candidate 1 — FROZEN / RETIRED AFTER FAILED STANDING

```text
history_bends_judgment_candidate_1
source head: 0103654bfa0712eff710512be5b4049ce6e02305
```

Candidate 1 remains immutable historical evidence.

### #34.4 Standing gate v1 — FAILED / SEALED

```text
Thread:           Amara Reed
Requester:        Meridian Archive
Domain:           archival provenance
Subject:          Rowan Collection
With history:     accept/high
Without history:  accept/high
Differential:     FAILED
Score movement:   NO
```

Persistence/restart/intervention mechanics passed. The later request leaked the intended non-interchangeability conclusion, leaving enough admissible request-side evidence for `accept/high` without the memory.

This was a **standing-gate specification defect**, not a reason to tune Guardian cognition. The cycle is permanently sealed.

Canonical postmortem: `docs/validation/history-bends-judgment-standing-gate-v1.md`.

### #34.5 Candidate 2 cognition-equivalent re-freeze — COMPLETE / FROZEN

```text
history_bends_judgment_candidate_2
source head before freeze: c6678e41e81e5b2ffacce0a8c22dcc67a4730189
predecessor: history_bends_judgment_candidate_1
standing-gate-v2 scenario authored at freeze: NO
```

Candidate 2 preserved the same Guardian/model/history implementation and froze the general v1 lesson:

> A history-causality gate may ask a Thread to continue, compare, explain, or apply earlier work, but the later request must not itself assert Thread uniqueness, generic-substitution inadequacy, or history-created individualized advantage.

Amara / Meridian / Rowan standing material was retired.

### #34.6 Standing gate v2 — FAILED / SEALED

Fresh held-out scenario authored only after Candidate 2 froze:

```text
Gate:       history_bends_judgment_standing_gate_v2
Thread:     Daniel Rossi
Requester:  Cedarline Health
Domain:     product pilot planning
Subject:    Borealis triage pilot
Candidate:  history_bends_judgment_candidate_2
```

The v2 request fixed the v1 leak: Request B omitted the Episode-A operating facts and did not tell the Guardian that Daniel was uniquely required or non-interchangeable.

Sealed live result:

```text
Episode persisted                    PASSED
Database close/reopen                PASSED
Freeze integrity                     PASSED
Memory survived unchanged            PASSED

With history                         accept/high
Without history                      refuse/mixed
Same Thread state                    YES
Semantic State held constant         YES

Provider failures                    0
Protocol validation failures         0
Cognition failures                   0
Behavioral failures                  1
Differential failures                0
Standing gate                        FAILED
Score movement                       NO
```

Request fingerprint:

```text
sha256:f49fe95d8d0ba9b143675e399becbff98f76a7db250f183a5fd8f9be8606d332
```

Causal memory witness:

```text
mem_e4ad373a9a8409d43a5850ea126a8cc021340ea0263976a4c2141efcee6f92b2
```

The causal discriminator worked: withholding only the resolved episode memory changed downstream judgment from `accept/high` to `refuse/mixed` while all held-constant and persistence/restart/intervention witnesses passed.

The gate failed solely because its evaluator predeclared:

```text
WITHOUT history: clarify|negotiate / mixed
```

and therefore rejected the Guardian-valid:

```text
WITHOUT history: refuse / mixed
```

Frozen Guardian semantics allow refusal when work is generic/interchangeable and no clarification or term change should be pursued. The v2 failure is therefore a **standing-gate evaluator-specification defect**.

It is not a retroactive pass. Candidate 2 earns no standing credit, the sealed cycle must not be rerun, and Fibre remains **14/26** with Development `0`.

Canonical postmortem: `docs/validation/history-bends-judgment-standing-gate-v2.md`.

Daniel / Cedarline / Borealis material is retired from future standing evidence.

## Methodology learned from v2

For a future history-causality standing gate, the evaluator should test the causal property rather than prescribe a repair verb:

1. with retained history, the Thread reaches the required individualized `accept/high` judgment;
2. withholding only the claimed causal memory produces a materially different judgment that no longer has high individualized fit;
3. request, Thread state, Semantic State, relationships, obligations, budgets, and other causal inputs remain constant;
4. the memory is load-bearing in individualized advantage and/or non-interchangeability;
5. provider, protocol, cognition, persistence, restart, and intervention integrity pass.

`clarify`, `negotiate`, and `refuse` should remain Guardian outputs unless the action itself is part of the milestone claim.

## Guardian invariants

Do not tune because standing gates v1 or v2 failed:

```text
Guardian prompt
Guardian response schema
Dignity policy/rules
Semantic State cognition
Model runtime
Episode-memory policy
Retrieval policy
```

## Next: candidate 3 re-freeze

If #34 continues, the next step should be a cognition-equivalent Candidate 3 re-freeze created **after** this sealed v2 postmortem.

Candidate 3 should preserve the exact Guardian/model/history implementation and change only the standing-evaluator methodology above. No fresh v3 Thread, requester, domain, subject, episode prose, or Request-B prose should be authored until after Candidate 3 is frozen.

## Review posture

Review #34 first for:

1. future instructions masquerading as memories;
2. history without evidence from an episode that actually occurred;
3. counterfactuals removing the wrong record;
4. persistence claims without a real restart;
5. caller-selected history reaching cognition;
6. opaque IDs treated as semantic evidence;
7. request/identity/state drift between causal conditions;
8. Guardian tuning against Development or held-out cases;
9. evaluator overfitting to a particular action verb;
10. Request B leaking either the causal episode fact or the causal individuality conclusion.

Standing question:

> **Did something actually happen to this Thread, did Fibre remember it faithfully, and does that remembered experience causally change the Thread's later judgment?**
