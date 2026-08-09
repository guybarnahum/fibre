---
id: validation-history-bends-judgment-plan
status: complete
last-reviewed: 2026-08-09
canonical: false
---

# PR #34 — History bends judgment

Working implementation record for PR #34. This document does not itself earn Development credit.

## Milestone claim

The claim actually earned by #34 is deliberately bounded:

> **A Fibre-owned durable record formed through a Thread's earlier canonical episode can survive restart and causally change its later appraisal.**

This is stronger than transient task context because the record is Thread-owned persisted world history, Fibre selects/resolves it after restart, and an exact one-memory intervention changes downstream judgment. It is not yet evidence of rich Thread-authored reflection, learned self-model change, or broad experience-driven development.

History remains direction-neutral as a concept: it may raise or lower dignity. The accepted v4 case exercised `history_raises_dignity` only.

## Required causal shape used by v4

```text
episode A
  -> valid authorized runtime
  -> evidence-backed descriptive episodic memory
  -> accepted freeze
  -> real database/kernel restart
  -> Fibre-owned memory resolution
  -> later request B
  -> changed private judgment
  -> direct one-memory withholding counterfactual
```

The memory records descriptive episode context. It must not encode prospective instructions. The later Guardian infers the participation consequence from the resolved memory evidence.

## Result

Standing gate v4 is **PASSED / SEALED**.

```text
Gate:       history_bends_judgment_standing_gate_v4
Candidate:  history_bends_judgment_candidate_4
Thread:     Nadia Okafor
Requester:  Elena Morales
Direction:  history_raises_dignity
Model:      openai/gpt-5.1-2025-11-13

With history:     accept/high
Without history:  refuse/low

Provider failures:            0
Protocol validation failures: 0
Cognition failures:           0
Behavioral failures:          0
Differential failures:        0
```

Request fingerprint:

```text
sha256:7d57002e7740d87607bcd6dba441009a059fa3af4fddc173337e951bd417fba2
```

Canonical causal memory:

```text
mem_b88e7e64a7e3f64bfe0752249eeb1fb750d2e2e5b5d8a209c6b51812c60b7ca0
```

The committed machine-readable authority is:

```text
artifacts/test-results/history_bends_judgment_standing_gate_v4.evidence.json
```

The bundle records the exact model outputs/rationales, factor evidence refs, normalizations, provider request/digest data, one retrying `MODEL_TIMEOUT`, persisted memory, restart integrity witness, frozen boundary, and counterfactual witnesses.

The retained Episode-A memory was the isolated semantic change. Thread/request/Semantic State were held constant and exactly that memory was withheld on the counterfactual side.

## Scope limitations

Development `1` is intentionally limited:

- Episode A's acceptance appraisal was scripted deterministic setup to isolate the later history question.
- Deterministic Actor v1 formed memory by describing the requester objective and accepted criteria; the record is not a Nadia-authored observation, conclusion, feeling, reflection, or self-model update.
- Request B made possessing a concrete family detail relevant by asking for one only if actually known; that narrows the result to durable information/history possession rather than broad disposition change.
- The later standing comparison built the cognition capsule in the evidence harness and invoked Guardian v4 directly rather than using the default canonical service socket.
- The default live runtime has not generalized this standing path into broad self-authored developmental learning.

These limitations keep the score at Development `1`, not `2`.

## Score posture

```text
Development:  0 -> 1
Fibre:       14/26 -> 15/26
```

## Historical cycles

- v1 — FAILED / SEALED: Request B leaked the intended individuality conclusion.
- v2 — FAILED / SEALED: causal differential passed, but evaluator overconstrained the non-accept repair verb.
- v3 — FAILED / SEALED: baseline identity/self-model independently sustained the target without memory.
- v4 — PASSED / SEALED: fresh staged fixture/scenario and exact memory withholding established the causal result.

No earlier gate is retroactively passed. Exact evidence bundles for all four cycles are committed under `artifacts/test-results/`; canonical postmortems remain under `docs/validation/history-bends-judgment-standing-gate-v1.md` through `-v4.md`.

## Held-out authorship boundaries

Candidate 4 was frozen before any v4 Thread fixture, requester, Episode-A facts, Request-B prose, or direction existed.

Fresh Nadia fixture committed alone:

```text
Commit: 869a8adcf196064a6ec5bd8be99c633922838a79
Blob:   60b0d5e234fd309620a7d48182435a4d065a2ada
```

Scenario and direction were authored only afterward:

```text
Scenario commit: 7728569bd1268c0467d6780eae93669528e08615
Direction:       history_raises_dignity
```

Episode A is self-contained conservation work. Request B is an independent graduation-card request and does not state Episode-A facts, prior-work dependency, Thread uniqueness, or generic-substitution inadequacy.

## Experiment lifecycle

PR #34 establishes the canonical lifecycle:

```text
Development cycle -> Freeze -> fresh Standing -> Seal PASS/FAIL
                  -> commit evidence -> Archive provider executable
```

Failed cycles remain scientific evidence. Exact evidence bundles and canonical postmortems remain in the active tree; retired provider-executable source remains in reachable repository history.

After sealing, the History provider-capable standing proof/runner/template stack was removed from the active tree. There is no provider execution path behind the standing command.

Read-only standing inspection:

```text
npm run history:gate -- --summary
```

This reads the committed v4 evidence bundle through `tools/history-bends-judgment-sealed-inspector.mjs` and cannot invoke a provider.

Repeatable non-evidentiary live development:

```text
npm run history:dev -- --summary
```

`history:dev` uses `tools/provider-progress.mjs`, producing elapsed-time heartbeat output while real provider calls are outstanding.

## Current memory-formation limitation

Deterministic Actor v1 currently proposes episodic memory only for accepted participation. This is an **experimental limitation**, not a permanent Fibre constraint. It means the current substrate does not yet generally capture adverse/refused/compelled/failed experiences needed to demonstrate `history_lowers_dignity`.

The extension path is to admit evidence-backed adverse-event memories and Thread-authored observations/reflections while preserving descriptive-not-prescriptive validation, provenance, and Fibre-owned selection.

## Provider progress

Provider-backed repeatable experiment CLIs must not appear silently hung. The standard form is:

```text
<experiment> · <phase> · Calling openai/...
<experiment> · <phase> · Awaiting provider response · 0s elapsed
<experiment> · <phase> · Awaiting provider response · 10s elapsed
...
<experiment> · <phase> · Provider call completed · 27s elapsed
```

This is instrumentation only. It does not alter model inputs, outputs, retry semantics, evaluator behavior, persistence, retrieval, or causal interventions.

## Next

Proceed to **#35 Structured Obligation v1**.

Do not rerun any sealed standing gate. Use the committed evidence/inspectors for standing audit and Development commands for repeatable non-evidentiary experimentation.
