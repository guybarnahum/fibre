---
id: validation-semantic-guardian-v4-development
status: accepted
last-reviewed: 2026-08-09
canonical: true
---

# Semantic Dignity Guardian v4 — development and standing history

The v3 acceptance cycles remain historical and sealed. `semantic_guardian_v3_acceptance_v2` failed and earned no standing credit. Its retained outputs exposed both response-contract defects and substantive dignity-cognition failures.

Guardian v4 replaced that line. Its repeatable Development set stabilized first; four fresh standing cycles were then frozen and sealed. Standing v1-v3 failed and remain failures. Standing v4 passed and earned PR #33's semantic claim.

## Development result

The final repeatable development run for `semantic_guardian_v4_development_v1` passed:

```text
13/13 cases passed
0 provider failures
0 protocol validation failures
0 cognition failures
0 behavioral failures
```

The original Candidate 1 freeze boundary was:

```text
candidate: semantic_guardian_v4_candidate_1
source head: 8f697b792ef2ac9738c8d56cf76b97f100a32070
```

Its former active file `experiments/semantic-guardian-v4/frozen-boundary.mjs` is retired. The exact frozen standing evidence is preserved in the committed v1 evidence bundle and reachable Git history; the active tree keeps Candidate 4 and the accepted v4 standing record.

No prompt, response-contract, model, or runtime tuning may be justified by replaying a sealed standing set.

## Frozen model/runtime boundary used by early v4 candidates

The early candidate line pinned:

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

Candidate 4 later froze the same cognition with provider automatic output limits after standing v3 exposed the artificial local 6000-token ceiling. `config/models.yaml` selects the model. Environment variables supply credentials. Provider/runtime mechanics remain outside the cognition prompt.

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

## Standing history

The standing line is now fully sealed:

```text
v1  FAILED / SEALED
v2  FAILED / SEALED
v3  FAILED / SEALED
v4  PASSED / SEALED
```

Exact committed evidence:

```text
artifacts/test-results/semantic_guardian_v4_standing_gate_v1.evidence.json
artifacts/test-results/semantic_guardian_v4_standing_gate_v2.evidence.json
artifacts/test-results/semantic_guardian_v4_standing_gate_v3.evidence.json
artifacts/test-results/semantic_guardian_v4_standing_gate_v4.evidence.json
```

The failed cycles are not runnable repair targets. Their diagnoses are retained in the validation postmortems and Candidate 4. The accepted v4 bundle is the machine-readable authority for PR #33's standing claim.

## Commands

Repeatable Development inspection:

```bash
npm run guardian:dev -- --summary
```

Repeatable counterfactual Development diagnostic:

```bash
npm run guardian:dev:counterfactual
```

Read-only inspection of the accepted sealed standing v4 evidence:

```bash
npm run guardian:gate -- --summary
# equivalent compatibility alias:
npm run guardian:gate:v4 -- --summary
```

The standing inspector contains no provider/model execution path. There is intentionally no `guardian:gate:v3` rerun command and no requirement to keep historical failed runners active.

## Current standing posture

PR #33's Semantic Guardian claim is **EARNED / SEALED**. Its accepted checkpoint is **14/26 under rubric v2**. PR #34 subsequently earned the narrow Development `0 -> 1` history claim, so the current live pre-M2 checkpoint is **15/26** and **#35 Structured Obligation v1** is next.

Development runs remain repeatable diagnostics and never move the score by themselves.
