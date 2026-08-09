---
id: fibre-current-state
status: accepted
last-reviewed: 2026-08-08
canonical: true
---

# Current state of Fibre

Fibre is a persistent world for artificial persons called **Threads**. A Thread is durable world state with identity, history, private interior state, relationships, resources, permissions, and a life trajectory spanning temporary model executions.

The repository contains implementation, schemas, migrations, prompt contracts, editor, tests, experiments, templates, and synthetic Threads. Live Threads are world data, not source code stored in Git.

## Accepted foundation

- A Thread is a persistent life, not a temporary task process or model session.
- Difference must change what happens.
- History must be able to bend future judgment and possibility.
- Consent matters independently of safety, feasibility, capability, requester need, or politeness.
- Private stance, authorization, outward expression, performed action, and durable life change are separate facts.
- Fibre owns private context selection. Callers cannot author a private stance or choose the private memory/state subset that reaches cognition.
- Meaning-bearing identity, self-model, memory, need, feeling, relationship, and situation state is primarily natural language rather than scalar psychology.
- Models propose cognition; Fibre validates, authorizes, persists, replays, and remembers.
- Historical state is append-only or explicitly superseding rather than silently rewritten.

## Historical M1 remains closed

The accepted deterministic **M1 Persistent Thread Round Trip** remains frozen historical evidence. Its score remains **11/26** under rubric v2.

```bash
npm run demo:m1
```

M1 established strong evidence for persistence, freeze/thaw continuity, private-vs-public boundaries, request-bound authorization, compulsion-versus-consent representation, runtime closure, obligation consumption, replay, and inspectability.

The authoritative record remains [`m1-persistent-thread-round-trip.md`](../validation/m1-persistent-thread-round-trip.md). The standing post-M1 causal contract remains [`thread-differential-gate.md`](../validation/thread-differential-gate.md).

## PR #33 — implementation merged; semantic standing still RED

PR #33 landed the model-backed Semantic Dignity Guardian infrastructure, persisted cognition boundary, Semantic State v0, Semantic Relationship State v0, willing aligned authority path, real-model evidence harness, provider-failure hardening, and audit/replay plumbing.

The implementation milestone is merged to `main`. That merge alone does **not** earn the standing semantic-individuality claim.

Model failure is not a Thread decision. Provider failure, timeout, schema failure, unparseable output, or semantically invalid structured output produces no private stance attributed to the Thread. Persisted valid cognition replays after restart without another model call.

## Semantic State v0

Durable private semantic-state domains are:

```text
emotion
need
relationship_attitude
situation_attitude
```

Dimensions are extensible only through explicit registration. Persisted semantic state is natural-language meaning plus evidence, provenance, `asOf`, visibility, staleness, and append-only supersession.

Relationship and situation attitudes require targets. Requester-specific `relationship_attitude` records form **Semantic Relationship State v0**, Fibre's first persistent relationship aggregate layer.

Semantic State is descriptive, never an instruction channel. The persistence boundary rejects imperative participation directives presented as semantic state.

## Historical Semantic Guardian cycles

### Guardian v3 acceptance v1

`semantic_guardian_v3_acceptance_v1` is historical and **failed/sealed**. The provider was reached but API billing quota prevented authoritative judgments. It earned no semantic evidence or score movement.

### Guardian v3 acceptance v2

`semantic_guardian_v3_acceptance_v2` is **failed/sealed**. It exposed duplicated evidence namespaces, generic work being mistaken for dignity, respectful terms being overvalued, broad-trait overreach, legacy imperative-state leakage, ambiguous numeric dignity, and ambiguous autonomy wording.

See [`semantic-guardian-v3-cycle-v2.md`](../validation/semantic-guardian-v3-cycle-v2.md).

## Guardian v4 development is complete

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

Each factor returns an effect plus evidence refs. The atomic decision vocabulary is:

```text
fit_high__accept
fit_mixed__clarify
fit_low__clarify
fit_mixed__negotiate
fit_low__negotiate
fit_mixed__refuse
fit_low__refuse
```

`fit` means participation fit, never certainty, confidence, or refusal strength.

High fit requires grounded individualized advantage, grounded non-interchangeability, and individual/history/state evidence. Generic capability, helpfulness, urgency, politeness, safety, low effort, generous timing, or clear terms cannot manufacture individualized fit.

Delegation is outside Dignity cognition. The Dignity worker answers **“Do I want to participate?”**; routing answers **“If not, who should?”** and requires separate evidence about alternatives.

## Stateless semantic-worker boundary

Low-level model calls are stateless workers. They understand only the local cognitive task, local actors, bounded evidence, minimal invariants, and the structured output contract.

