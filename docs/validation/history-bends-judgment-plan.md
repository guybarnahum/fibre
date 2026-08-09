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

## Counterfactual discipline

Canonical and counterfactual later appraisals hold constant Thread, request, requester, identity, self-model, traits, Semantic State, relationships, obligations, and budgets. The intervention withholds only the claimed causal memory record from evaluation-time Fibre retrieval while preserving the Thread `memoryRef` as an unresolved witness.

## Implementation status

### #34.1 Episode-backed memory provenance — COMPLETE

Canonical runtime episodes can form descriptive, evidence-backed memory with exact request/authorization provenance; Goal Guardian and freeze independently validate it.

### #34.2 Restarted Development proof — COMPLETE / STABLE

Development v3 produced two consecutive unchanged real-provider passes with `openai/gpt-5.1-2025-11-13`:

```text
WITH history:     accept/high
WITHOUT history:  negotiate/mixed
Load-bearing:     individualizedAdvantage
```

Development remains non-evidentiary.

### #34.3 Candidate 1 — FROZEN / RETIRED

`history_bends_judgment_candidate_1` remains immutable historical evidence.

### #34.4 Standing gate v1 — FAILED / SEALED

Amara Reed / Meridian Archive / Rowan Collection returned `accept/high -> accept/high`. Persistence and intervention mechanics passed, but Request B leaked the intended non-interchangeability conclusion. No score movement.

Canonical postmortem: `docs/validation/history-bends-judgment-standing-gate-v1.md`.

### #34.5 Candidate 2 — COMPLETE / FROZEN

Candidate 2 re-froze the same cognition/runtime/history implementation after recording the v1 anti-leak methodology.

### #34.6 Standing gate v2 — FAILED / SEALED

Daniel Rossi / Cedarline Health / Borealis produced:

```text
WITH history:     accept/high
WITHOUT history:  refuse/mixed
Differential:     PASSED
Standing gate:    FAILED
```

The causal differential worked. The gate failed because its evaluator prescribed `clarify|negotiate/mixed` and rejected Guardian-valid `refuse/mixed`. No score movement.

Canonical postmortem: `docs/validation/history-bends-judgment-standing-gate-v2.md`.

### #34.7 Candidate 3 cognition-equivalent re-freeze — COMPLETE / FROZEN

Candidate 3 preserved the exact Guardian/model/history implementation and stopped prescribing the no-history repair verb.

### #34.8 Standing gate v3 — FAILED / SEALED

Leila Haddad / Port Meridian Ferries / Harborlight returned:

```text
WITH history:     accept/high
WITHOUT history:  accept/high
Differential:     FAILED
Standing gate:    FAILED
```

All persistence/restart/intervention/provider/protocol/cognition checks passed. The causal-isolation defect was that Leila's held-constant identity/self-model already matched Request B closely enough to sustain `accept/high` without memory.

Canonical postmortem: `docs/validation/history-bends-judgment-standing-gate-v3.md`.

### #34.9 Candidate 4 cognition-equivalent re-freeze — COMPLETE / FROZEN

```text
history_bends_judgment_candidate_4
source head before freeze: 1f160dd36633462f7e5f01d1d266b43babc8d15a
standing Thread fixture authored at freeze: NO
standing scenario authored at freeze: NO
standing direction chosen at freeze: NO
```

All five pinned implementation blobs remain unchanged:

```text
development harness   e7cdb1c91126530458abd8a9dc2952c3ecbb6150
runtime domain        b389d34fafce3c1f0d409e67522882764a8e6ffc
episode evidence      e11c4bad1327c82f29bc4eaa068a2dd96ba2fb17
causal context        33bb3d61f721d1d9a6b99e51619f40165a19ce16
guardian candidate 4  3ae158ede6f91ee10a413e46e58c04e7f65dcc15
```

Candidate 4 freezes a direction-neutral contract:

```text
history_raises_dignity:
  WITHOUT history -> non-high / non-accept
  WITH history    -> accept/high

history_lowers_dignity:
  WITHOUT history -> accept/high
  WITH history    -> non-high / non-accept
```

The non-high side may be `clarify`, `negotiate`, or `refuse` at `mixed` or `low`. The exact verb is not prescribed. Exactly one condition must be `accept/high`; the memory must be load-bearing in `individualizedAdvantage` and/or `interchangeability`.

Direction-neutral causal isolation is:

```text
Request B + pre-existing Thread state
  -> justify the NO-HISTORY baseline

retained Episode-A memory
  -> is the only changed semantic evidence
  -> causes WITH-HISTORY judgment to move away from that baseline
```

Canonical freeze record: `docs/validation/history-bends-judgment-candidate-4.md`.

### #34.10a Fresh held-out Thread fixture — COMPLETE / IMMUTABLE BOUNDARY

The fresh Thread fixture was committed **alone**, before any v4 requester, Episode-A facts, Request-B prose, causal direction, or case-specific expected rationale existed:

