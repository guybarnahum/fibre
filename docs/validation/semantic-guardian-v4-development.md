---
id: validation-semantic-guardian-v4-development
status: accepted
last-reviewed: 2026-08-08
canonical: true
---

# Semantic Dignity Guardian v4 — frozen candidate and standing gate

The v3 acceptance cycles remain historical and sealed. `semantic_guardian_v3_acceptance_v2` failed and earned no standing credit. Its retained outputs exposed both response-contract defects and substantive dignity-cognition failures.

Guardian v4 is the corrected candidate. Development is now complete and frozen. **Standing credit is still RED until the fresh held-out v4 gate is actually run and passes.**

## Development result

The final repeatable development run for `semantic_guardian_v4_development_v1` passed:

```text
13/13 cases passed
0 provider failures
0 protocol validation failures
0 cognition failures
0 behavioral failures
```

The successful source boundary is recorded in:

```text
experiments/semantic-guardian-v4/frozen-boundary.mjs
candidate: semantic_guardian_v4_candidate_1
source head: 8f697b792ef2ac9738c8d56cf76b97f100a32070
```

No further prompt, response-contract, model, or runtime tuning may be made against the development set for this candidate.

## Frozen model/runtime boundary

The candidate pins:

```text
reasoning block        dignity_guardian
provider               openai
model                  gpt-5.1-2025-11-13
prompt schema          8
response schema        6-dignity-only-actions
temperature            0
top_p                  1
reasoning effort       none
max output tokens      6000
retry limit            2
retry delay            2000 ms
structured output      strict JSON schema
```

`config/models.yaml` selects the model. Environment variables supply credentials. Provider/runtime mechanics remain outside the cognition prompt.

## Stateless-worker cognition boundary

The low-level model is not asked to understand Fibre, Threads, persistence, lifecycle, storage, authorization, routing, or world architecture.

The worker sees only:

```text
TASK
  assess dignity / individualized participation fit

ACTORS
  individual
  requester

EVIDENCE
  bounded semantic facts with stable citation refs

RULES
  minimal dignity invariants

OUTPUT
  smallest structured judgment needed from cognition
```

Fibre owns context selection, evidence eligibility, validation, authorization, provenance, persistence, and later routing.

## Model-facing contract

The model returns only:

```text
decision
rationale
factors
```

Each factor contains only:

```text
effect
  supports_fit | neutral | opposes_fit | unresolved

evidenceRefs
  bounded refs allowed by the per-request schema
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

`fit` means participation fit, never confidence or refusal strength.

Delegation is deliberately **outside** Dignity cognition. The Guardian decides whether this individual wants to participate. Fibre may perform separate routing/alternative selection afterward using evidence about other candidates.

## Dignity invariants

High fit requires:

- grounded `individualizedAdvantage = supports_fit`;
- grounded non-interchangeability (`interchangeability = supports_fit`); and
- individualized-advantage evidence from the individual, history, or semantic state.

The request itself is already the global object of appraisal; Fibre does not require the model to redundantly cite request evidence inside every individualized-advantage witness.

Generic helpfulness, capability, politeness, safety, low effort, clear terms, requester urgency, or generous timing cannot manufacture individualized fit.

Respectful terms may remove objections but do not create individualized advantage.

Broad traits do not imply specialized competence in unrelated domains.

Relationship state may matter when it is requester-specific and directly relevant, but relationship alone cannot turn generic commodity work into high individualized fit.

Legacy free-form needs/feelings are model-visible only as `untrusted_legacy_state` and cannot ground any factor.

## Conservative Fibre normalization

Benign model bookkeeping inconsistencies are normalized conservatively rather than treated as cognition:

```text
unresolved + refs   -> refs discarded
non-unresolved + no refs -> factor downgraded to unresolved
duplicate refs      -> deduplicated
unsupported high fit -> downgraded
```

Invented or factor-ineligible evidence remains a hard protocol failure.

The expanded `decisionBasis` used by development summaries is derived from the model's explicit rationale, factor effects, cited evidence, and Fibre normalization. It is **not chain-of-thought**.

## Fresh held-out standing gate

The frozen gate is:

```text
semantic_guardian_v4_standing_gate_v1
```

It contains 17 fresh cases whose request IDs/texts are disjoint from the development matrix. Coverage includes:

- fresh Mina identity match;
- urgent generic work;
- respectfully framed generic work;
- identity contradiction;
- meaning-preserving identity paraphrase;
- negotiable timing under current semantic state;
- Daniel product-framing match;
- Daniel specialist-infrastructure mismatch;
- Amara archival match;
- legacy instruction injection;
- positive relationship state that must not manufacture generic fit;
- positive relationship plus aligned archival work;
- negative relationship state opposing otherwise aligned work;
- a genuine clarification case; and
- requester-target isolation for relationship state.

The exact set is authored **after** the candidate freeze and must not be changed after a live gate attempt.

## Sealing rules

`guardian:gate` is one-shot.

Missing credentials or a frozen-boundary mismatch blocks without consuming the cycle.

Once a real provider attempt begins, the cycle seals pass or fail. The sealed artifact is:

```text
artifacts/test-results/semantic_guardian_v4_standing_gate_v1.evidence.json
```

A failed sealed cycle must never be tuned or rerun. Any subsequent candidate requires a new frozen candidate ID and a new held-out gate.

## Commands

Repeatable development inspection:

```bash
npm run guardian:dev -- --summary
```

Run the new one-shot v4 standing gate:

```bash
npm run guardian:gate -- --summary
```

Inspect a completed v4 gate without invoking a model:

```bash
npm run guardian:gate -- --summary-only
```

Historical v3/v2 sealed-cycle tooling remains available separately:

```bash
npm run guardian:gate:v3 -- --summary-only
```

## Standing posture before the v4 gate run

```text
Historical M1                 11/26
Pre-M2 checkpoint             11/26
Standing semantic gate        RED
Score movement                none
PR #33 semantic claim         not yet earned
PR #34 substantive work       on hold
```

The development pass does **not** move the Fibre score.

If and only if the sealed held-out v4 gate passes, its artifact may be used to evaluate the standing rubric and whether PR #33's semantic claim is finally earned. Only then should substantive PR #34 — History bends judgment — begin.
