---
id: m2-pr39-gate-g-review-request
status: frozen_pending_g6_verification
last-reviewed: 2026-08-21
canonical: false
---

# Milestone #39 — Blocking Gate G review request

## Reviewer instruction

Perform a **hostile, blocking pre-execution review** of Fibre Milestone #39 Slice G on branch:

```text
agent/pr39-genesis-childhood-birth-v1
```

No final-cohort life may exist when this review is performed. Do not review H outcomes; there must be none.

Return exactly one final verdict:

```text
CLEAR
HOLD
REDESIGN
```

Severity:

```text
S1  experiment invalid / final-life generation forbidden until fixed
S2  material interpretability or integrity defect
S3  bounded limitation that may be carried explicitly into H
observation  nonblocking
```

## Central question

> **Has Fibre frozen a complete, internally consistent, non-adaptive G1–G6 protocol that can generate and judge the first final five-Thread cohort without post-outcome discretion, hidden quality selection, or forbidden genome/identity leakage?**

## Start here

```text
docs/validation/m2-pr39-slice-g-freeze-ledger.md
docs/validation/m2-pr39-slice-g1-result.md
docs/validation/m2-pr39-slice-g2-review-result.md
docs/validation/m2-pr39-slice-g3-pass-b-treatment-freeze.md
docs/validation/m2-pr39-slice-g34-hostile-review-result.md
docs/validation/m2-pr39-slice-g5-result.md
docs/validation/m2-pr39-slice-g6-verdict-freeze.md

artifacts/validation/m2-pr39/g/protocol/g1-world-candidate-freeze-v2.json
artifacts/validation/m2-pr39/g/protocol/g2-cohort-genome-freeze-v2.json
artifacts/validation/m2-pr39/g/protocol/g3-pass-b-treatment-freeze-v1.json
artifacts/validation/m2-pr39/g/protocol/g3-pass-b-treatment-freeze-v2.json
artifacts/validation/m2-pr39/g/protocol/g4-cognition-freeze-v1.json
artifacts/validation/m2-pr39/g/protocol/g4-cognition-freeze-v2.json
artifacts/validation/m2-pr39/g/protocol/g5-evaluation-surfaces-v1.json
artifacts/validation/m2-pr39/g/protocol/g5-diagnostics-freeze-v1.json
artifacts/validation/m2-pr39/g/protocol/g6-verdict-freeze-v1.json
```

G6 exact byte authority before local verification:

```text
Git blob 3f66b590eb357b97baa4bb7778a781e5ca82af32
```

The local G6 verifier will compute/report its canonical JSON digest without changing these bytes.

Follow dependencies into executable Genesis and verifier code as needed.

## What is already frozen

### G1

Five concrete genome-blind Worlds are final and familiarity-cleared:

```text
Cần Thơ, Vietnam
Łódź, Poland
Cusco, Peru
Accra, Ghana
Greater Sudbury, Ontario, Canada
```

### G2

Five actual cohort genomes are frozen and assigned to G1 Worlds through the preserved deterministic within-origin derangement. The actual five-pair textual-distinguishability ceiling is preserved.

Measured cycle:

```text
(1,2) (2,3) (3,4) (4,5) (5,1)
```

Pair `(3,4)` was inconclusive at G2 and is explicitly not a required H success.

### G3-v2

Production remains six Pass-B calls per Thread:

```text
horizons   4  5  6  7  8  10
mode       L  L  T  L  L  T
```

Ten of 30 calls are direct whole-genome treatment. The hostile-review amendment preregisters fixed-ordinal between-Thread analysis at ordinals 3 and 6; between-stratum causal comparison is forbidden as horizon-confounded.

### G4-v2

Exact A/B/C cognition, prompts/schemas, EventStructurePool v2 schedules, rosters, chronology, retry caps, publication witness and entry justification are frozen. Whole-candidate cap is one. Pass A and Pass C are genome blind. Pass-B treatment memories have a mechanical normalized four-token genome-copy gate with at most one anti-enrichment retry.

### G5

Evaluation was frozen before any final life:

```text
normalizer       openai/gpt-5.1-2025-11-13
audit rater      google/gemini-3.6-flash
G5 protocol      sha256:4520357cab14bcdc883c6b3966401c98d17a1424e47f26e8c04002728d799ed5
G5 protocol blob 7c6a856d0650b3468bc988a4f5cbd2d96c7551c5
```

D1–D5 surfaces, randomization, transformations, minimum analyzability and bands are fixed.

### G6

`CLEAR | HOLD | REDESIGN` semantics are frozen before H.

Core rule:

```text
bad cohort       HOLD and preserve
broken experiment REDESIGN and preserve
```

## Required attacks

### 1. Sequencing / contamination