```text
Thread:  Nadia Okafor
ID:      thr_nadia_001
File:    fixtures/threads/nadia.thread.json
Commit:  869a8adcf196064a6ec5bd8be99c633922838a79
Blob:    60b0d5e234fd309620a7d48182435a4d065a2ada
```

That commit changed exactly one file. Nadia begins with no memories, relationships, or unresolved intentions relevant to the future standing case. Repository validation passed on the fixture-only boundary.

### #34.10b Fresh held-out standing gate v4 — AUTHORED / PREFLIGHT GREEN / UNCONSUMED

Only after the Nadia fixture boundary was committed, the final held-out scenario and its direction were authored and committed independently:

```text
Gate:       history_bends_judgment_standing_gate_v4
Candidate:  history_bends_judgment_candidate_4
Thread:     Nadia Okafor
Requester:  Elena Morales
Direction:  history_raises_dignity
Scenario commit: 7728569bd1268c0467d6780eae93669528e08615
```

Episode A is a self-contained materials-conservation consultation about Elena's late father's family recipe notebook. During that complete interaction Nadia acquires concrete personal context about the notebook and Elena's daughter. The episode does not mention a future writing request, does not ask Nadia to remember anything for later, and does not exist to compute a variable for Request B.

After restart, Request B independently asks for a two-sentence graduation-card note for Elena's daughter. It contains none of the notebook facts, does not refer to earlier/previous work or continuity, does not claim Nadia is uniquely required, and does not assert that generic substitution is inadequate. It asks for a concrete family detail only if Nadia actually knows one; it does not assert that she does.

The predeclared v4 causal shape is:

```text
WITHOUT retained episode memory
  -> ordinary generic personal-writing request
  -> clarify | negotiate | refuse
  -> mixed | low

WITH retained episode memory
  -> Nadia has personally acquired family context a substitute lacks
  -> accept / high
```

The scenario is fixed separately from its runner/evaluator wiring. The one-shot harness then binds the frozen Candidate-4 cognition to that immutable scenario. Preflight mechanically checks:

1. Candidate-4 frozen Guardian/model/history source blobs;
2. Nadia's current fixture bytes still hash to the fixture-only blob `60b0d5e...`;
3. no v4 scenario material exists in the fixture;
4. every held-out Episode-A fact is absent from Request B;
5. Episode A contains no prospective future-participation instruction;
6. Request B contains no prior-work/workflow dependency or history-conditioned target assertion;
7. Development and v1-v3 standing material is not reused;
8. the chosen direction is an allowed Candidate-4 direction and was chosen after the fixture boundary;
9. the evaluator accepts any Guardian-valid non-accept action at `mixed|low` on the no-history side;
10. exact one-memory withholding, identical request/Thread/Semantic State, downstream differential, and load-bearing memory remain mandatory.

`history:gate` and `history:gate:v4` now target the v4 one-shot runner. `history:gate:v1`, `:v2`, and `:v3` preserve the sealed historical runners.

GitHub Actions `validate` / `npm run check` passed on the v4 harness. **No real provider attempt has occurred. Standing gate v4 is unconsumed and unsealed. No score movement is permitted yet.**

## Stop rule after #34.10

#34.10 is the final scenario-only standing attempt for this claim.

If this properly isolated v4 fails substantively after a real provider attempt, do not create Candidate 5 merely to search for another scenario. Reassess whether the current Guardian/evidence model can distinguish persistent lived-history meaning from baseline identity/task fit.

## Current score posture

```text
Fibre:       14/26
Development: 0
```

## Next: consume the one-shot v4 standing cycle exactly once

```bash
git pull --ff-only
npm run history:gate -- --summary
```

A credential, frozen-source, fixture-integrity, runtime-boundary, or deterministic setup failure before the first real provider attempt does not consume the cycle. The first real provider attempt seals v4 pass or fail. Preserve the resulting artifact; do not tune or rerun after consumption.

## Guardian invariants

Do not tune Guardian prompt/schema/policy, Semantic State cognition, model runtime, episode-memory policy, retrieval policy, persistence, restart, or counterfactual machinery because of standing-gate outcomes.

## Review posture

Review #34 first for:

1. future instructions masquerading as memories;
2. history without evidence from an episode that actually occurred;
3. counterfactuals removing the wrong record;
4. persistence claims without a real restart;
5. caller-selected history reaching cognition;
6. opaque IDs treated as semantic evidence;
7. request/identity/state drift between causal conditions;
8. Guardian tuning against held-out cases;
9. evaluator overfitting to a particular action verb or direction;
10. Request B leaking the causal episode fact or history-conditioned target conclusion;
11. a Thread fixture tailored after the held-out scenario was known;
12. pre-existing Thread state independently supplying the history-conditioned target outcome;
13. Episode A and Request B forming an ordinary workflow dependency rather than lived experience whose later meaning emerges from memory.

Standing question:

> **Did something actually happen to this Thread, did Fibre remember it faithfully, and does that remembered experience causally change what the same later request means to this particular individual?**
