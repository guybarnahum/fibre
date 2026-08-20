---
id: m2-pr39-slice-g2-cohort-genome-freeze
status: clear
last-reviewed: 2026-08-20
canonical: false
---

# Milestone #39 — Slice G2 cohort genome freeze + five-pair ceiling

## Status

**G2 COMPLETE / CLEAR — the frozen cohort genomes have a usable five-pair textual-distinguishability ceiling for the five measured pairs, with one pair-specific inconclusive edge.**

G1 is COMPLETE / CLEAR. No final-cohort life exists and none is authorized by G2.

Hostile review result: [`m2-pr39-slice-g2-review-result.md`](m2-pr39-slice-g2-review-result.md).

Post-result machine-readable interpretation bounds:

```text
artifacts/validation/m2-pr39/g/results/g2-five-pair-ceiling-interpretation-v1.json
```

## Scientific claim

G2 asks one narrow pre-life question:

> Are the actual frozen cohort genomes distinguishable enough in their direct effect on generated responses that later H genome-propagation results can be interpreted on the measured pairs?

The answer is **yes for four of five measured edges, with one measured-low/inconclusive edge**.

The precise G2 claim is:

> **The frozen cohort genomes have a usable five-pair textual-distinguishability ceiling under the cross-provider control.**

Do not shorten this to an unqualified “cohort-genome specificity ceiling.” G2 does not cover all ten pairwise combinations and does not by itself prove semantic specificity.

G2 is not evidence that genome has already shaped history, memory, meaning, judgment or behavior.

## Preserved pre-control correction

The first G2 machine-readable manifest remains preserved:

```text
artifacts/validation/m2-pr39/g/protocol/g2-cohort-genome-freeze-v1.json
```

It was created before any G2 model output but overstated human World-context blindness by saying the protocol author had not seen the G1 Worlds while authoring loci.

That was corrected **before any G2 ceiling output existed**. V1 remains preserved rather than rewritten.

Current pre-control authority is:

```text
artifacts/validation/m2-pr39/g/protocol/g2-cohort-genome-freeze-v2.json
```

V2:

- preserves every already-frozen genome/parent byte;
- records that the author had seen the Worlds;
- records that World content was not used as locus-generation/selection input;
- deterministically deranges World↔genome assignment within origin class using only frozen digests and a frozen seed;
- freezes pair schedule, providers/models and decision thresholds before any G2 result.

## Frozen World↔genome assignment

Seed:

```text
pr39-g2-world-genome-assignment-v2
```

Mapping:

```text
Cần Thơ         <- genome source slot 4
Łódź            <- genome source slot 5
Cusco           <- genome source slot 1
Accra           <- genome source slot 3
Greater Sudbury <- genome source slot 2
```

Mapping digest:

```text
sha256:0388246fe95037ca2191e10f9e94dbafc1efb239f5bb865bbf06da27c264b05e
```

The execution guard independently recomputes this assignment before model execution.

## Synthetic lineage integrity

### Cohort slot 2 <- genome source slot 5

```text
parent A digest   sha256:39736a04d5b4454cd5d3d137e6d90232653e3c8ead8251567ca19398e2040d3e
parent B digest   sha256:9e9fbfb2e38463144c4743a2d35e666c10e31400eab76a0ff6c52f768e0a08b6
selection seed    pr39-g2-slot5-lineage-v1
contribution      3 loci A + 3 loci B
mutations         0
```

### Cohort slot 5 <- genome source slot 2

```text
parent A digest   sha256:e650b92cb66fbc85ecf1b1c03b64b144643193932084646be8890a0ed7922bc7
parent B digest   sha256:2839902cedc39c4740a927165bc656a4ad5d75b8392cb99028f6a7f9847cadcd
selection seed    pr39-g2-slot2-lineage-v1
contribution      3 loci A + 3 loci B
mutations         0
```

Every inherited child locus names its exact source genome and source locus. The G2 guard replays recombination rather than trusting copied child values.

## Frozen five-pair design

The existing `genesis-genome-specificity-control-v3` is a two-genome, 24-trial 2AFC instrument.

G2 froze one five-edge cycle over assigned cohort slots:

```text
p01  (1,2)
p02  (2,3)
p03  (3,4)
p04  (4,5)
p05  (5,1)
```

Every assigned genome is tested twice and appears exactly once as A and once as B.

The unmeasured complementary five-cycle is:

```text
(1,3) (1,4) (2,4) (2,5) (3,5)
```

Those pairs have **no G2 ceiling**. Specificity may not be generalized to them by assertion.

## Frozen provider split

```text
generator  google/gemini-3.6-flash
rater      openai/gpt-5.1-2025-11-13
```

The split avoids the same-model self-recognition bound from the original Slice-B same-model run. Shared language/training priors remain a residual interpretation bound.

## Frozen CLEAR rule

Per-pair v3 bands remain unchanged:

