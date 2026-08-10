---
id: fibre-current-state
status: accepted
last-reviewed: 2026-08-09
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

## PR #33 — Semantic Guardian standing earned

PR #33 landed the model-backed Semantic Dignity Guardian infrastructure, persisted cognition boundary, Semantic State v0, Semantic Relationship State v0, willing aligned authority path, real-model evidence harness, provider-failure hardening, and audit/replay plumbing.

The implementation merged before the real-model standing claim was accepted. That standing claim is now **earned** by sealed `semantic_guardian_v4_standing_gate_v4` on frozen `semantic_guardian_v4_candidate_4`.

The passing live cycle reported:

```text
Cases passed                    18/18
Cases attempted                 18/18
Provider failures                0
Protocol validation failures     0
Cognition failures               0
Behavioral failures              0
Differential failures            0
```

See [`semantic-guardian-v4-standing-gate-v4.md`](../validation/semantic-guardian-v4-standing-gate-v4.md).

Provider failure, timeout, schema failure, unparseable output, or semantically invalid output remains distinct from a Thread decision. Persisted valid cognition replays after restart without another model call.

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

A missing semantic-state record is **absence of evidence**, not an implicit neutral or positive state. Missing state must not be interpreted as willingness, availability, trust, indifference, or the semantic opposite of a present state.

The accepted standing proof now demonstrates that changing only semantic-state meaning can change downstream dignity appraisal.

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

Standing cycles v1-v3 remain **FAILED / SEALED** and must never be rerun or edited to pass.

- **v1:** 15/17; exposed an overconstrained semantic-state factor direction and an ambiguous clarification case.
- **v2:** 16/17; all consequential action/fit judgments matched, but an ambiguous one-word `semanticStateImpact.effect` assertion failed.
- **v3:** 16/18; exposed both a flawed state-absence baseline and Fibre's former `max_output_tokens=6000` operational ceiling.

Those failures remain part of the audit trail. They led Fibre to separate gate-spec development from standing evidence rather than repeatedly tune cognition against sealed results.

## Counterfactual gate-spec development — stable

The repeatable non-evidentiary diagnostic is:

```bash
npm run guardian:dev:counterfactual
```

`semantic_guardian_v4_counterfactual_development_v2` established the accepted method: compare explicit state with explicit state while holding the individual, request, state cardinality, domain, dimension, and target constant. Only natural-language semantic meaning changes.

Its two independent pairs passed:

```text
Mina autonomy:
  supportive state  -> accept / high
  opposing state    -> negotiate / mixed

Amara relationship trust:
  supportive state  -> accept / high
  opposing state    -> negotiate / mixed
```

Canonical methodological rule:

> **To prove semantic state causal, compare explicit state with explicit state while holding structural state identity and the request constant. Absence of state is absence of evidence, not the control condition.**

## Standing gate v4 — GREEN

After the counterfactual method stabilized, Fibre froze `semantic_guardian_v4_candidate_4` before authoring `semantic_guardian_v4_standing_gate_v4`.

Candidate 4 preserved Guardian cognition from candidate 3: same model, prompt/schema hashes, policy, normalization, and decision semantics. The only runtime-boundary change was the already-established operational move to provider automatic output limits.

The 18 fresh held-out cases were disjoint from the original development matrix, counterfactual-development requests, and sealed standing gates v1-v3.

V4 passed all cases and both causal differentials:

```text
Mina need/autonomy:
  supportive meaning -> accept / high
  opposing meaning   -> negotiate / mixed

Amara relationship_attitude/trust:
  supportive meaning -> accept / high
  opposing meaning   -> negotiate / mixed
```

The standing semantic gate is therefore **GREEN** and PR #33's semantic claim is earned.

## PR #34 — History bends judgment earned

PR #34 is **EARNED / SEALED** by `history_bends_judgment_standing_gate_v4` on frozen `history_bends_judgment_candidate_4`.

The accepted v4 result is deliberately narrow: a Fibre-owned durable episodic record formed through Nadia Okafor's earlier canonical runtime episode survived database close/reopen and causally changed her later dignity appraisal under exact one-memory withholding.

```text
WITH history:     accept / high
WITHOUT history:  refuse / low
Request fingerprint: sha256:7d57002e7740d87607bcd6dba441009a059fa3af4fddc173337e951bd417fba2
```

The committed evidence bundle records the exact model outputs, rationale, factor evidence refs, retry history, normalizations, frozen boundary, and causal witnesses:

`artifacts/test-results/history_bends_judgment_standing_gate_v4.evidence.json`

This earns **Development `0 -> 1`** under rubric v2. It does not yet establish rich self-authored learning: Episode A's setup appraisal was scripted for isolation, the durable memory is a deterministic descriptive restatement of the accepted request and criteria rather than a Nadia-authored reflection, the later standing appraisal is invoked directly through Guardian v4 in the evidence harness, and this proof path is not yet the default live runtime socket. Those are explicit extension targets rather than evidence silently claimed by this checkpoint.

