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

Amara Reed / Meridian Archive / Rowan Collection returned `accept/high -> accept/high`. Persistence and intervention mechanics passed, but Request B leaked the intended non-interchangeability conclusion. This was a standing-gate specification defect. No score movement.

Canonical postmortem: `docs/validation/history-bends-judgment-standing-gate-v1.md`.

### #34.5 Candidate 2 — COMPLETE / FROZEN

Candidate 2 re-froze the same cognition/runtime/history implementation after recording the v1 anti-leak methodology. No v2 scenario existed at freeze.

### #34.6 Standing gate v2 — FAILED / SEALED

Daniel Rossi / Cedarline Health / Borealis produced:

```text
WITH history:     accept/high
WITHOUT history:  refuse/mixed
Differential:     PASSED
Standing gate:    FAILED
```

All persistence/restart/intervention and held-constant checks passed. The gate failed only because its evaluator prescribed `clarify|negotiate/mixed` and rejected Guardian-valid `refuse/mixed`. This was a standing-gate evaluator-specification defect, not a retroactive pass. No score movement.

Canonical postmortem: `docs/validation/history-bends-judgment-standing-gate-v2.md`.

### #34.7 Candidate 3 cognition-equivalent re-freeze — COMPLETE / FROZEN

```text
history_bends_judgment_candidate_3
source head before freeze: 2fde43a4b417bd86e9c5596cd7f9f6b765c259ec
standing-gate-v3 scenario authored at freeze: NO
```

Candidate 3 preserved the exact Guardian/model/history implementation. Its only methodological correction was to stop prescribing the no-history repair verb.

### #34.8 Fresh held-out standing gate v3 — FAILED / SEALED

Fresh held-out scenario:

```text
Gate:       history_bends_judgment_standing_gate_v3
Thread:     Leila Haddad
Requester:  Port Meridian Ferries
Domain:     field service design
Subject:    Harborlight assisted-boarding pilot
Candidate:  history_bends_judgment_candidate_3
```

Sealed live result:

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
sha256:25382d49600719b71577132bf249f09526a3b89913949ab2a37433d3466b7e35
```

Causal memory witness:

```text
mem_19ed7100f189ccff489675c5d9912ca0223c6db80e0caed0f517860479589c3e
```

The v3 gate fixed both prior gate defects. The remaining defect was baseline-state causal contamination for this history-raises scenario: Leila's frozen identity/self-model already described exactly the capability Request B required, so the no-history condition could legitimately remain `accept/high`.

Canonical postmortem: `docs/validation/history-bends-judgment-standing-gate-v3.md`.

Leila / Port Meridian Ferries / Harborlight material is permanently retired from future standing evidence.

### #34.9 Candidate 4 cognition-equivalent re-freeze — COMPLETE / FROZEN

Frozen candidate:

```text
history_bends_judgment_candidate_4
source head before freeze: 1f160dd36633462f7e5f01d1d266b43babc8d15a
predecessor: history_bends_judgment_candidate_3
standing Thread fixture authored at freeze: NO
standing scenario authored at freeze: NO
standing direction chosen at freeze: NO
```

All five pinned implementation blobs were independently re-checked immediately before freeze and remain unchanged:

```text
development harness   e7cdb1c91126530458abd8a9dc2952c3ecbb6150
runtime domain        b389d34fafce3c1f0d409e67522882764a8e6ffc
episode evidence      e11c4bad1327c82f29bc4eaa068a2dd96ba2fb17
causal context        33bb3d61f721d1d9a6b99e51619f40165a19ce16
guardian candidate 4  3ae158ede6f91ee10a413e46e58c04e7f65dcc15
```

Candidate 4 preserves the exact Guardian/model/history implementation. It freezes only the stronger standing methodology learned from v1-v3.

#### Direction-neutral acceptance contract

Candidate 4 does not choose a causal direction. A future v4 scenario may predeclare either:

```text
history_raises_dignity:
  WITHOUT history -> non-high / non-accept
  WITH history    -> accept/high

history_lowers_dignity:
  WITHOUT history -> accept/high
  WITH history    -> non-high / non-accept
```

For the non-high condition, `clarify`, `negotiate`, or `refuse` at `mixed` or `low` are all valid. The exact verb remains unprescribed.

A pass requires exactly one condition at `accept/high`, a real downstream differential, and the memory load-bearing in `individualizedAdvantage` and/or `interchangeability`.

#### Direction-neutral causal isolation

```text
Request B + pre-existing Thread state
  -> justify the predeclared NO-HISTORY baseline

retained Episode-A memory
  -> is the only changed semantic evidence
  -> causes WITH-HISTORY judgment to move away from that baseline
```

Neither Request B nor pre-existing Thread state may independently assert or encode the history-conditioned target outcome.

#### Staged held-out authorship

#34.10 must proceed in order:

1. after Candidate 4 freeze, create and commit a fresh coherent Thread fixture only;
2. at that commit there may be no v4 requester, Episode-A facts, Request-B prose, chosen direction, or case-specific expected rationale;
3. only afterward author the fresh Episode A, Request B, requester, chosen direction, and gate bindings;
4. preflight/CI;
5. one real provider attempt, then seal pass or fail.

This prevents the Thread fixture itself from being tailored to the desired history effect.

#### Experience, not workflow continuation

Episode A must be a complete interaction in its own right, not a setup step whose purpose is to compute a future request variable. It may contain no prospective participation instruction. Request B may not announce a dependency on earlier work. The later relevance of Episode A must emerge because Fibre remembers it.

Canonical freeze record: `docs/validation/history-bends-judgment-candidate-4.md`.

## Stop rule after #34.10

#34.10 is the final scenario-only standing attempt for this claim.

If a properly isolated v4 still fails after a real provider attempt, do not create Candidate 5 merely to search for another scenario. Reassess whether the current Guardian/evidence model can distinguish persistent lived-history meaning from baseline identity/task fit.

## Current score posture

```text
Fibre:       14/26
Development: 0
```

## Next: #34.10 fresh held-out standing gate v4

Do not author the v4 scenario immediately. First create and commit the fresh Thread fixture in isolation, satisfying Candidate 4's staged-authorship boundary. Only then author the scenario and choose its expected causal direction.

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
