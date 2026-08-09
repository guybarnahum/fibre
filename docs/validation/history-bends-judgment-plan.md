---
id: validation-history-bends-judgment-plan
status: complete
last-reviewed: 2026-08-09
canonical: false
---

# PR #34 — History bends judgment

Working implementation record for PR #34. This document does not itself earn Development credit.

## Milestone claim

A substantive earlier canonical Thread experience survives restart and materially changes a later comparable appraisal because Fibre remembers what happened.

The Fibre-specific claim is stronger than durable task context: lived history can make the same later request mean something different to this particular Thread. History may raise or lower dignity; the claim is **history bends judgment**, not `history always raises dignity`.

## Required causal shape

```text
episode A
  -> valid authorized runtime
  -> evidence-backed episodic memory
  -> accepted freeze
  -> real database/kernel restart
  -> Fibre-owned memory resolution
  -> later request B
  -> changed private judgment
  -> direct memory-withholding counterfactual
```

The memory records what happened. It must not encode prospective instructions. The later Guardian must infer what the remembered episode means.

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

The retained Episode-A memory was the isolated semantic change. Thread/request/Semantic State were held constant and exactly that memory was withheld on the counterfactual side.

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

No earlier gate is retroactively passed.

Canonical postmortems remain under `docs/validation/history-bends-judgment-standing-gate-v1.md` through `-v4.md`.

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
Development -> Freeze -> fresh Standing -> Seal PASS/FAIL -> Archive
```

Failed cycles remain scientific evidence, while retired provider-executable stacks are removed from the active tree and remain recoverable from Git history.

A sealed result may keep a **read-only inspector**, but it may not remain provider-executable.

For History:

```text
npm run history:gate -- --summary
```

is now forced through `--summary-only`. It reads the existing authoritative local v4 evidence and can never invoke the provider or consume a new standing cycle. If the evidence artifact is absent, it fails closed.

The repeatable live command remains:

```text
npm run history:dev -- --summary
```

`history:dev` now uses `tools/provider-progress.mjs`, producing elapsed-time heartbeat output while real provider calls are outstanding.

## Provider progress

Provider-backed experiment CLIs must not appear silently hung. The standard form is:

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

Do not rerun the sealed standing gate. Use `history:gate` only to inspect the authoritative local evidence and `history:dev` for repeatable non-evidentiary provider-backed development.
