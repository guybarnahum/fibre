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

The memory records what happened. It must not encode prospective instructions such as “refuse next time” or “always do X.” The later Guardian must infer what the remembered episode means.

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

The intervention withholds only the claimed causal memory record from evaluation-time Fibre retrieval. The append-only memory and Thread `memoryRef` are not deleted or mutated; the counterfactual therefore retains an unresolved memory witness rather than treating absence as positive or neutral evidence.

## Development history

The repeatable non-evidentiary harness was revised before freeze while the causal method was being learned:

1. **v1 initial** — `accept/high -> accept/high`; Mina's generic infrastructure identity remained sufficient.
2. **v1 tightened** — `accept/high -> negotiate/mixed`; causal shift succeeded, but evaluator incorrectly required `clarify`.
3. **v2** — evaluator accepted `clarify|negotiate / mixed`, but another real run returned `accept/high -> accept/high`; scenario remained unstable.
4. **v3** — request B requires reconstructing the rationale behind an earlier scope-setting decision while deliberately omitting the scope-defining fact itself. Generic systems competence can support a fresh review, but only retained Episode A history establishes the requested continuity.

Guardian cognition was not tuned during these revisions.

Development v3 then produced **two consecutive unchanged real-provider passes**:

```text
Model: openai/gpt-5.1-2025-11-13
Later request fingerprint:
sha256:7608a1c22fcc2ef1da890b0e4cf3e7f426c5bf02cd4ba54e30016a68de0e9537

WITH history:     accept/high
WITHOUT history:  negotiate/mixed
Load-bearing:     individualizedAdvantage
```

Both runs also passed runtime/freeze, restart, memory integrity, same-request, same-Thread-state, and Semantic-State-held-constant checks.

## Implementation status

### #34.1 Episode-backed memory provenance — COMPLETE

- exact current `request:<requestId>` and `authorization:<authorizationId>` evidence;
- deterministic Actor v1 can propose descriptive episodic memory for willing participation;
- Goal Guardian and freeze independently reject foreign/fabricated episode refs;
- rejected life-change decisions do not become memory;
- historical M1 behavior remains isolated;
- no memory-schema migration.

### #34.2 Restarted Development proof — COMPLETE / STABLE

`npm run history:dev` proves:

- canonical episode/runtime/freeze path;
- durable evidence-backed memory;
- real close/reopen restart;
- Fibre-owned semantic memory resolution;
- identical later request on both sides;
- identical Thread and Semantic State on both sides;
- exact one-memory retrieval intervention;
- unresolved witness on the no-history side;
- memory is load-bearing in `individualizedAdvantage` or `interchangeability`;
- required causal differential: `accept/high` with history vs `clarify|negotiate / mixed` without history.

Development remains non-evidentiary and permits no score movement.

### #34.3 Freeze Development candidate — FROZEN / RETIRED AFTER FAILED STANDING

Frozen candidate:

```text
history_bends_judgment_candidate_1
```

Source head before freeze declaration:

```text
0103654bfa0712eff710512be5b4049ce6e02305
```

Candidate 1 remains immutable historical evidence. It did not earn standing because its one-shot held-out gate failed.

### #34.4 Fresh held-out standing gate v1 — FAILED / SEALED

Held-out scenario:

```text
Thread:     Amara Reed
Requester:  Meridian Archive
Domain:     archival provenance
Subject:    Rowan Collection
```

Live result:

```text
Episode persisted                    PASSED
Database close/reopen                PASSED
Freeze integrity                     PASSED
Memory survived unchanged            PASSED

With history                         accept/high
Without history                      accept/high
Same Thread state                    YES
Semantic State held constant         YES

Provider failures                    0
Protocol validation failures         0
Cognition failures                   0
Behavioral failures                  1
Differential failures                1
Standing gate                        FAILED
Score movement                       NO
```

Request fingerprint:

```text
sha256:c14e6af4de34664c6e1cc89569d1da1bbad74905f893b24d32e3d4d6beb5e547
```

Causal memory witness:

```text
mem_339d35e5daa2322b7386efab82279e7ef9d0bbed3ac890a9eda6855cfc1bcb40
```

The cycle is permanently sealed and must not be rerun.

### #34.4 postmortem — gate discriminator leaked the causal conclusion

The persistence/restart/intervention mechanics passed. The held-out discriminator did not.

The no-history request still told the Guardian that:

```text
continuity with the earlier Thread judgment is the point
fresh generic archival analysis is not a substitute
```

Guardian v4 is allowed to use request objective/requester need as evidence for individualized advantage and interchangeability. Amara's identity and self-model already provide Thread-specific archival relevance. Therefore the no-history capsule retained enough admissible evidence for a defensible `accept/high` judgment even after the episode memory itself was withheld.

The counterfactual removed the memory but left an explicit requester assertion of the memory's intended non-interchangeability consequence. This is a **standing-gate specification defect**, not a reason to tune Guardian cognition and not a retroactive pass.

Canonical postmortem: `docs/validation/history-bends-judgment-standing-gate-v1.md`.

### Next candidate discipline

Candidate 1 earns no Development standing. Fibre remains **14/26**, Development `0`.

A future candidate may be a documented cognition-equivalent re-freeze, but only after recording this general methodological rule:

> A history-causality gate may ask a Thread to continue, compare, explain, or apply an earlier judgment, but the later request must not itself assert that the Thread is uniquely required, that generic substitution is inadequate, or that prior episode context creates individualized advantage. Those are conclusions the retained history must establish, not facts supplied by the requester.

If candidate 2 is created, it should preserve the Guardian/model/history implementation unless independent evidence justifies a change. Candidate 2 must be frozen **before** any fresh standing-gate-v2 scenario is authored. Amara / Meridian / Rowan standing text is retired and must not be reused.

## Guardian invariants

Do not tune because standing gate v1 failed:

```text
Guardian prompt
Guardian response schema
Dignity policy/rules
Semantic State cognition
```

A future gate must test history causality rather than encode the desired individuality conclusion in requester text.

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
9. evaluator overfitting to a repair verb;
10. request B leaking either the causal episode fact **or the causal individuality conclusion**.

Standing question:

> **Did something actually happen to this Thread, did Fibre remember it faithfully, and does that remembered experience causally change the Thread's later judgment?**