Confirm that no final-cohort cognition or life artifact exists and that G1–G6 were frozen in the intended order. Look for any final-cohort model call hidden outside `artifacts/validation/m2-pr39/g/cohort/`.

### 2. World/genome independence

Revisit the G2-v1 author-visibility correction and G2-v2 deterministic within-origin derangement. Decide whether the correction genuinely prevents author-visible World↔genome pairing from contaminating H interpretation without laundering the original overclaim.

### 3. Treatment assignment and primary comparison

Verify that G3-v2 changes analysis only, not the `L L T L L T` production schedule. Confirm G5/G6 cannot later select a different history depth, ordinal or between-stratum comparison after H.

### 4. Genome leakage

Trace all executable paths into Pass A, `life_only` Pass B and Pass C. Verify that structural allowlists plus the G4-v2 four-token treatment-memory gate close the material routes for direct genome wording to leak into genome-blind cognition. Distinguish unavoidable semantic propagation through admitted memories from forbidden direct treatment leakage.

### 5. Retry / survivorship pressure

Verify:

- Pass-A retries are mechanical and bounded;
- rejected semantic record content is withheld where required;
- Pass-B genome-copy retry is exactly one and anti-enrichment;
- whole-candidate cap is one;
- no quality criterion can cause hidden regeneration;
- repair/retry counts remain visible in H.

### 6. G5 normalizer/rater design

Attack whether OpenAI normalization followed by Gemini rating is sufficiently independent for D1/D2/D3/D5. Look for information the normalizer could accidentally add/remove in a way that biases attribution or genome discrimination.

### 7. D1 threshold

Judge whether `>=4/5` normalized attribution is an appropriate #39 blocking requirement given five 5-way queries, and whether raw attribution is correctly prevented from rescuing normalized failure.

### 8. D2 no-quota boundary

G6 makes insufficient D2 sample size nonblocking to avoid turning `no_durable_meaning` into a hidden minimum-meaning quota. Attack whether that is scientifically honest or leaves an unacceptable blind spot. Also judge the stable very-high HOLD rule:

```text
rho >= .75
AND every leave-one-Thread-out rho >= .60
```

### 9. D3 ceiling-aware rule

This is a critical review target.

G6 excludes pair `(3,4)` from required success because G2 gave it no detectable ceiling. The four G2-detectable core edges are:

```text
(1,2) (2,3) (4,5) (5,1)
```

At ordinal 3 and ordinal 6 separately, CLEAR requires:

```text
both ordinals >= 3/4 correct core edges
and at least one ordinal = 4/4
```

Reference-only fair-independent arithmetic is `0.03515625` for that two-ordinal rule; independence is not asserted.

Attack whether this rule is defensible, too permissive, too strict, or improperly selected after G2. In particular, confirm that excluding `(3,4)` is a legitimate ceiling constraint rather than post-hoc removal of a difficult pair.

### 10. D3 negative control

The exact G5 signal remains:

```text
either clean ordinal = 5/5
OR both clean ordinals >= 4/5
```

G6 maps a statistical signal to HOLD/investigation and only maps a mechanically confirmed forbidden genome path to REDESIGN. Attack whether that distinction is correct.

### 11. D4 / D5 hidden quality gates

Confirm D4 remains descriptive and cannot create a funnel quota. Judge whether D5's `4–5 near_total_self_explanation Threads => HOLD` is a defensible screenplay/self-coherence warning rather than an arbitrary requirement for psychological messiness.

### 12. Inconclusive diagnostics

G6 allows CLEAR with mandatory disclosure when D2 is underpowered or `life_only_exposed` is too sparse, because forcing these cells would create meaning/memory quotas or regeneration pressure. Decide whether these should remain nonblocking.

### 13. HOLD versus REDESIGN

Attack the exact boundary:

- scientific weakness/inconclusive result -> HOLD;
- confirmed protocol/integrity invalidation -> REDESIGN.

Do not recommend REDESIGN merely because multiple H metrics could be bad. A bad first cohort must remain evidence.

### 14. Gate-G completeness

Look for **any remaining degree of freedom that can still be chosen after seeing the five lives**: model/provider, prompt/schema, randomization, candidate order, normalization, thresholds, primary comparison, exclusion, retry, regeneration, publication, or interpretation.

## Required response

Return:

1. `VERDICT: CLEAR | HOLD | REDESIGN`
2. findings ranked S1/S2/S3;
3. whether any final-life generation is authorized;
4. the smallest exact pre-life amendment required for every blocking finding;
5. explicit judgment on the G6 D3 four-edge/two-ordinal rule;
6. explicit judgment on whether any hidden post-outcome discretion remains.

Do not suggest aesthetic refactors. Do not rewrite preserved G1–G5 evidence. If a bounded correction is needed, require a new explicit pre-life version and another Gate-G review.
