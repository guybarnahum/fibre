---
id: fibre-current-state
status: accepted
last-reviewed: 2026-08-08
canonical: true
---

# Current state of Fibre

Fibre is a persistent world for artificial persons called **Threads**. A Thread is durable world state with identity, history, private interior state, relationships, resources, permissions, and a life trajectory spanning temporary model executions.

Live Threads are world data, not source code stored in Git. Models provide temporary cognition; Fibre owns continuity, authoritative state, validation, authorization, persistence, replay, and consequences.

## Accepted foundation

- A Thread is a persistent life, not a temporary task process or model session.
- Difference must change what happens.
- History must be able to bend future judgment and possibility.
- Consent matters independently of safety, feasibility, capability, requester need, or politeness.
- Private stance, authorization, outward expression, performed action, and durable life change are separate facts.
- Fibre owns private context selection. Callers cannot author private stance or select the private state subset that reaches cognition.
- Meaning-bearing identity, self-model, memory, need, feeling, relationship, and situation state is primarily natural language rather than scalar psychology.
- Historical state is append-only or explicitly superseding rather than silently rewritten.

## Historical M1 remains closed

The accepted deterministic **M1 Persistent Thread Round Trip** remains frozen historical evidence at **11/26** under rubric v2.

```bash
npm run demo:m1
```

M1 established persistence, freeze/thaw continuity, private/public boundaries, request-bound authorization, compulsion-versus-consent representation, runtime closure, obligation consumption, replay, and inspectability.

The authoritative records remain [`m1-persistent-thread-round-trip.md`](../validation/m1-persistent-thread-round-trip.md) and [`thread-differential-gate.md`](../validation/thread-differential-gate.md).

## PR #33 — implementation merged; semantic standing still RED

PR #33 landed the model-backed Semantic Dignity Guardian infrastructure, persisted cognition boundary, Semantic State v0, Semantic Relationship State v0, willing aligned authority path, real-model evidence harness, provider-failure hardening, and audit/replay plumbing.

The implementation milestone is merged to `main`. That merge alone does **not** earn the standing semantic-individuality claim.

Provider failure, timeout, schema failure, unparseable output, or semantically invalid output is not a Thread decision. Persisted valid cognition replays after restart without another model call.

## Semantic State v0

Durable private semantic-state domains are:

```text
emotion
need
relationship_attitude
situation_attitude
```

Dimensions are explicitly registered. State is natural-language meaning plus evidence, provenance, `asOf`, visibility, staleness, and append-only supersession. Relationship and situation attitudes require targets. Requester-specific relationship attitudes form **Semantic Relationship State v0**.

Semantic state is descriptive, never an instruction channel.

## Guardian v4 cognition contract

`semantic_guardian_v4_development_v1` passed **13/13** with zero provider, protocol, cognition, or behavioral failures. No further tuning against that development set is permitted.

The worker assesses:

```text
DIGNITY = individualized participation fit
```

It returns only:

```text
decision
rationale
factors
```

Decision vocabulary:

```text
fit_high__accept
fit_mixed__clarify
fit_low__clarify
fit_mixed__negotiate
fit_low__negotiate
fit_mixed__refuse
fit_low__refuse
```

High fit requires grounded individualized advantage, grounded non-interchangeability, and individual/history/state evidence. Generic capability, helpfulness, urgency, politeness, safety, low effort, generous timing, or clear terms cannot manufacture individualized fit.

Delegation is outside Dignity cognition. Dignity answers **“Do I want to participate?”**; routing answers **“If not, who should?”** using separate evidence.

## Stateless semantic-worker boundary

Low-level model calls are stateless workers. They receive only the local cognitive task, local actors, bounded evidence, minimal rules, and the smallest structured output needed.

For semantically rich appraisal, Fibre currently uses a general-purpose LLM because broad world knowledge, commonsense, pragmatics, negation, social meaning, and cross-domain analogy are required for non-brittle interpretation.

> **Fibre owns dignity; the LLM supplies the world understanding needed to interpret it.**

See [`semantic-appraisal.md`](../architecture/semantic-appraisal.md) and [`prompt-synthesis.md`](../architecture/prompt-synthesis.md).

## Guardian v4 standing-gate history

All three standing cycles below are **FAILED / SEALED** and must never be rerun or edited to pass.

### Standing gate v1

`semantic_guardian_v4_standing_gate_v1` evaluated candidate 1 over 17 fresh held-out cases.

```text
Cases passed                    15/17
Provider failures                0
Protocol validation failures     0
Cognition failures               0
Behavioral findings              3
```

Postmortem found an overconstrained semantic-state factor direction and a clarification case whose requested deliverable was itself the diagnostic work.

See [`semantic-guardian-v4-standing-gate-v1.md`](../validation/semantic-guardian-v4-standing-gate-v1.md).

### Standing gate v2

`semantic_guardian_v4_standing_gate_v2` evaluated cognition-equivalent candidate 2 over 17 fresh held-out cases.

