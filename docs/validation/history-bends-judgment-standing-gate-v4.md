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

The exact authoritative bundle is committed at:

`artifacts/test-results/history_bends_judgment_standing_gate_v4.evidence.json`

The bundle—not this prose transcription—is the machine-readable authority for the model outputs, factor evidence refs, provider request/digest data, retry history, normalizations, frozen boundary, persisted memory, restart witness, and counterfactual result.

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

Request B did require a concrete family detail only if one was actually known. That makes information possession relevant by design; it is not hidden leakage, but it narrows the claim to durable episode-record causality rather than broad disposition change.

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

The bundle also records one retrying `MODEL_TIMEOUT` operational attempt on the no-history call before its successful second provider attempt. That transient retry did not become a Thread judgment and is not counted in the final provider-failure bucket.

No decision normalization was applied in either condition.

## What actually changed the judgment

The committed model rationales make the causal shape inspectable.

With history, Guardian v4 judged that Nadia's prior work with the same requester on a personally meaningful family artifact gave her grounded non-generic context; the causal memory is explicitly cited by both `individualizedAdvantage` and `interchangeability`.

Without history, Guardian v4 judged the graduation-card request to be generic relative to Nadia's available materials-conservation identity and found no grounded individualized advantage. No memory evidence item was present in that condition.

The request fingerprint, Thread state, and Semantic State were held constant. Fibre resolved exactly the claimed durable episode memory in the canonical condition and withheld that memory in the counterfactual while preserving its unresolved `memoryRef` witness outside cognition.

## Scope of the earned claim

The accepted conclusion is:

> **A Fibre-owned durable record formed through this Thread's earlier canonical episode survived restart and causally changed its later appraisal.**

That earns **Development `0 -> 1`** under rubric v2.

Four limitations are important and explicit:

1. **Episode-A appraisal was scripted setup.** The earlier episode entered through canonical participation/runtime/freeze authority, but its high-fit acceptance judgment was supplied by a deterministic scripted Guardian adapter so #34 isolated history causality instead of re-testing #33.
2. **The memory is request-derived descriptive history.** Deterministic Actor v1 records a summary built from the requester objective and accepted criteria. It is evidence-backed and descriptive, but it contains no Nadia-authored observation, conclusion, feeling, reflection, or self-model update.
3. **The later standing appraisal uses the evidence harness directly.** The test builds the later capsule and invokes Guardian v4 directly rather than routing the later comparison through the default canonical service socket.
4. **This is not yet broad live developmental behavior.** The default runtime has not generalized the standing harness into rich experience-driven self-development across arbitrary Thread life events.

Therefore this gate does **not** yet establish experience-derived self-authorship, adverse/low-dignity learning, persistent self-model change, or repeated behavioral learning across episodes. Those remain explicit extension targets.

## Score consequence

PR #34 earns the predeclared Development movement:

```text
Development  0 -> 1
Fibre total  14/26 -> 15/26
```

No other dimension moves from this gate.

## Sealed command and archive posture

The provider-executable v4 proof/runner used for the authoritative cycle is retired from the active tree after sealing. Exact source remains in Git history; the committed evidence bundle and this canonical record remain in the working tree.

`npm run history:gate` is now a read-only inspector over the committed v4 bundle. It contains no model/provider runtime dependency and cannot execute or rerun a standing cycle.

`npm run history:dev` remains the repeatable, non-evidentiary provider-backed development path.

## Provider-progress chronology

The original authoritative provider result was produced before the shared provider-wait heartbeat was introduced. The heartbeat was added afterward as CLI instrumentation, before the canonical pass record was finalized. It did not participate in the authoritative provider calls and did not alter model inputs, outputs, retries, evaluation, persistence, retrieval, or causal intervention.
