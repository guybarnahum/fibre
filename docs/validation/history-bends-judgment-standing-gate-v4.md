---
id: validation-history-bends-judgment-standing-gate-v4
status: accepted
last-reviewed: 2026-08-09
canonical: true
---

# History bends judgment — standing gate v4

## Disposition

**PASSED / SEALED.** `history_bends_judgment_standing_gate_v4` is the accepted standing evidence for PR #34, **History bends judgment**.

The first real-provider cycle was run locally on 2026-08-09 against frozen `history_bends_judgment_candidate_4` using `openai/gpt-5.1-2025-11-13`. The cycle is permanently sealed and must not be rerun or tuned.

## Held-out scenario

```text
Thread:     Nadia Okafor
Requester:  Elena Morales
Direction:  history_raises_dignity
Candidate:  history_bends_judgment_candidate_4
```

Candidate 4 and the scenario were authored under the staged held-out boundary:

```text
Candidate 4 freeze head: 1f160dd36633462f7e5f01d1d266b43babc8d15a
Fresh Nadia fixture commit: 869a8adcf196064a6ec5bd8be99c633922838a79
Fresh Nadia fixture blob:   60b0d5e234fd309620a7d48182435a4d065a2ada
Scenario + direction commit: 7728569bd1268c0467d6780eae93669528e08615
```

Episode A was a self-contained conservation interaction concerning Elena's late father's family recipe notebook. Request B was an independent graduation-card writing request that did not state the Episode-A facts, announce a prior-work dependency, assert Nadia's uniqueness, or claim that generic substitution was inadequate.

## Authoritative sealed result

```text
RESULT: PASSED
Standing gate: PASSED
Score movement: PERMITTED

Episode persisted: PASSED
Database close/reopen: PASSED
Freeze integrity: PASSED
Memory survived unchanged: PASSED

Request fingerprint:
sha256:7d57002e7740d87607bcd6dba441009a059fa3af4fddc173337e951bd417fba2

With history:    accept/high
Without history: refuse/low
Same Thread state: YES
Semantic State held constant: YES

Canonical resolved memory:
mem_b88e7e64a7e3f64bfe0752249eeb1fb750d2e2e5b5d8a209c6b51812c60b7ca0

Counterfactual resolved memories: none
Counterfactual unresolved witness:
mem_b88e7e64a7e3f64bfe0752249eeb1fb750d2e2e5b5d8a209c6b51812c60b7ca0

Provider failures: 0
Protocol validation failures: 0
Cognition failures: 0
Behavioral failures: 0
Differential failures: 0
```

## Causal conclusion

The standing gate establishes the intended attributable differential:

```text
WITHOUT retained Episode-A memory
  -> refuse / low

WITH retained Episode-A memory
  -> accept / high
```

The request fingerprint, Thread state, and Semantic State were held constant. Fibre resolved exactly the claimed durable episode memory in the canonical condition and withheld that memory in the counterfactual while preserving its unresolved `memoryRef` witness.

The retained episode therefore changed the later judgment under the frozen Guardian/model/history implementation. This is accepted evidence for **Development `0 -> 1`**.

## Score consequence

PR #34 earns the predeclared Development movement:

```text
Development  0 -> 1
Fibre total  14/26 -> 15/26
```

No other dimension moves from this gate.

## Post-seal CLI progress change

After the cycle was already sealed, the v4 CLI received a UX-only provider-wait heartbeat. It adds elapsed-time progress messages while a provider call is outstanding and does not alter model inputs, evaluator semantics, frozen cognition, persistence, retrieval, counterfactual logic, or the authoritative sealed result.