```text
20–24 / 24  strong_ceiling_signal
17–19 / 24  detectable_moderate_ceiling
13–16 / 24  inconclusive_near_chance
 0–12 / 24  no_positive_ceiling_signal
```

A pair is detectable at `>=17/24`.

The predeclared G2 rule was:

```text
at least 3 of 5 pairs detectable
AND
every genome incident to at least one detectable pair
```

Under a reference independent-edge chance model:

```text
P(pair >=17/24)                     0.0319573283
P(at least 3 of 5 detectable)       0.0003109259
P(frozen CLEAR rule incl coverage)  0.0001580038
```

These figures were recomputed after the result and are reference arithmetic only. They do not assert empirical edge independence.

## Live result

Preserved artifacts:

```text
artifacts/validation/m2-pr39/g/results/g2-genome-ceiling-p01-v1.json
artifacts/validation/m2-pr39/g/results/g2-genome-ceiling-p02-v1.json
artifacts/validation/m2-pr39/g/results/g2-genome-ceiling-p03-v1.json
artifacts/validation/m2-pr39/g/results/g2-genome-ceiling-p04-v1.json
artifacts/validation/m2-pr39/g/results/g2-genome-ceiling-p05-v1.json
artifacts/validation/m2-pr39/g/results/g2-cohort-genome-specificity-ceiling-v1.json
```

Observed result:

```text
p01  23/24  strong_ceiling_signal
p02  19/24  detectable_moderate_ceiling
p03  15/24  inconclusive_near_chance
p04  21/24  strong_ceiling_signal
p05  21/24  strong_ceiling_signal

detectable pairs  4/5
aggregate          99/120 = 82.5% descriptive only
verdict            CLEAR
```

The aggregate 120-trial accuracy is descriptive only. Pairs share genomes and are heterogeneous, so no pooled inferential p-value is claimed.

## Per-genome edge profile

The observed useful coverage evidence is:

```text
slot 1  p01=23  p05=21
slot 2  p01=23  p02=19
slot 3  p02=19  p03=15
slot 4  p03=15  p04=21
slot 5  p04=21  p05=21
```

With exactly one failing edge on a five-cycle, vertex coverage is automatic. Therefore `coverage 1,2,3,4,5` must not be presented as an independent empirical success in this run.

The per-genome profile is the meaningful fact: no individual genome is inert as text on both measured edges.

## p03 interpretation constraint

```text
p03  slots 3 vs 4  15/24  p=0.153728...  inconclusive
```

This is **not evidence of non-difference** and is not evidence that genome 3 or genome 4 is individually weak.

Slot 3 is detectable against slot 2 (`19/24`). Slot 4 is strong against slot 5 (`21/24`). The weak observation therefore belongs to the **3/4 pair**.

H constraint:

> A null or weak Thread-3 / Thread-4 H result is uninformative about failure of lived-history or genome propagation because the direct-visibility G2 ceiling for that pair was itself inconclusive.

Do not rewrite either genome or rerun p03 merely to chase significance.

## H scope policy

For #39 v1:

> **H may use G2 as a genome-specificity ceiling only for p01–p05.**

The five unmeasured pairs may be examined descriptively, but they may not receive G2-normalized genome-specificity interpretation unless a separately frozen complementary-cycle experiment is run first.

We do **not** run that complementary cycle merely for completeness before G3. It becomes necessary only if H later requires ceiling-backed inference on one of the unmeasured pairs.

## Lexical-overlap follow-up

The G2 instrument deliberately measures direct visible-text distinguishability. It cannot by construction prove that the signal is semantic rather than literal/surface-level.

A post-hoc no-model-call diagnostic is added:

```text
tools/genesis/genesis-g2-lexical-overlap.mjs
npm run genesis:g2-lexical-overlap
```

It measures exact normalized distinctive-token reuse and association with blind-rater correctness.

This follow-up is:

```text
post-hoc
observational
non-gating
```

It may bound how surface-level G2 is. It may not become a new success criterion after seeing the result and may not upgrade G2 from textual distinguishability to semantic specificity.

## Review resolution

Hostile external review: **CLEAR**, with bounded interpretation corrections recorded in [`m2-pr39-slice-g2-review-result.md`](m2-pr39-slice-g2-review-result.md).

Resolved:

```text
[x] five-pair scope explicit
[x] unmeasured complementary cycle explicit
[x] H inference restricted to measured pairs
[x] p03 pair-specific warning machine-recorded
[x] per-genome edge profile replaces misleading coverage-as-achievement framing
[x] lexical-overlap diagnostic implemented
[ ] lexical-overlap result preserved locally/remotely
```

## Current boundary

```text
G1                 COMPLETE / CLEAR
G2 raw result       COMPLETE / CLEAR
G2 hostile review  CLEAR
G2 lexical check    PENDING observational no-model execution
G3                  NEXT after lexical artifact preservation
G4-G6               BLOCKED on prior G steps
H                   FORBIDDEN until Gate G CLEAR
```

No final-cohort life-generation call is authorized.