`npm run history:gate` is now read-only inspection of the committed sealed bundle. `npm run history:dev` remains the repeatable non-evidentiary provider-backed development harness.

## PR #35 — Structured Obligation v1 active

PR #35 is **ACTIVE / UNFINISHED**. Its goal is to replace historical exact-string obligation authority with durable structured commitments whose applicability is determined by Fibre rather than by caller citation.

The accepted design authority is [`structured-obligations-v1.md`](../architecture/structured-obligations-v1.md).

Two invariants govern the work:

> **A caller may nominate an obligation; only Fibre may determine that it governs the current request.**

> **Compulsion never rewrites consent.**

The first implementation slice has landed on the draft branch:

- stable `obl_<sha256>` identity and append-only revisions;
- issuer/parties, natural-language scope/terms, effective/expiry state, recurrence, satisfaction and provenance;
- separate standing visibility and terms visibility so private terms need not be exposed with public standing;
- deterministic request-fingerprint binding for the initial applicability policy;
- additive append-only `obligation_records`, `obligation_applicability_decisions`, and `legacy_obligation_tombstones` tables;
- idempotent migration of consumed legacy exact references into deterministic spent-authority tombstones;
- explicit rejection of automatic promotion from `currentState.unresolvedIntentions`;
- domain/schema tests for binding, append-only history, tombstone non-resurrection, revision sequencing and visibility.

This first slice is intentionally **non-authoritative**. The historical runtime still accepts legacy `obligationReferences` until the explicit #35 authorization cutover. The existence of the new tables therefore does not close #35 or change the 15/26 score.

The remaining #35 order is:

```text
B. ObligationStore/service + current-revision integrity
C. persisted Fibre-owned applicability
D. runtime authorization cutover
E. freeze/discharge cutover
F. inspector + restart/replay/adversarial closure
```

## Model runtime

`config/models.yaml` remains the only model-routing configuration:

```yaml
reasoning:
  dignity_guardian:
    provider: openai
    model: gpt-5.1-2025-11-13
```

Secrets remain environment-only. OpenAI uses strict Responses API structured output, `temperature=0`, `top_p=1`, `reasoning=none`, and conservative transient retry behavior.

The current runtime does not impose a default numeric `max_output_tokens` ceiling; it records the default as `auto`. Sealed candidates 1-3 retain their historical 6000-token boundary. Candidate 4 freezes the automatic-limit runtime.

## Current score posture

Historical M1 remains **11/26**. The live pre-M2 checkpoint is now **15/26 under rubric v2**.

```text
Historical M1                 11/26
Pre-M2 checkpoint             15/26
Non-interchangeability        1
Dignity and consent           2
Social/relationship memory    1
Development                   1
Economic consequence          0
Standing semantic gate        GREEN
PR #33 semantic claim         EARNED
PR #34 history claim          EARNED / SEALED
PR #35 structured obligation  ACTIVE / UNFINISHED
```

The awarded movement remains intentionally conservative:

- Non-interchangeability `0 -> 1`: attributable semantic differences now change participation under controlled held-out conditions, but the stronger rubric-2 repeated-condition/history standard is not yet closed.
- Dignity and consent `1 -> 2`: Thread-owned semantic appraisal plus request-bound authorization now governs willing participation and resistance.
- Social and relationship memory `0 -> 1`: persistent requester-targeted relationship state exists and the accepted trust counterfactual changes appraisal narrowly; the broader reciprocal relationship system remains deferred.
- Development `0 -> 1`: a durable Fibre-owned record from an earlier canonical episode survived restart and was the isolated semantic cause of a later appraisal differential. Richer self-authored learning remains unearned.
- Economic consequence stays `0`: appraisal does not durably spend or constrain future capability.

## Immediate sequence

```text
#33 Semantic Guardian — EARNED
  -> #34 History bends judgment — EARNED / SEALED / MERGED
  -> #35 Structured Obligation v1 — ACTIVE
  -> #36 M2 Identity & Embodiment Contract
  -> #37 Thread Passport & Identity Provenance v1
  -> #38 Lineage, Geography & Embodiment v1
  -> #39 Identity Projection & Causal Consumption
  -> #40 M2 Standing Gate / M2 closure
```

The detailed continuation plan through #43 is [`m2-pr-plan.md`](../validation/m2-pr-plan.md).

## Deferred capability, not erased capability

The following remain deferred with extension paths preserved:

- broader reciprocal relationship service beyond Semantic Relationship State v0;
- richer self-authored developmental learning: Thread-authored observations/reflection, experience-derived self-model/state change, adverse and low-dignity experience memory, and repeated cross-episode behavioral learning;
- completion of Structured Obligation applicability/authorization/freeze cutover;
- general isolated worker/tool/model gateway;
- model-capable Actor and independently observed external action traces;
- production authentication, encryption, principal/role authorization, and stronger tamper anchors;
- production database/distributed lease/cloud topology;
- marketplace execution and economic settlement;
- full identity, lineage, culture, geography, portrait/voice, embodiment, privacy, and self-authorship contract/implementation;
- family, reproduction, institutions, and broader society mechanics.