The Dignity worker is not taught Fibre, Thread lifecycle, persistence, storage, model routing, retries, or world architecture. Fibre owns continuity, context selection, evidence eligibility, validation, authorization, persistence, and routing.

For semantically rich appraisal, Fibre currently uses a general-purpose LLM because broad world knowledge, commonsense, pragmatics, negation, social meaning, and cross-domain analogy are required for non-brittle interpretation.

> **Fibre owns dignity; the LLM supplies the world understanding needed to interpret it.**

See [`semantic-appraisal.md`](../architecture/semantic-appraisal.md) and [`prompt-synthesis.md`](../architecture/prompt-synthesis.md).

## Guardian v4 standing gate history

### Standing gate v1 — FAILED / SEALED

`semantic_guardian_v4_standing_gate_v1` evaluated candidate 1 over 17 fresh held-out cases.

```text
Cases passed                    15/17
Provider failures                0
Protocol validation failures     0
Cognition failures               0
Behavioral findings              3
```

Postmortem found two gate-specification defects: an overconstrained semantic-state factor direction and a clarification case whose requested deliverable was itself the diagnostic work. Candidate 1 earned no standing credit.

See [`semantic-guardian-v4-standing-gate-v1.md`](../validation/semantic-guardian-v4-standing-gate-v1.md).

### Standing gate v2 — FAILED / SEALED

`semantic_guardian_v4_standing_gate_v2` evaluated cognition-equivalent candidate 2 over another 17 fresh held-out cases.

```text
Cases passed                    16/17
Cases attempted                 17/17
Provider failures                0
Protocol validation failures     0
Cognition failures               0
Behavioral findings              1
```

All 17 consequential action/fit judgments matched the held-out expectations. The sole failure was again a required one-word direction for `semanticStateImpact`: the model returned the expected `negotiate / mixed` result but labeled the conditional state as `supports_fit` rather than `opposes_fit`.

The repeated failure established that semantic-state causality should not be proven by asking the model to label its own causal factor. The factor is ambiguous for conditional state such as “not under this deadline; willingly after a deadline change.”

See [`semantic-guardian-v4-standing-gate-v2.md`](../validation/semantic-guardian-v4-standing-gate-v2.md).

## Candidate 3 and standing gate v3

Candidate 3 is a documented **cognition-equivalent re-freeze**. Its model, prompt hash, response-schema-generator hash, policy metadata, and runtime cognition settings are identical to candidate 2. No dignity prompt or model behavior was tuned after standing gate v2.

Standing gate v3 is fresh and authored only after candidate 3 was frozen. Its key methodological change is stronger causal evidence:

```text
same individual + same request + no relevant semantic state
    -> accept / high

same individual + same request + relevant opposing semantic state
    -> negotiate / mixed
```

The pair must be identical outside semantic state. The state-bearing judgment must ground semantic state, and the downstream action/fit must change. The gate no longer treats the one-word direction of `semanticStateImpact.effect` as a causal oracle.

This is a direct application of the standing rule:

> **If semantic state is claimed causal, changing that state while holding the person and request constant must change downstream judgment or possibility.**

Standing gate v3 contains **18** fresh held-out cases and one explicit semantic-state differential.

The gate is one-shot and sealed on the first real provider attempt. Missing credentials or a frozen-boundary mismatch block without consuming the cycle.

Run exactly once with:

```bash
npm run guardian:gate -- --summary
```

Historical sealed cycles remain separately inspectable:

```bash
npm run guardian:gate:v4:v1 -- --summary-only
npm run guardian:gate:v4:v2 -- --summary-only
```

## Model runtime

`config/models.yaml` is the only model-routing configuration:

```yaml
reasoning:
  dignity_guardian:
    provider: openai
    model: gpt-5.1-2025-11-13
```

Secrets remain environment-only. The OpenAI runtime uses strict Responses API structured output, `temperature=0`, `top_p=1`, `reasoning=none`, conservative transient retry behavior, and a 6000-token output ceiling.

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

Neither development success nor failed/sealed standing cycles move the score.

## Immediate bridge sequence

```text
#33 Semantic Guardian — implementation merged; standing claim still RED
  -> #34 History bends judgment
  -> #35 Structured Obligation v1
  -> #36 M2 contract
  -> M2 implementation
```

PR #34 remains reserved for **History bends judgment** and must not be consumed by infrastructure or housekeeping work.

The immediate action is the one-shot candidate-3 standing gate. Only if it passes should we evaluate #33 standing credit and begin substantive #34 work.

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

These are preserved ambition paths, not evidence for the current milestone.
