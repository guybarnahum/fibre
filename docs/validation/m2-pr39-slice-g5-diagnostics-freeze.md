---
id: m2-pr39-slice-g5-diagnostics-freeze
status: accepted
last-reviewed: 2026-08-21
canonical: false
---

# Milestone #39 — Slice G5 diagnostics freeze

## Status

**COMPLETE / CLEAR.**

G5 freezes how the future first final cohort will be evaluated before any final-cohort life exists. It is evaluation-only and cannot alter G1–G4 production authority.

Closure record: [`m2-pr39-slice-g5-result.md`](m2-pr39-slice-g5-result.md).

## Exact authority

```text
artifacts/validation/m2-pr39/g/protocol/g5-evaluation-surfaces-v1.json
canonical digest  sha256:cedd203dbf45a933d2b3af5227931e7722db1d33ca43849933aac584c02e0712
Git blob          320c6bac5a462ffe8cc998514b6024ebaf9f0915

artifacts/validation/m2-pr39/g/protocol/g5-diagnostics-freeze-v1.json
canonical digest  sha256:4520357cab14bcdc883c6b3966401c98d17a1424e47f26e8c04002728d799ed5
Git blob          7c6a856d0650b3468bc988a4f5cbd2d96c7551c5
```

Maintainer verification at `de864de22deb6c15ebbd5513eb5edf06aa8f4765`:

```text
578 / 578 active tests pass
G5 DIAGNOSTICS FREEZE: VERIFIED
```

The first verifier run failed because of an incorrectly precomputed digest constant; the frozen protocol bytes never changed. That bookkeeping finding is preserved separately and the successful verifier computes the canonical digest from the exact pinned Git blob.

## Frozen evaluation design

### Runtime

```text
normalizer        openai/gpt-5.1-2025-11-13
primary rater     google/gemini-3.6-flash
sampling          temperature 0 / topP 1
randomization     deterministic SHA-256 rank ordering
```

The normalizer is an evaluation transform, not the judge. The blind primary rater does not see WorldSpecs, compiler prompts or build-time diagnostics; genome text is visible only in explicit D3 genome discrimination.

### D1 — life attribution

Primary: normalized deidentified attribution.

```text
0–2 / 5   weak/inconclusive
3 / 5     suggestive
4–5 / 5   strong
```

Raw deidentified attribution is shortcut-sensitivity characterization only.

### D2 — sentiment coupling

Event valence and current durable-meaning valence are rated separately. Primary statistic is Spearman correlation across durable meaning records, with leave-one-Thread-out stability reported.

Minimum analyzability:

```text
>= 8 durable meaning records
>= 3 Threads represented
```

G6 owns the blocking semantics and must not turn this minimum into a hidden meaning-count quota.

### D3 — genome propagation

Primary comparisons follow G3-v2 exactly and are analyzed separately:

```text
ordinal 3 / horizon 6
ordinal 6 / horizon 10
```

Only the five G2-measured cycle edges have ceiling-aware interpretation:

```text
(1,2) (2,3) (3,4) (4,5) (5,1)
```

Pair `(3,4)` carries its G2 measured-low/inconclusive ceiling. Clean ordinals 1 and 2 are evaluated as true `life_only_unexposed` negative controls. `life_only_exposed` remains descriptive and horizon-confounded.

### D4 — life funnel

Mechanical characterization only. No quota.

### D5 — self-account overreach

Blindly asks which materially relevant historical items are not accommodated by current remembered meanings. Unexplained residue is allowed; perfect self-explanation may be suspicious.

## Boundary

```text
G5       COMPLETE / CLEAR
G6       NEXT / verdict freeze
H        FORBIDDEN until G6 + blocking Gate-G CLEAR
```
