---
id: m2-pr39-slice-g5-diagnostics-freeze
status: frozen_pending_verification
last-reviewed: 2026-08-21
canonical: false
---

# Milestone #39 — Slice G5 diagnostics freeze

## Purpose

G5 freezes **how the future five-life cohort will be judged before those lives exist**.

It is evaluation-only. It may not generate a final life or change any G1–G4 authority.

Current machine-readable authority:

```text
artifacts/validation/m2-pr39/g/protocol/g5-evaluation-surfaces-v1.json
sha256:cedd203dbf45a933d2b3af5227931e7722db1d33ca43849933aac584c02e0712
Git blob: 320c6bac5a462ffe8cc998514b6024ebaf9f0915

artifacts/validation/m2-pr39/g/protocol/g5-diagnostics-freeze-v1.json
sha256:6beb0ba589ca2940d72e2d0cd88b0343aeb3ef73537be9669fbc36fc81cde11e
```

G5 binds exact verified G3-v2 and G4-v2:

```text
G3-v2  sha256:aef6eea69cf55cc60e730a3529fd0e7d090261cd6535b256df6cbd3734174fae
G4-v2  sha256:50c2f5bcbb1a3470a685f75257fd004c516ca04a67a3b21b367dbf73e58ade20
```

The G3/G4 amendments were maintainer-verified at `54f2dcfff35430c741d44cba5993d0be797a9edd` with 573/573 active tests before G5 authoring.

## Evaluation runtime

### Normalization transform

```text
provider/model  openai/gpt-5.1-2025-11-13
role            evaluation transform only; not the judge
sampling        temperature 0 / topP 1
```

The normalizer sees only already-deidentified records. It does not see WorldSpecs, genomes, compiler prompts, build-time diagnostics or Thread identity labels.

It neutralizes obvious setting/prose shortcuts while preserving only explicit lived route, observable action, relationship role, tension, uncertainty and unresolved residue. It may not infer personality, values, significance, cause, motive, maturity or lessons.

### Primary blind rater

```text
provider/model  google/gemini-3.6-flash
sampling        temperature 0 / topP 1
```

The primary rater has no access to WorldSpecs, compiler prompts or build-time diagnostics. Genome text is forbidden except in D3, where it is the explicit discrimination surface.

If the frozen rater becomes operationally unavailable after H starts, preserve partial evaluation and HOLD. Do not swap raters after seeing partial results.

## Deterministic randomization

All query order, candidate order and opaque labels use:

```text
sha256_rank_v1
seed domain: pr39-g5-final-cohort-diagnostics-v1
```

No adaptive rerandomization is permitted.

## D1 — life attribution

Primary condition: **normalized**.

Secondary condition: raw deidentified text.

For each Thread, the rater receives its current autobiography/meaning packet as the query and all five historical-life packets as opaque candidates. IDs and direct refs are removed. Normalized trials additionally remove setting/style shortcuts.

Five independent query trials per condition; 5-way chance = 20%.

Frozen bands:

```text
0–2 / 5   weak or inconclusive
3 / 5     suggestive
4–5 / 5   strong
```

Reference chance arithmetic:

```text
P(>=3/5 | chance) = 0.05792
P(>=4/5 | chance) = 0.00672
```

The normalized condition is the primary particular-life result. Raw is shortcut sensitivity.

Slots 2 and 4 remain the convergent pair. Agreement of conclusion is never penalized if route/tension/residue remain attributable.

## D2 — sentiment coupling

Historical events and current durable meaning parts are rated in separate blinded surfaces on `-3..+3` valence.

For each durable meaning record:

- event side = mean valence of its cited admitted historical episodes;
- meaning side = mean valence of its current effective meaning parts.

Primary statistic: Spearman rank correlation across durable meaning records.

Minimum analyzability:

```text
>= 8 durable meaning records
>= 3 Threads represented
```

Otherwise D2 is inconclusive; never regenerate.

Frozen positive-coupling bands:

```text
rho <= .35        low / no positive coupling
.35 < rho < .60   moderate
.60 <= rho < .75  high warning
rho >= .75        very high warning
```

Report the exact leave-one-Thread-out Spearman range. If it crosses two or more bands, mark the reading unstable.

D2 is characterization/warning until G6 decides blocking semantics.

## D3 — genome propagation

D3 obeys the hostile-review G3-v2 amendment. The primary treatment comparison is **between Threads at a fixed call ordinal**, never a horizon-confounded between-stratum causal contrast.

