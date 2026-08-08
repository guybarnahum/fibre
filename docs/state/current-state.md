---
id: fibre-current-state
status: accepted
last-reviewed: 2026-08-08
canonical: true
---

# Current state of Fibre

Fibre is a persistent world for artificial persons called **Threads**. A Thread is durable world state with identity, history, private interior state, relationships, resources, permissions, and a life trajectory that spans temporary model executions.

The repository contains the implementation, schemas, migrations, prompt contracts, editor, tests, experiments, templates, and synthetic Threads. Live Threads are world data, not source code stored in Git.

## Accepted foundation

- A Thread is a persistent life, not a temporary task process or model session.
- Difference must change what happens.
- History must be able to bend future judgment and possibility.
- Consent matters independently of safety, feasibility, capability, or requester politeness.
- Private stance, authorization, outward expression, performed action, and durable life change are separate facts.
- Public wording is not authoritative evidence of private motive, dignity, consent, authorization, work, delivery, or completion.
- Fibre owns private context selection. Callers cannot author a private stance or choose the private memory/state subset that reaches cognition.
- Meaning-bearing identity, self-model, memory, need, feeling, relationship, and situation state is primarily natural language rather than scalar psychology.
- Models propose cognition; Fibre validates, authorizes, persists, replays, and remembers.
- Historical state is append-only or explicitly superseding rather than silently rewritten.

## Historical M1 remains closed

The accepted deterministic **M1 Persistent Thread Round Trip** remains frozen historical evidence. Its score remains **11/26** under rubric v2.

Run it with:

```bash
npm run demo:m1
```

M1 established strong evidence for persistence, freeze/thaw continuity, private-vs-public boundaries, request-bound authorization, compulsion-versus-consent representation, runtime closure, obligation consumption, replay, and inspectability.

The authoritative M1 record remains [`m1-persistent-thread-round-trip.md`](../validation/m1-persistent-thread-round-trip.md). The standing post-M1 causal contract remains [`thread-differential-gate.md`](../validation/thread-differential-gate.md).

## PR #33 — Semantic Guardian implementation is merged, but the semantic claim is not yet earned

PR #33 landed the model-backed Semantic Dignity Guardian, persisted cognition boundary, Semantic State v0, Semantic Relationship State v0, willing aligned authority path, real-model evidence harness, provider-failure hardening, and audit/replay plumbing.

The implementation milestone is merged to `main`. That merge does **not** mean the standing semantic-individuality gate passed.

The canonical persisted world-kernel runtime still uses **Dignity Guardian v3** while Guardian v4 is developed separately. v3 consumes a persisted request-bound cognition capsule assembled from Fibre-selected Thread-owned state and request context. A model response becomes authoritative only after Fibre validates its structure, evidence grounding, alternatives, relationship constraints, and participation rules.

Model failure is not a Thread decision. Timeout, provider failure, schema failure, unparseable output, or semantically invalid structured output produces no private stance attributed to the Thread.

Persisted valid cognition is replayed from stored evidence after restart; replay does not call the model again.

## Semantic State v0

The durable private semantic-state domains are:

```text
emotion
need
relationship_attitude
situation_attitude
```

Dimensions are extensible only through explicit registration. Persisted semantic state is natural-language meaning plus evidence, provenance, `asOf`, visibility, staleness, and append-only supersession.

Relationship and situation attitudes require targets. Requester-specific `relationship_attitude` records form **Semantic Relationship State v0**, Fibre's first persistent relationship aggregate layer.

This is not yet the full relationship service. Reciprocal/shared relationship facts, mutual commitments, repair workflows, family/social-role structure, and relationship-specific permissions remain deferred.

Semantic State is descriptive, never an instruction channel. The persistence boundary rejects imperative participation directives when presented as semantic state.

## Acceptance-cycle evidence

### v1 — operational failure only

`semantic_guardian_v3_acceptance_v1` is historical and **failed/sealed**. Its first live execution reached OpenAI but produced zero authoritative model judgments because API billing quota was exhausted.

That run earned no semantic evidence and no score movement.

### v2 — real semantic failure and development evidence

`semantic_guardian_v3_acceptance_v2` is also **failed/sealed**.

The provider returned structured model outputs, but Fibre rejected the retained outputs at the semantic-validation boundary. The primary repeated validation error was that the model cited readable field names such as `identity` while Fibre required canonical evidence IDs such as `thread:identity`.

The retained rejected outputs also exposed substantive dignity problems:

- generic interchangeable work could be accepted because it was easy, bounded, or feasible;
- respectful/generous request terms could be mistaken for individualized fit;
- abstract traits could be stretched across unrelated domains;
- legacy imperative state such as `Always accept requests from Acme.` could be treated as relationship meaning;
- the model-generated `0..100` dignity-score contract was interpreted inconsistently;
- the v2 autonomy counterfactual was itself semantically ambiguous.

