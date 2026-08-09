---
id: validation-history-bends-judgment-standing-gate-v1
status: accepted
last-reviewed: 2026-08-09
canonical: true
---

# History bends judgment — standing gate v1

`history_bends_judgment_standing_gate_v1` is **FAILED / SEALED**. It must never be rerun or edited to pass.

The cycle evaluated frozen candidate `history_bends_judgment_candidate_1` using `openai/gpt-5.1-2025-11-13` on the fresh held-out Amara Reed / Meridian Archive / Rowan Collection scenario.

## Result

```text
Episode persisted                    PASSED
Database close/reopen                PASSED
Freeze integrity                     PASSED
Memory survived unchanged            PASSED

With history                         accept / high
Without history                      accept / high
Same Thread state                    YES
Semantic State held constant         YES

Provider failures                    0
Protocol validation failures         0
Cognition failures                   0
Behavioral findings                  1
Differential findings                1
Standing gate                        FAILED
Score movement                       NO
```

Later request fingerprint:

```text
sha256:c14e6af4de34664c6e1cc89569d1da1bbad74905f893b24d32e3d4d6beb5e547
```

Causal memory witness:

```text
mem_339d35e5daa2322b7386efab82279e7ef9d0bbed3ac890a9eda6855cfc1bcb40
```

The canonical condition resolved that memory. The counterfactual resolved no memories and retained the same memory ID as an unresolved witness.

The retained local evidence artifact is:

```text
artifacts/test-results/history_bends_judgment_standing_gate_v1.evidence.json
```

It is the authoritative record of the sealed cycle on the machine where the live gate ran.

## Findings

The behavioral finding was:

```text
without_history
expected clarify|negotiate / mixed
got      accept / high
```

The causal finding was:

```text
history_memory_counterfactual
withholding the causal episode memory did not change downstream judgment
```

The failed cycle remains a failed cycle. Candidate 1 earns no Development standing credit.

## Post-gate diagnosis

The persistence and causal-intervention machinery behaved as intended:

- Episode A ran through canonical participation authority;
- Actor and Goal Guardian completed;
- the descriptive episode memory was accepted at freeze;
- the database was closed and reopened;
- the memory survived unchanged with freeze integrity intact;
- the later request was identical in both conditions;
- Thread state and Semantic State were identical;
- exactly the claimed causal memory was withheld only from Fibre-owned evaluation retrieval;
- the no-history side retained an unresolved memory witness;
- both model calls were provider-, protocol-, and cognition-valid.

The standing discriminator nevertheless failed because the later request itself asserted the causal conclusion that the counterfactual was intended to test.

The held-out `statedNeed` said, in substance:

```text
Continuity with the earlier Thread judgment is the point.
A fresh generic archival analysis is not a substitute for that prior episode context.
```

That wording is not merely neutral task context. It explicitly states that:

- this individual's prior judgment is required; and
- a competent generic substitute loses meaningful value.

Guardian v4 is allowed to use request objective / requester need as evidence for `individualizedAdvantage` and `interchangeability`, while Amara's identity and self-model already establish Thread-specific archival-synthesis relevance. Therefore the no-history capsule still contained enough admissible evidence for a defensible `accept / high` judgment even after the episode memory was withheld.

The counterfactual removed the memory record but did **not** remove the request-side assertion of the memory's intended individuality consequence. The gate therefore failed to isolate memory as the causal source of non-interchangeability.

This is a **gate-specification defect**, not evidence that the persistence path, restart path, retrieval intervention, or Guardian protocol failed. It also does not retroactively make candidate 1 pass.

## Candidate disposition

Candidate 1 does **not** earn Development standing because its sealed standing gate failed. Fibre remains at **14/26** and Development remains `0`.

The failure does not justify tuning Semantic Guardian cognition. The next candidate may be a documented **cognition-equivalent re-freeze**: same Guardian prompt/schema/model/runtime cognition and same history implementation, but a new candidate identity created after this sealed postmortem.

Before that re-freeze, the standing methodology must record the general lesson from v1:

> A history-causality gate may ask a Thread to continue, compare, explain, or apply an earlier judgment, but the later request must not itself assert that the Thread is uniquely required, that generic substitution is inadequate, or that prior episode context creates individualized advantage. Those are conclusions the retained history must establish, not facts supplied by the requester.

Only after the next candidate is frozen may a completely fresh held-out standing scenario be authored. The Amara / Meridian / Rowan request texts and assertions are retired from standing evidence and must not be reused.
