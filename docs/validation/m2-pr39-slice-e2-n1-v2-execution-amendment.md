---
id: validation-m2-pr39-slice-e2-n1-v2-execution-amendment
status: candidate
last-reviewed: 2026-08-19
canonical: false
---

# Milestone #39 — Slice E2 N1 v2 execution amendment

Status: **pre-score mechanical execution amendment; frozen before N1-v2 model use**

This document records why the first N1 execution is permanently abandoned and what changes for the next execution.

## What happened

The frozen N1 scientific protocol began against:

```text
source: fibre-m2-pr39-slice-e2-a2b-v3.json
trials: 18
horizons: 6, 8, 10
positive threshold: 13 / 18
model: gpt-5.1-2025-11-13
```

Trial 1 reached Pass B and returned `remembered`, but canonical Pass-B validation rejected the record because:

```text
MemoryFormation.rememberedContent exceeds 2048 UTF-8 bytes
```

No Pass C call, blind-rater call, or scored N1 trial had completed.

A bounded record-form repair wrapper was then attempted. It correctly froze the original memory decision and allowed only `rememberedContent` to change, but both permitted repairs still exceeded the same canonical byte bound. The wrapper therefore terminated with:

```text
record_repair_exhausted
```

The failed N1-v1 artifact remains burned mechanical evidence. It must not be resumed again and its repair cap must not be extended after exhaustion.

## Scientific status at amendment time

Before this amendment:

```text
completed/scored N1 trials: 0 / 18
Pass-C outputs observed: 0
blind-rater outputs observed: 0
N1 score observed: no
```

Therefore no result-dependent scientific choice is being made here.

## N1-v2 execution profile

The scientific protocol remains unchanged:

- exact A2b-v3 source artifact;
- same 18 frozen source-life/pair/horizon assignments;
- same source orientation and A/B balance;
- same `life_only_unexposed` Pass-B boundary;
- same Pass-C initial-meaning boundary;
- same blind-rater task;
- same 13/18 positive threshold;
- same no-rerun-for-quality rule.

Only the model-facing Pass-B form contract changes.

N1-v2 adds:

```text
execution profile: n1-pass-b-bounded-output-v1
model-facing rememberedContent maximum: 600 characters
canonical Fibre maximum: 2048 UTF-8 bytes
```

The 600-character ceiling is a conservative form margin below the canonical byte gate. It is not a quality target and is applied identically to every N1-v2 Pass-B call.

The Pass-B prompt additionally states that the bounded content must contain the concrete recollection rather than a summary of the visible life.

The response schema records the same 600-character ceiling. Canonical Pass-B normalization remains authoritative and unchanged.

## Evidence identity

The scientific protocol version remains:

```text
pr39-slice-e2-n1-downstream-fertility-v1
```

because the trial design and estimand are unchanged.

The new execution evidence version is:

```text
pr39-slice-e2-n1-v2
```

Every checkpoint/result records:

- the bounded Pass-B prompt hash;
- bounded Pass-B response-schema hash;
- execution-profile identifier;
- 600-character model-facing ceiling;
- unchanged canonical 2048-byte bound;
- explicit witness that the scientific protocol, trial plan and threshold did not change;
- explicit witness that no N1 score existed before this amendment.

## Fresh execution, not continuation

N1-v2 starts fresh from trial 1.

It must **not** resume the exhausted N1-v1 artifact. Carrying the v1 overlong memory into v2 would mix two different model-facing form contracts inside one scored diagnostic.

The failed v1 raw output and both failed repairs remain evidence only.

## Retired v1 repair code

The experimental v1 repair wrapper and its two N1-specific tests are removed after this amendment because they are no longer on a live execution path. The actual failure and repair-exhaustion evidence remain documented. The live bounded profile is frozen in the existing N1 protocol test rather than adding another test count.

## Interpretation boundary

N1-v2 is still only a downstream-fertility diagnostic.

A score at or above 13/18 is positive only if hostile inspection confirms that correct rater decisions are grounded in concrete lived material rather than identifier, formatting, provenance or generic-world leakage.

No N1-v2 result by itself freezes the production Genesis mechanism.