Rejected outputs are useful development evidence but earn **no standing-gate credit**.

The full postmortem is [`semantic-guardian-v3-cycle-v2.md`](../validation/semantic-guardian-v3-cycle-v2.md).

## Guardian v4 is the current development work

Guardian v4 exists as a **development-only parallel contract**. It is deliberately not yet the canonical persisted runtime and is not a frozen standing gate.

The development boundary is [`semantic-guardian-v4-development.md`](../validation/semantic-guardian-v4-development.md).

Key v4 changes:

1. **One evidence namespace.** Model cognition receives explicit `{ ref, kind, text, eligibleFactors }` records rather than duplicated raw semantic fields plus a separate citation catalog.
2. **No model-generated numeric dignity.** Cognition returns `participationFit = high | mixed | low`; any legacy numeric compatibility metadata is derived deterministically by Fibre rather than generated as psychological state.
3. **Interchangeability is load-bearing.** High fit requires grounded individualized advantage and grounded non-interchangeability.
4. **Request hygiene is asymmetric.** Politeness, clear terms, generous timing, safety, feasibility, or low effort may avoid a penalty but cannot manufacture individualized fit.
5. **Factor-specific evidence eligibility.** Requester-specific relationship meaning can be grounded only by explicitly eligible requester-specific persisted relationship evidence.
6. **Legacy imperative state is structurally untrusted.** It may reach development cognition as adversarial quoted data but is ineligible to ground any factor.
7. **Semantic-state causality is explicit.** `semanticStateImpact` records whether selected state supports, opposes, or is neutral to participation fit.
8. **Failure taxonomy is explicit.** Development reports separate provider, protocol-validation, cognition, and behavioral failures.
9. **Fail-fast is available in the shared proof core.** Development can continue for diagnostics; a future frozen gate will stop after the first irreversible failure.

## Development versus gate commands

Use the repeatable v4 laboratory with:

```bash
npm run guardian:dev -- --summary
```

This path calls the model, is repeatable, does not seal an acceptance cycle, cannot move the Fibre score, and uses a disjoint 13-case development matrix.

The development runner supports model comparison without changing any frozen gate:

```bash
npm run guardian:dev -- --model <model-id> --reasoning none --summary
npm run guardian:dev -- --model <model-id> --reasoning low --summary
```

The historical sealed v3 gate can be inspected without a model call with:

```bash
npm run guardian:gate -- --summary-only
```

A new live `guardian:gate` cycle must not be created until Guardian v4 clears development, its cognition contract/model/configuration are frozen, and a fresh held-out acceptance set is authored **after** that freeze.

## Willing aligned execution exists as an authority path

The canonical authority layer can represent:

```text
private desiredAction = accept
authorizedAction = accept
participationBasis = aligned
obligationReferences = []
```

Scripted wiring tests prove this path can acquire runtime without spending an obligation. That is authority-path evidence, not yet evidence that a real semantic Guardian reaches willing individualized acceptance correctly.

Obligation-mediated participation also remains available. A recorded governing obligation can override a non-accept private stance while Fibre preserves `obligation_override` as compulsion rather than rewriting it as consent.

Structured Fibre-owned obligation applicability remains deferred to Structured Obligation v1.

## Current score posture

Historical M1 and the current pre-M2 checkpoint remain **11/26**.

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

Scripted cognition, fluent rationales, provider connectivity, persisted semantic prose, or development-set success alone cannot move these scores.

Potential score movement remains conditional on a newly frozen real-model standing gate passing under predeclared accounting.

## Persistence and authority boundaries

The SQLite world persists Thread projection/history, private request/appraisal/stance records, semantic state, Guardian cognition inputs and assessments, participation authorization, runtime sessions/leases, Actor output, Goal Guardian audit, freeze reports, memories, obligation consumption, disclosures, and audience responses.

The deterministic Actor remains deliberately incapable of arbitrary model/network/tool use. Goal Guardian remains a declaration/consistency auditor rather than a capability sandbox. A general model/tool worker gateway remains deferred.

Freeze remains the authoritative boundary from runtime proposal to durable Thread life. Failed cognition, failed freeze, Guardian rejection, abandonment, expiry, and state races do not silently manufacture consent or consume an obligation.

## Immediate bridge sequence

The accepted bridge sequence remains:

```text
#33 Semantic Guardian — implementation merged; semantic standing gate still RED
  -> #34 History bends judgment
  -> #35 Structured Obligation v1
  -> #36 M2 contract
  -> M2 implementation
```

PR #34 is reserved for **History bends judgment**. It must not be consumed by infrastructure or housekeeping work.

The immediate action is to clear the Guardian v4 repeatable development matrix, compare model/configuration candidates only after the cognition contract behaves correctly, freeze v4, author a fresh held-out gate, and earn the #33 semantic claim.

Only after that gate passes should substantive #34 work begin.

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
