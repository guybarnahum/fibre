---
id: validation-m2-pr39-slice-e2-n1-v2-residue-amendment
status: candidate
last-reviewed: 2026-08-19
canonical: false
---

# Milestone #39 — Slice E2 N1 v2 not-remembered residue amendment

Status: **post-score mechanical amendment; frozen after trial 1 and before any later N1-v2 trial is scored**

## What happened

N1-v2 began under the bounded Pass-B execution profile:

```text
source: fibre-m2-pr39-slice-e2-a2b-v3.json
scientific protocol: pr39-slice-e2-n1-downstream-fertility-v1
evidence version: pr39-slice-e2-n1-v2
Pass-B rememberedContent model-facing ceiling: 600 characters
positive threshold: 13 / 18
```

Trial 1 completed normally:

```text
world: E2-D1
pair: 1
horizon: 6
memory: remembered
meaning: durable_meaning
blind-rater choice: B
truth: B
score after trial 1: 1 / 1
```

The rater grounded the choice in concrete remembered details from episodes 1, 5 and 6 rather than identifier or provenance metadata. This single result is retained exactly; no aggregate Rich-Life inference is made from one trial.

Trial 2 then returned the following Pass-B semantic decision:

```json
{
  "outcome": "not_remembered",
  "episodeRefs": [],
  "rememberedContent": null,
  "uncertainty": [
    "...explanatory statements about why no memory was inferred..."
  ]
}
```

Canonical Pass B correctly rejected this record because `not_remembered` permits no authored memory residue:

```text
not_remembered Pass-B output must not author memory uncertainty
```

No Pass-C or rater call ran for trial 2 before the failure.

## Why N1-v2 must resume rather than restart

Unlike N1-v1, N1-v2 already has one valid scored trial.

Therefore:

- trial 1 must not be regenerated;
- the 18-trial plan must not be rerolled;
- the 13/18 threshold must not change;
- trial 2's `not_remembered` semantic decision must not be regenerated for quality;
- the failed checkpoint remains evidence.

Starting a fresh N1-v2 after observing trial 1's score would discard valid scored evidence and create an avoidable selection channel.

## Canonical rule

For `outcome = not_remembered`, canonical Pass B requires exactly:

```json
{
  "outcome": "not_remembered",
  "episodeRefs": [],
  "rememberedContent": null,
  "uncertainty": []
}
```

The model's trial-2 record already satisfied the first three conditions and failed only because `uncertainty` was non-empty.

## Mechanical canonicalization

The continuation adds:

```text
policy: n1-not-remembered-residue-canonicalization-v1
```

It applies only when all of the following are true:

1. the N1-v2 checkpoint failed on exactly `not_remembered Pass-B output must not author memory uncertainty`;
2. raw `outcome` is exactly `not_remembered`;
3. raw `episodeRefs` is exactly empty;
4. raw `rememberedContent` is exactly `null`;
5. raw `uncertainty` is a non-empty array.

When those conditions hold, Fibre deterministically substitutes only:

```text
uncertainty -> []
```

No model call is made. The memory decision is unchanged. The original provider output remains in evidence.

If the raw record cites any episode, carries non-null remembered content, has another failure, or otherwise differs from the narrow condition above, the canonicalization is unavailable and N1 fails normally.

## Evidence requirements

Every such canonicalization records:

- trial ordinal;
- policy identifier;
- original provider-output digest;
- canonical output digest;
- complete original output;
- complete canonical output;
- `modelCallUsed: false`;
- `semanticDecisionChanged: false`.

A completed trial that used this mapping additionally exposes `passB.formCanonicalization` with the provider raw-output digest and canonical digest so the core driver's historical `rawOutputDigest` field cannot be mistaken for the provider's actual raw payload.

## Scientific status

This amendment is explicitly **post-score**:

```text
score observed before amendment: 1 / 1
```

It is nevertheless mechanically conservative because it:

- cannot change a remembered decision into not-remembered or vice versa;
- cannot change cited episodes;
- cannot author autobiographical content;
- cannot create a Pass-C input for a not-remembered trial;
- removes explanatory residue that could otherwise become an unintended rater signal;
- leaves trial assignment, source history, candidate order and threshold untouched.

The post-score timing must remain visible in hostile review. If later review judges even this deterministic form mapping to compromise the N1 estimand, N1-v2 is discarded as a diagnostic rather than retrospectively reinterpreted.

## Test-count discipline

No new test case is added. The existing N1 protocol test is strengthened to verify that the canonicalization is available only for the exact narrow shape above and refuses a `not_remembered` record that cites an episode.
