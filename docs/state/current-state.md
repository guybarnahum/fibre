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
- Public wording is not authoritative evidence of private motive, dignity, consent, authorization, work, delivery, or completion.
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

## PR #33 — implementation merged; semantic claim still awaiting standing gate

PR #33 landed the model-backed Semantic Dignity Guardian infrastructure, persisted cognition boundary, Semantic State v0, Semantic Relationship State v0, willing aligned authority path, real-model evidence harness, provider-failure hardening, and audit/replay plumbing.

The implementation milestone is merged to `main`. That merge alone does **not** earn the standing semantic-individuality claim.

Model failure is not a Thread decision. Provider failure, timeout, schema failure, unparseable output, or semantically invalid structured output produces no private stance attributed to the Thread.

Persisted valid cognition is replayed from stored evidence after restart; replay does not call the model again.

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

## Historical Semantic Guardian acceptance cycles

### v1

`semantic_guardian_v3_acceptance_v1` is historical and **failed/sealed**. The provider was reached but API billing quota prevented authoritative judgments. It earned no semantic evidence or score movement.

### v2

`semantic_guardian_v3_acceptance_v2` is also **failed/sealed**. It produced real model outputs but exposed both protocol defects and substantive dignity failures:

- duplicated semantic/evidence namespaces;
- generic interchangeable work accepted because it was easy or bounded;
- respectful terms mistaken for individualized fit;
- broad traits stretched across unrelated domains;
- legacy imperative state treated as relationship meaning;
- ambiguous model-generated numeric dignity;
- ambiguous autonomy wording.

Rejected outputs remain development evidence only. See [`semantic-guardian-v3-cycle-v2.md`](../validation/semantic-guardian-v3-cycle-v2.md).

## Guardian v4 development is complete and frozen

`semantic_guardian_v4_development_v1` now passes **13/13** with:

```text
provider failures              0
protocol validation failures   0
cognition failures             0
behavioral failures            0
```

The exact successful candidate is frozen as:

```text
semantic_guardian_v4_candidate_1
source head: 8f697b792ef2ac9738c8d56cf76b97f100a32070
```

The frozen boundary pins the prompt hash, response-schema-generator hash, policy metadata, model selection, and runtime configuration. No more tuning against the development matrix is permitted for this candidate.

See [`semantic-guardian-v4-development.md`](../validation/semantic-guardian-v4-development.md).

## Stateless reasoning-worker boundary

Low-level model calls are stateless workers. They should understand only the local cognitive task, local actors, bounded evidence, minimal invariants, and the structured output contract.

The Dignity worker is therefore **not** taught Fibre, Thread lifecycle, persistence, storage, model routing, retries, or world architecture.

For Dignity cognition the worker sees ordinary semantic concepts:

```text
individual
requester
request
evidence
```

Fibre owns continuity, context selection, evidence eligibility, validation, authorization, persistence, and routing.

A model-facing field should survive the question: **does understanding this field improve the local reasoning result?** If not, it stays outside the worker boundary.

## Guardian v4 cognition contract

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

Each factor returns only:

```text
effect
  supports_fit | neutral | opposes_fit | unresolved

evidenceRefs
```

The atomic decision vocabulary is:

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

### High-fit requirements

High fit requires:

- grounded individualized advantage;
- grounded non-interchangeability; and
- individualized-advantage evidence from identity, self-model, history, or semantic state.

Generic capability, helpfulness, requester urgency, politeness, safety, low effort, generous timing, or clear terms cannot manufacture individualized fit.

Relationship meaning may matter when directly relevant and requester-specific, but relationship alone cannot turn generic commodity work into high individualized fit.

### Delegation is outside Dignity

The Dignity worker answers:

```text
Do I want to participate?
```

It does **not** answer:

```text
If not, who should?
```

Delegation/routing is a separate Fibre concern requiring actual evidence about alternative candidates. The worker no longer sees `knownAlternatives` and cannot choose a delegate action.

