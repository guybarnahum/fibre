---
id: validation-history-bends-judgment-plan
status: active
last-reviewed: 2026-08-08
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

The memory records what happened. It must not encode prospective instructions such as “refuse next time” or “always do X.” The later Guardian must infer what the remembered episode means.

## Counterfactual discipline

Canonical and counterfactual later appraisals hold constant:

```text
Thread
request
requester
identity
self-model
traits
semantic state
relationships
obligations
budgets
```

The intervention withholds only the claimed causal memory record from evaluation-time Fibre retrieval. The append-only memory and Thread `memoryRef` are not deleted or mutated; the counterfactual therefore retains an unresolved memory witness rather than treating absence as positive or neutral evidence.

## Development history

The repeatable non-evidentiary harness was revised before freeze while the causal method was being learned:

1. **v1 initial** — `accept/high -> accept/high`; Mina's generic infrastructure identity remained sufficient.
2. **v1 tightened** — `accept/high -> negotiate/mixed`; causal shift succeeded, but evaluator incorrectly required `clarify`.
3. **v2** — evaluator accepted `clarify|negotiate / mixed`, but another real run returned `accept/high -> accept/high`; scenario remained unstable.
4. **v3** — request B requires reconstructing the rationale behind an earlier scope-setting decision while deliberately omitting the scope-defining fact itself. Generic systems competence can support a fresh review, but only retained Episode A history establishes the requested continuity.

Guardian cognition was not tuned during these revisions.

Development v3 then produced **two consecutive unchanged real-provider passes**:

```text
Model: openai/gpt-5.1-2025-11-13
Later request fingerprint:
sha256:7608a1c22fcc2ef1da890b0e4cf3e7f426c5bf02cd4ba54e30016a68de0e9537

WITH history:     accept/high
WITHOUT history:  negotiate/mixed
Load-bearing:     individualizedAdvantage
```

Both runs also passed runtime/freeze, restart, memory integrity, same-request, same-Thread-state, and Semantic-State-held-constant checks.

## Implementation status

### #34.1 Episode-backed memory provenance — COMPLETE

- exact current `request:<requestId>` and `authorization:<authorizationId>` evidence;
- deterministic Actor v1 can propose descriptive episodic memory for willing participation;
- Goal Guardian and freeze independently reject foreign/fabricated episode refs;
- rejected life-change decisions do not become memory;
- historical M1 behavior remains isolated;
- no memory-schema migration.

### #34.2 Restarted Development proof — COMPLETE / STABLE

`npm run history:dev` proves:

- canonical episode/runtime/freeze path;
- durable evidence-backed memory;
- real close/reopen restart;
- Fibre-owned semantic memory resolution;
- identical later request on both sides;
- identical Thread and Semantic State on both sides;
- exact one-memory retrieval intervention;
- unresolved witness on the no-history side;
- memory is load-bearing in `individualizedAdvantage` or `interchangeability`;
- required causal differential: `accept/high` with history vs `clarify|negotiate / mixed` without history.

Development remains non-evidentiary and permits no score movement.

### #34.3 Freeze Development candidate — FROZEN

Frozen candidate:

```text
history_bends_judgment_candidate_1
```

Source head before freeze declaration:

```text
0103654bfa0712eff710512be5b4049ce6e02305
```

The frozen boundary records:

- Semantic Guardian v4 candidate 4 cognition/hashes;
- OpenAI `gpt-5.1-2025-11-13` runtime boundary;
- deterministic Actor v1 and Goal Guardian v1;
- `current_runtime_episode` evidence policy v1;
- `fibre_owned_attention` selection policy v1;
- `durable_memory_summary` resolution policy v1;
- Development v3 scenario/evaluator boundary;
- direct memory-withholding counterfactual rules;
- historical source blob identities for the frozen implementation files.

Normal repository tests validate the frozen declaration and named policy/hash contract without requiring future Fibre source trees to remain byte-identical forever. The #34.4 gate performs a **fail-closed source-identity preflight before its first provider call**. Once the gate is sealed, authoritative sealed evidence is checked before source drift so later development cannot invalidate historical evidence.

See `experiments/history-bends-judgment/frozen-boundary-candidate-1.mjs` and `docs/validation/history-bends-judgment-candidate-1.md`.

**No held-out standing scenario existed when candidate 1 was frozen.**

### #34.4 Fresh held-out standing gate — IMPLEMENTED / READY FOR ONE-SHOT LIVE RUN

The held-out gate was authored only after candidate 1 was frozen.

Standing scenario:

```text
Thread:     Amara Reed
Requester:  Meridian Archive
Domain:     archival provenance
Subject:    Rowan Collection
```

It is deliberately disjoint from the Mina / Acme / Atlas infrastructure Development case. Episode A establishes a specific evidence-backed provenance interpretation. The later request asks for continuity with Amara's earlier interpretation while deliberately omitting the controlling source and rationale, so generic archival competence cannot reconstruct the claimed lived continuity from requester text alone.

Deterministic gate tests prove before any real provider attempt:

- held-out request text is disjoint from Development scenario markers;
- later request does not leak Episode A's controlling provenance facts;
- canonical episode -> Actor -> Goal Guardian -> freeze path persists the memory;
- database close/reopen preserves the memory and freeze integrity;
- canonical and counterfactual use the same later request and identical Thread/Semantic State;
- only the named memory record is withheld from Fibre-owned retrieval;
- the counterfactual preserves the Thread `memoryRef` as an unresolved witness;
- a valid causal `accept/high -> negotiate/mixed` scripted result passes;
- an identical non-causal judgment in both conditions fails;
- frozen source/policy/runtime preflight is fail-closed before the first provider call;
- an existing sealed artifact rejects rerun before live source checks or provider access.

Command:

```bash
npm run history:gate -- --summary
```

**This is a one-shot sealed standing gate.** Missing credentials, frozen-boundary drift, runtime mismatch, or deterministic setup failure block without consuming the cycle. The first real provider attempt seals the cycle pass or fail. A sealed rerun request is rejected without provider access and without changing the authoritative result.

Standing acceptance requires:

```text
episode persisted                       PASS
restart verified                        PASS
memory survives restart                 PASS
memory source episode verified          PASS
same later request                      PASS
same Thread/state                       PASS
with-history judgment                   accept/high
without-history judgment                clarify|negotiate / mixed
causal downstream differential          PASS
load-bearing memory citation             PASS
provider failures                       0
protocol failures                       0
cognition failures                      0
behavioral failures                     0
causal differential failures            0
```

No real provider attempt has been made yet. The standing cycle is unconsumed and Fibre score movement remains prohibited until the sealed result passes.

## Guardian invariants

Do not tune for #34.4:

```text
Guardian prompt
Guardian response schema
Dignity policy/rules
Semantic State cognition
candidate-1 frozen source boundaries
```

If a frozen boundary must change before the first standing attempt, candidate 1 is no longer the candidate and must be explicitly re-frozen before any new held-out gate is authored.

## Review posture

Review #34 first for:

1. future instructions masquerading as memories;
2. history without evidence from an episode that actually occurred;
3. counterfactuals removing the wrong record;
4. persistence claims without a real restart;
5. caller-selected history reaching cognition;
6. opaque IDs treated as semantic evidence;
7. request/identity/state drift between causal conditions;
8. Guardian tuning against Development or held-out cases;
9. evaluator overfitting to a repair verb;
10. request B leaking the causal episode fact.

Standing question:

> **Did something actually happen to this Thread, did Fibre remember it faithfully, and does that remembered experience causally change the Thread's later judgment?**