```text
Cases passed                    16/17
Provider failures                0
Protocol validation failures     0
Cognition failures               0
Behavioral findings              1
```

All consequential action/fit judgments matched expectations. The only failure was a required one-word `semanticStateImpact.effect` direction even though the model returned the expected `negotiate / mixed` judgment.

This established that semantic-state causality should be tested by downstream differential behavior rather than a model self-label.

See [`semantic-guardian-v4-standing-gate-v2.md`](../validation/semantic-guardian-v4-standing-gate-v2.md).

### Standing gate v3

`semantic_guardian_v4_standing_gate_v3` evaluated cognition-equivalent candidate 3 over 18 fresh held-out cases and introduced an explicit same-request semantic-state counterfactual.

```text
Cases passed                    16/18
Cases attempted                 18/18
Provider failures                1
Protocol validation failures     0
Cognition failures               0
Behavioral findings              2
Differential findings            1
```

The state-bearing half of the counterfactual was truncated by Fibre's then-current `max_output_tokens=6000` runtime ceiling. The no-state baseline returned `clarify / mixed` rather than `accept / high` because the request itself explicitly said to ask if the deadline conflicted with **current availability**, making availability a specific missing fact when no private state was supplied.

The baseline therefore did not cleanly isolate “no opposing state.” This is a gate-specification defect. The provider truncation is operational, not cognition evidence.

See [`semantic-guardian-v4-standing-gate-v3.md`](../validation/semantic-guardian-v4-standing-gate-v3.md).

## Process correction after standing gate v3

Do **not** immediately author standing gate v4.

Repeatedly creating a new sealed gate after inspecting each failed cycle would weaken the evidentiary process. The counterfactual **test mechanism** must now be developed separately from standing evidence.

Fibre therefore has a repeatable, explicitly non-evidentiary diagnostic:

```bash
npm run guardian:dev:counterfactual
```

It contains two same-request pairs:

```text
same individual + same request + no relevant opposing state
    -> willing aligned participation

same individual + same request + grounded opposing state
    -> changed downstream judgment
```

One pair tests Mina's autonomy/deadline state; a second independently tests Amara's requester-specific relationship resistance. Each pair is structurally identical outside semantic state.

This diagnostic may be rerun and tuned as **gate-spec development**. It permits no standing credit or score movement. Guardian prompt/schema cognition remains unchanged during this work.

Only after the counterfactual mechanism is stable should Fibre freeze another candidate/runtime boundary and author a completely fresh held-out standing cycle.

The default standing-gate command is intentionally paused:

```bash
npm run guardian:gate
```

It reports that no active standing gate exists. Historical sealed runners remain available explicitly for inspection.

## Model runtime

`config/models.yaml` remains the only model-routing configuration:

```yaml
reasoning:
  dignity_guardian:
    provider: openai
    model: gpt-5.1-2025-11-13
```

Secrets remain environment-only. OpenAI uses strict Responses API structured output, `temperature=0`, `top_p=1`, `reasoning=none`, and conservative transient retry behavior.

After standing gate v3, Fibre stopped imposing a default numeric `max_output_tokens` ceiling. The runtime now omits that field by default and records the configuration as `auto`; callers may still explicitly supply a ceiling when needed. This prevents Fibre from truncating otherwise valid compact structured cognition merely because reasoning/output usage crosses an arbitrary local cap.

The sealed candidates retain their historical 6000-token runtime boundary unchanged.

## Current score posture

Historical M1 and the pre-M2 checkpoint remain **11/26**.

```text
Historical M1                 11/26
Pre-M2 checkpoint             11/26
Non-interchangeability        0
Dignity and consent           1
Development                   0
Economic consequence          0
Standing semantic gate        RED
PR #33 semantic claim         not yet earned
```

Development success and failed/sealed standing cycles do not move the score.

## Immediate bridge sequence

```text
#33 Semantic Guardian — implementation merged; standing claim still RED
  -> #34 History bends judgment
  -> #35 Structured Obligation v1
  -> #36 M2 contract
  -> M2 implementation
```

PR #34 remains reserved for **History bends judgment** and must not be consumed by infrastructure or housekeeping work.

The immediate action is **counterfactual gate-spec development**, not another standing run. Substantive #34 work remains blocked until #33 earns standing credit.

## Deferred capability, not erased capability

The following remain deferred with extension paths preserved:

- broader reciprocal relationship service beyond Semantic Relationship State v0;
- substantive developmental learning proof;
- structured obligation applicability;
- general isolated worker/tool/model gateway;
- model-capable Actor and independently observed external action traces;
- production authentication, encryption, principal/role authorization, and stronger tamper anchors;
- production database/distributed lease/cloud topology;
- marketplace execution and economic settlement;
- full identity, lineage, culture, geography, portrait/voice, embodiment, privacy, and self-authorship contract/implementation;
- family, reproduction, institutions, and broader society mechanics.