### Conservative normalization

Fibre conservatively normalizes benign response bookkeeping:

```text
unresolved + refs          -> refs discarded
non-unresolved + no refs   -> factor becomes unresolved
duplicate refs             -> deduplicated
unsupported high fit       -> downgraded
```

Invented or factor-ineligible evidence remains a hard protocol failure.

The development `decisionBasis` expands the model's explicit rationale, factor effects, cited evidence, and Fibre normalization for inspection. It is not hidden chain-of-thought.

## Model runtime

`config/models.yaml` is the only model-routing configuration:

```yaml
reasoning:
  dignity_guardian:
    provider: openai
    model: gpt-5.1-2025-11-13
```

Secrets remain environment-only. The OpenAI runtime uses strict Responses API structured output, `temperature=0`, `top_p=1`, `reasoning=none`, conservative transient retry behavior, and a 6000-token output ceiling. The ceiling is an upper bound, not a token target.

## Fresh v4 standing gate is authored but not yet run

The held-out cycle is:

```text
semantic_guardian_v4_standing_gate_v1
```

It contains 17 fresh request cases disjoint from development request IDs/texts. It covers fresh identity match/mismatch, urgency, respectful generic work, paraphrase/contradiction, negotiable semantic state, relationship support/opposition, relationship target isolation, legacy instruction injection, and genuine clarification.

The gate is **sealed on first real provider attempt**. Missing credentials or a frozen-boundary mismatch block without consuming the cycle. Once a real provider attempt begins, pass or fail is final for this gate.

Run it exactly once with:

```bash
npm run guardian:gate -- --summary
```

After a completed run, inspect without calling a model:

```bash
npm run guardian:gate -- --summary-only
```

Historical v3/v2 tooling remains separately available:

```bash
npm run guardian:gate:v3 -- --summary-only
```

The sealed v4 artifact will be:

```text
artifacts/test-results/semantic_guardian_v4_standing_gate_v1.evidence.json
```

## Willing aligned execution exists as an authority path

The authority layer can represent:

```text
private desiredAction = accept
authorizedAction = accept
participationBasis = aligned
obligationReferences = []
```

Scripted wiring proves this path can acquire runtime without spending an obligation. That is authority-path evidence; standing semantic credit still depends on the frozen real-model gate.

Obligation-mediated participation remains available. A governing obligation can override a non-accept private stance while Fibre preserves `obligation_override` as compulsion rather than rewriting it as consent.

Structured Fibre-owned obligation applicability remains deferred to Structured Obligation v1.

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

Development success alone cannot move these scores. Potential score movement remains conditional on the newly frozen real-model standing gate passing under its predeclared accounting.

## Persistence and authority boundaries

The SQLite world persists Thread projection/history, private request/appraisal/stance records, semantic state, Guardian cognition inputs and assessments, participation authorization, runtime sessions/leases, Actor output, Goal Guardian audit, freeze reports, memories, obligation consumption, disclosures, and audience responses.

The deterministic Actor remains deliberately incapable of arbitrary model/network/tool use. Goal Guardian remains a declaration/consistency auditor rather than a capability sandbox. A general model/tool worker gateway remains deferred.

Freeze remains the authoritative boundary from runtime proposal to durable Thread life. Failed cognition, failed freeze, Guardian rejection, abandonment, expiry, and state races do not silently manufacture consent or consume an obligation.

## Immediate bridge sequence

```text
#33 Semantic Guardian — implementation merged; frozen standing gate ready but still RED
  -> #34 History bends judgment
  -> #35 Structured Obligation v1
  -> #36 M2 contract
  -> M2 implementation
```

PR #34 remains reserved for **History bends judgment** and must not be consumed by infrastructure or housekeeping work.

The immediate action is to run the one-shot frozen v4 standing gate. Only if it passes should we evaluate #33 standing credit and then begin substantive #34 work.

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
