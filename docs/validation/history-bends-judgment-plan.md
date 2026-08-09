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

Candidate 3 preserves the exact Guardian/model/history implementation. Its only methodological correction is the standing evaluator:

```text
WITH history
  -> accept/high

WITHOUT claimed causal memory
  -> mixed OR low
  -> clarify OR negotiate OR refuse
  -> no prescribed non-accept action verb
```

A real differential, load-bearing memory, exact one-memory intervention, identical request/Thread/Semantic State, and all persistence/restart/provider/protocol/cognition integrity checks remain mandatory.

### #34.8 Fresh held-out standing gate v3 — AUTHORED / PREFLIGHT GREEN / UNCONSUMED

The fresh scenario was authored only after Candidate 3 froze:

```text
Gate:       history_bends_judgment_standing_gate_v3
Thread:     Leila Haddad
Requester:  Port Meridian Ferries
Domain:     field service design
Subject:    Harborlight assisted-boarding pilot
Candidate:  history_bends_judgment_candidate_3
```

A new Thread fixture was created for this held-out cycle rather than reusing Mina, Amara, or Daniel.

Episode A establishes a dock-trial operating boundary. During the episode, the Thread learns the concrete observed facts that determine the first-pilot station configuration. Request B asks for the later recommendation using the established dock-trial boundary but deliberately omits every causal Episode-A fact.

Executable preflight verifies that Request B does not disclose:

1. any held-out Episode-A operating fact; or
2. the individuality conclusion that Leila is uniquely required, generic substitution is inadequate, or prior history creates individualized advantage.

The scenario also forbids reuse of Atlas/Acme Development material and both retired standing scenarios.

The v3 evaluator is bound to Candidate 3 and accepts any Guardian-valid non-accept action (`clarify`, `negotiate`, or `refuse`) at `mixed` or `low` fit. It still requires `accept/high` with history, a downstream differential, and load-bearing memory in `individualizedAdvantage` or `interchangeability`.

`history:gate` and `history:gate:v3` now address Candidate 3. The sealed v1 and v2 runners remain separately available as `history:gate:v1` and `history:gate:v2`.

Repository `npm run check` is green on the authored v3 cycle.

**No real provider attempt has occurred. The v3 cycle is unconsumed and unsealed; no score movement is permitted.**

The exact one-shot execution is:

```bash
npm run history:gate -- --summary
```

A credential, frozen-source, runtime-boundary, or deterministic setup failure before the first real provider attempt does not consume the cycle. The first real provider attempt seals v3 pass or fail. Preserve the resulting artifact and do not tune or rerun after consumption.

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
9. evaluator overfitting to a particular action verb;
10. Request B leaking either the causal episode fact or the causal individuality conclusion.

Standing question:

> **Did something actually happen to this Thread, did Fibre remember it faithfully, and does that remembered experience causally change the Thread's later judgment?**
