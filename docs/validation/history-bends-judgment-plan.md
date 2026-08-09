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

The v3 gate fixed both prior gate defects: Request B did not leak Episode-A facts or assert the individuality conclusion, and the evaluator accepted any Guardian-valid non-accept action at mixed/low fit.

The remaining defect was **baseline-state causal contamination**. Leila's frozen identity and self-model already described exactly the capability Request B required: turning field observations and operating constraints into concrete product/service decisions. Without the memory, the Guardian could still legitimately conclude `accept/high` from held-constant Thread evidence.

Canonical postmortem: `docs/validation/history-bends-judgment-standing-gate-v3.md`.

Leila / Port Meridian Ferries / Harborlight material is permanently retired from future standing evidence.

## Methodology learned from v1-v3

The standing proof must isolate lived history from **both sides**:

```text
Request B must not independently establish high individualized fit
AND
baseline Thread state must not independently establish high individualized fit
AND
retained lived history must supply the otherwise unavailable individualized value
```

The proof should also avoid ordinary workflow continuation. Episode A must be a complete interaction in its own right, not a setup step whose purpose is to compute a variable for Request B. Request B must not announce that it depends on earlier work. The significance of Episode A must emerge because the Thread remembers it.

A particularly Fibre-specific proof shape is an otherwise generic request whose dignity changes because shared lived history makes this Thread's participation meaningfully non-interchangeable.

The methodology is **direction-neutral**:

- history may raise dignity through recognition, trust, meaning, earned context, continuity, or care;
- history may lower dignity through betrayal, resentment, exhaustion, misuse, learned mismatch, or other lived significance.

A future held-out scenario must predeclare its expected direction before execution. The evaluator must test the causal movement, not privilege history-increases-dignity.

No Guardian prompt/schema/policy, Semantic State cognition, model runtime, episode-memory policy, retrieval policy, persistence, restart, or counterfactual machinery should be tuned because v3 failed.

## #34.9 Candidate 4 cognition-equivalent re-freeze — PLANNED

Before any v4 scenario exists:

1. independently re-check the five pinned implementation blobs;
2. freeze a Candidate 4 that is cognition-equivalent to Candidate 3;
3. preserve all three failed/sealed standing cycles exactly;
4. freeze the two-sided causal-isolation, non-workflow-continuation, baseline-neutrality, generic-capability, and direction-neutral methodology;
5. require future v4 scenario direction to be predeclared after Candidate 4 freeze but before provider execution;
6. stop before authoring any v4 Thread, requester, domain, Episode-A facts, Request-B prose, or case-specific expected rationale.

## Current score posture

```text
Fibre:       14/26
Development: 0
```

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
10. Request B leaking the causal episode fact or individuality conclusion;
11. baseline Thread state independently supplying the intended high/low individualized-fit conclusion;
12. Episode A and Request B forming an ordinary workflow dependency rather than lived experience whose later meaning emerges from memory.

Standing question:

> **Did something actually happen to this Thread, did Fibre remember it faithfully, and does that remembered experience causally change what the same later request means to this particular individual?**