Primary treatment ordinals are analyzed separately:

```text
ordinal 3   horizon 6
ordinal 6   horizon 10
```

For each deidentified, setting-normalized Pass-B outcome, the blind rater scores all five cohort genomes as opaque A–E candidates. Fibre converts each row's scores to within-row rank points `5..1`, averaging ties. Raw score scale is never compared across outputs.

Only the five G2-measured edges receive ceiling-normalized interpretation:

```text
(1,2) (2,3) (3,4) (4,5) (5,1)
```

The complementary five pairs have no G2 ceiling.

For one measured pair at one fixed ordinal, compare matched versus swapped rank-point sums. Five edges are judged per ordinal.

Frozen ordinal bands:

```text
5 / 5 correct   detectable reference
4 / 5           suggestive
0–3 / 5         inconclusive
```

The binomial numbers for five fair independent edges are recorded only as references because the edges share outputs/genomes:

```text
P(5/5)      .03125
P(>=4/5)    .1875
```

### Clean negative control

Ordinals 1 and 2 are true `life_only_unexposed` calls and are evaluated separately.

```text
0–3 / 5   no detectable negative-control signal
4 / 5     watch
5 / 5     warning
```

Emit `NEGATIVE_CONTROL_FAILURE_SIGNAL` for G6 if either clean ordinal is 5/5 or both are at least 4/5.

### Exposed propagation

`life_only_exposed` remains mechanically derived only from an admitted earlier treatment memory. Minimum interpretation cell remains:

```text
>= 6 calls
>= 3 Threads
```

Report correct-genome top-1, mean reciprocal rank and measured-pair decisions where both endpoints are exposed at the same ordinal. This is descriptive only; it may not be promoted into the horizon-confounded within-Thread causal comparison Claude rejected.

G2 pair `(3,4)` remains measured-low/inconclusive. A D3 null there cannot establish propagation failure.

## D4 — life funnel

No rater and no quota.

Per Thread report:

```text
historical events
remembered outcomes
current durable meanings
current multi-part meanings
current ambivalent multi-part meanings
```

A multi-part meaning is characterized as ambivalent only if its primary D2 part-valence includes at least one `<= -1` and one `>= +1` part.

## D5 — self-account overreach

The rater receives normalized H1..H10 plus normalized current meanings with citations/refs removed.

For each historical item it judges whether the item is materially relevant to current self-account and, if material, whether current meanings accommodate it.

Derived per-Thread classes:

```text
substantial_residue          >=3 material unaccommodated items
some_residue                 1–2 material unaccommodated items
near_total_self_explanation  >=2 material items and zero unaccommodated
insufficient_material_history <2 material items
```

Cohort warning bands:

```text
0–2 near-total Threads   no cohort overreach warning
3                       warning
4–5                     strong warning
```

Unexplained residue is allowed and expected. D5 does not reward a perfectly coherent biography.

## Secondary characterization

Freeze and report, without admission floors:

- offered/instantiated structures;
- structure-grounded/world-emergent events;
- developmental-window counts;
- mechanically supported access-route categories;
- social/conversational availability and use;
- place reach against WorldSpec affordances;
- recurring/new participants;
- normalized 4-gram repetition/narrative inertia;
- intellectual encounter availability/use;
- reinterpretation eligible/run/skipped and revised/unchanged/none;
- all Pass-A repair/retry counts;
- Pass-B genome-copy retry counts;
- repair exhaustion / candidate failure;
- prose length variance;
- cross-Thread normalized lexical overlap / monoculture.

None becomes a hidden quality gate.

## Verification

Run before G6:

```bash
npm test
npm run genesis:g5-verify
```

The verifier makes zero model calls and checks:

- G3-v2/G4-v2 exact digests;
- empty final-cohort artifact boundary;
- evaluation surface digest + Git blob;
- rater/normalizer runtime bindings;
- D1 chance arithmetic and bands;
- D2 minimum cell/statistic;
- D3 primary ordinals/horizons against G3-v2;
- G2 five-pair ceiling scope;
- D3 negative-control rule;
- D4/D5 non-gating posture;
- deterministic SHA-256 randomization.

## Boundary

```text
G1       COMPLETE / CLEAR
G2       COMPLETE / CLEAR — five-pair textual ceiling
G3-v2    COMPLETE / CLEAR
G4-v2    COMPLETE / CLEAR
G5       FROZEN — pending local verifier
G6       BLOCKED on G5 verification
H        FORBIDDEN until G6 + blocking Gate-G CLEAR
```
