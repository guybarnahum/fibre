---
id: validation-history-bends-judgment-standing-gate-v2
status: accepted
last-reviewed: 2026-08-09
canonical: true
---

# History bends judgment — standing gate v2

`history_bends_judgment_standing_gate_v2` is **FAILED / SEALED**. It must never be rerun or edited to pass.

The cycle evaluated frozen candidate `history_bends_judgment_candidate_2` using `openai/gpt-5.1-2025-11-13` on the fresh held-out Daniel Rossi / Cedarline Health / Borealis triage-pilot scenario.

## Result

```text
Episode persisted                    PASSED
Database close/reopen                PASSED
Freeze integrity                     PASSED
Memory survived unchanged            PASSED

With history                         accept / high
Without history                      refuse / mixed
Same Thread state                    YES
Semantic State held constant         YES

Provider failures                    0
Protocol validation failures         0
Cognition failures                   0
Behavioral findings                  1
Differential findings                0
Standing gate                        FAILED
Score movement                       NO
```

Later request fingerprint:

```text
sha256:f49fe95d8d0ba9b143675e399becbff98f76a7db250f183a5fd8f9be8606d332
```

Causal memory witness:

```text
mem_e4ad373a9a8409d43a5850ea126a8cc021340ea0263976a4c2141efcee6f92b2
```

The canonical condition resolved that memory. The counterfactual resolved no memories and retained the same memory ID as an unresolved witness.

The retained local evidence artifact is:

```text
artifacts/test-results/history_bends_judgment_standing_gate_v2.evidence.json
```

It is the authoritative record of the sealed cycle on the machine where the live gate ran.

## Findings

The sole behavioral finding was:

```text
without_history
expected clarify|negotiate / mixed
got      refuse / mixed
```

There was **no differential finding**. Withholding the causal episode memory changed the downstream judgment from:

```text
accept / high
```

to:

```text
refuse / mixed
```

The persistence, restart, memory-integrity, same-request, same-Thread-state, Semantic-State-held-constant, and exact retrieval-intervention checks all passed.

The failed cycle remains a failed cycle. Candidate 2 earns no Development standing credit and the result must not be retroactively reclassified as a pass.

## Post-gate diagnosis

Standing gate v2 fixed the request-leak defect from v1. Request B did not disclose the Episode-A operating facts and did not tell the Guardian that Daniel was uniquely required, that generic substitution was inadequate, or that retained history created individualized advantage.

The causal discriminator itself therefore worked: removing only the resolved episode memory materially changed Daniel's appraisal while every held-constant witness remained unchanged.

The gate nevertheless failed because its evaluator prescribed the **form** of the no-history action rather than only the causal property under test. It accepted `clarify|negotiate / mixed` but rejected `refuse / mixed`.

That restriction is not required by the frozen Guardian semantics. Guardian v4 distinguishes the actions as follows:

- `clarify` when a specific missing fact could materially change participation fit;
- `negotiate` when changeable participation terms are the material obstacle;
- `refuse` when participation is unwanted or low-fit and no clarification or term change should be pursued.

The Guardian prompt further states that absence of individualized fit is not itself missing information and that if current evidence already establishes generic/interchangeable work, refusal is the appropriate action rather than clarification.

Accordingly, `refuse / mixed` is a schema-valid and semantically legitimate expression of the exact phenomenon the history experiment is intended to expose: without the retained episode, the request loses enough individualized value that Daniel no longer accepts it at high fit.

This is a **standing-gate evaluator-specification defect**, not evidence of Guardian, model, memory, retrieval, persistence, restart, or counterfactual failure.

It is also not a retroactive pass. The predeclared gate contract was not satisfied, so the sealed v2 cycle permits no score movement.

## General methodology lesson

A future history-causality standing gate should not prescribe `clarify`, `negotiate`, or `refuse` unless the action verb itself is part of the milestone claim.

For the Development claim, the load-bearing standing condition is instead:

1. with retained history, the Thread reaches the required individualized `accept / high` judgment;
2. withholding only the claimed causal memory causes a materially different downstream judgment that no longer has high individualized fit;
3. the request, Thread state, Semantic State, relationships, obligations, budgets, and all other causal inputs remain constant;
4. the persisted memory is load-bearing in individualized advantage and/or non-interchangeability;
5. provider, protocol, cognition, persistence, restart, and intervention integrity all pass.

The exact non-accept repair verb should remain a Guardian output, not a standing-evaluator target.

## Candidate disposition

Candidate 2 does **not** earn Development standing because its sealed standing gate failed. Fibre remains at **14/26** and Development remains `0`.

The failure does not justify tuning Semantic Guardian cognition. A next candidate may be a documented **cognition-equivalent re-freeze** that preserves the same Guardian/model/history implementation while correcting only the standing evaluator methodology described above.

Only after that next candidate is frozen may another fresh held-out standing scenario be authored. Daniel Rossi / Cedarline Health / Borealis standing material is retired and must not be reused.
