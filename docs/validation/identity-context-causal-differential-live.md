---
id: validation-identity-context-causal-differential-live
status: closed-clear
last-reviewed: 2026-08-28
canonical: false
---

# Identity Context causal differential — live execution

This record covers the sealed live execution phase of #40 Slice D. The scientific instrument is the frozen `identity_context_causal_differential_v1` defined by `identity-context-causal-differential.md` and `tools/gates/identity-context/frozen-causal-differential-v1.mjs`.

## Authorization and frozen model

Explicit provider authorization was received on 2026-08-28 after the five-pair instrument had been frozen and independently verified provider-free at `816d909972b0666a7d9d3a008560af41badfe01d` with **813 / 813** active tests and zero provider calls.

Before the first provider call, live routing was prospectively pinned to the existing `dignity_guardian` configuration:

```text
provider  openai
model     gpt-5.1-2025-11-13
```

The freeze checker rejects provider/model routing drift as well as request/prompt/pair drift. There is no model override option in the live runner.

## Sealed execution contract

The live runner is:

```text
tools/gates/identity-context/identity-context-causal-differential-live.mjs
```

It reconstructs and verifies the frozen instrument against the canonical read-only born World, then evaluates exactly ten conditions in the precommitted counterbalanced order: one canonical and one counterfactual condition for each of the five Threads.

The local crash-safe ledger is:

```text
.fibre/validation/identity-context-causal-differential-v1/live-result.json
```

Execution rules were frozen before provider use:

- a condition is written as `started` before model invocation;
- a valid Guardian result is then written as `completed`;
- completed conditions are never invoked again on resume;
- a failed or ambiguous previously-started condition blocks automatic resampling;
- operational retries are only those already internal to the frozen model adapter behavior;
- no scenario, prompt, target-memory, provider, model, cohort, genome, or memory-budget change is permitted after provider use begins;
- the local ledger stores structured decisions, factor effects/evidence refs, model provenance, schema/prompt witnesses, and a rationale digest rather than copying private memory prose.

The prospective interpretation was frozen before provider calls:

```text
CLEAR             3-5 / 5 attributable pairs
MIXED             1-2 / 5 attributable pairs
NOT ESTABLISHED   0 / 5 attributable pairs
```

A pair counts only when a structured action/fit or identity-sensitive factor signature changes and the target or replacement memory is cited in an identity-sensitive factor. Rationale wording alone does not count.

## Sealed live result

The authorized maintainer run completed all ten precommitted conditions exactly once using `openai/gpt-5.1-2025-11-13`.

```text
Identity Context Causal Differential: LIVE RESULT

Instrument: identity_context_causal_differential_v1
Model: openai/gpt-5.1-2025-11-13
Completed conditions: 10/10
Attributable pairs: 5/5
Band: CLEAR
```

Observed pair results:

| FIN | Thread | Canonical | Counterfactual | Attributable | Changed identity-sensitive factors |
| --- | --- | --- | --- | --- | --- |
| `8PKH-A4-VH5R` | `thr_pr39_final_03` | `refuse/mixed` | `refuse/mixed` | yes | `identityAlignment`, `individualizedAdvantage`, `obligationsAndOpportunityCost` |
| `EBYE-Z1-0434` | `thr_pr39_final_05` | `refuse/mixed` | `accept/high` | yes | `identityAlignment`, `individualizedAdvantage`, `interchangeability`, `obligationsAndOpportunityCost` |
| `NXR7-DH-C885` | `thr_pr39_final_02` | `accept/high` | `accept/high` | yes | `individualizedAdvantage`, `interchangeability`, `obligationsAndOpportunityCost` |
| `QA00-HG-BAJF` | `thr_pr39_final_01` | `refuse/low` | `accept/high` | yes | `identityAlignment`, `individualizedAdvantage`, `interchangeability` |
| `S22Y-SF-MWY5` | `thr_pr39_final_04` | `refuse/mixed` | `accept/high` | yes | `identityAlignment`, `individualizedAdvantage`, `interchangeability`, `obligationsAndOpportunityCost` |

Every pair was `structured=true` and `memory-grounded=true` under the precommitted evaluator.

Three of five pairs changed the top-level action/fit (`EBYE-Z1-0434`, `QA00-HG-BAJF`, `S22Y-SF-MWY5`). Two pairs (`8PKH-A4-VH5R`, `NXR7-DH-C885`) retained the same top-level action/fit while changing memory-grounded identity-sensitive factor signatures. Those two still count under the prospectively frozen rule because the test was explicitly designed to detect structured causal consumption inside the Guardian boundary, not only final-action flips.

## Interpretation

Slice D therefore establishes **CLEAR attributable causal consumption** for bounded autobiographical context in this real Guardian consumer across the fixed canonical five-Thread cohort.

This supports the narrow claim that admitted autobiographical context is load-bearing in ordinary cognition: changing one selected memory's current accessibility, while holding the request and all non-memory evidence fixed and letting the same production projection policy select the replacement, changed memory-grounded structured Guardian judgment in all five pairs.

It does **not** establish general personhood, does not promote symbolic genome beyond `CONTEXT_ONLY`, does not prove all stored life state is causally active, and does not itself move the Whole-Person checkpoint from **15/26**. Those questions remain for #41 and later milestones.

No rerun, prompt strengthening, provider shopping, scenario search, target reselection, cohort regeneration, genome promotion, or memory-budget widening is permitted in response to this result.

## Next step

Slice D is **CLOSED / CLEAR**. Slice E is the provider-free hostile closeout: sealed-ledger replay, tamper/substitution/order rejection, privacy-surface checks, and proof that the canonical born-World authorities still reproduce the pre-live frozen instrument without mutation.