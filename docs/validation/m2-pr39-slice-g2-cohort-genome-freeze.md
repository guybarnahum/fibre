---
id: m2-pr39-slice-g2-cohort-genome-freeze
status: in_progress
last-reviewed: 2026-08-20
canonical: false
---

# Milestone #39 — Slice G2 cohort genome freeze

## Status

**G2 IN PROGRESS — cohort genomes, synthetic-parent provenance, World assignment, pair schedule, models and decision rule are frozen before specificity-ceiling output. Live ceiling execution is next.**

G1 is COMPLETE / CLEAR. No final-cohort life exists and none is authorized by this stage.

## Scientific boundary

G2 asks one narrow pre-life question:

> Are the actual frozen cohort genomes semantically distinguishable enough, when directly visible, that later H genome-propagation results can be interpreted?

This is a **specificity ceiling**, not evidence that the genome has already shaped history, memory, meaning, judgment or behavior.

The Slice-B hand-authored controls remain instrument history. G2 freezes the denominator for the actual five-member cohort.

## Freeze ordering

The order is now historical fact:

```text
G1-v2 Worlds frozen + familiarity accepted
  -> no cohort genome existed yet
G2 protocol/world bindings authored
  -> five cohort genomes + four synthetic-parent genomes frozen
  -> deterministic lineage witnesses frozen
  -> five-pair control schedule + models + thresholds frozen
  -> only now may specificity-ceiling calls run
```

No G2 result existed when any locus, World/genome binding, lineage seed, pair, provider/model or decision threshold was chosen.

## Machine-readable authority

```text
artifacts/validation/m2-pr39/g/protocol/g2-cohort-genome-freeze-v1.json
```

The execution guard is:

```text
tools/genesis/genesis-cohort-genome-ceiling.mjs
```

Before any model call it recomputes and verifies:

- all five accepted G1 WorldSpec canonical digests;
- all five cohort symbolic-genome digests;
- all four synthetic-parent genome digests;
- exact Thread owner/genesis bindings;
- six contiguous atomic textual loci per genome;
- both deterministic recombination selections;
- zero G2 mutations;
- exact `3 + 3` parent contribution for each lineage child;
- five unique control edges;
- each cohort genome appears exactly once as candidate A and once as candidate B;
- exact frozen instrument version, provider/models and call count.

Any drift fails before provider execution.

## Frozen cohort

| Slot | World | Origin | Cohort genome digest |
| --- | --- | --- | --- |
| 1 | Cần Thơ, Vietnam | `de_novo` | `sha256:4ec9592b7e065bdde4e63ebb0c70b4c5f9752b43f6f5f87ec45961a373ff20ad` |
| 2 | Łódź, Poland | `synthetic_lineage` | `sha256:548357c6563e7b7a21f9377673be62f5441b16c070d7af01cf5adaa926bad73f` |
| 3 | Cusco, Peru | `de_novo` | `sha256:32248f3d909e102fc2865fa29522cdfea09585ca2d7ad9915014a842c1a483fc` |
| 4 | Accra, Ghana | `de_novo` | `sha256:57e45ea7d518a9fdc9c2e1c3594e5ce2f839a33e8f36d9db8d0476bc4d6e07b0` |
| 5 | Greater Sudbury, Ontario, Canada | `synthetic_lineage` | `sha256:f8cb20995c54843d4c0bef9a171b830e79cad8a9f0819ab1b9e151fbadadcadb` |

All cohort loci were authored without visibility into the assigned World's content, final-life output, H diagnostic output or adult target role/benchmark. Geography, nationality and culture did not mechanically author loci.

## Synthetic lineages

### Slot 2

```text
parent A digest   sha256:e650b92cb66fbc85ecf1b1c03b64b144643193932084646be8890a0ed7922bc7
parent B digest   sha256:2839902cedc39c4740a927165bc656a4ad5d75b8392cb99028f6a7f9847cadcd
selection seed    pr39-g2-slot2-lineage-v1
contribution      3 loci A + 3 loci B
mutations         0
```

### Slot 5

```text
parent A digest   sha256:39736a04d5b4454cd5d3d137e6d90232653e3c8ead8251567ca19398e2040d3e
parent B digest   sha256:9e9fbfb2e38463144c4743a2d35e666c10e31400eab76a0ff6c52f768e0a08b6
selection seed    pr39-g2-slot5-lineage-v1
contribution      3 loci A + 3 loci B
mutations         0
```

The child records name the exact source genome and source locus for every inherited locus. The execution guard replays the v1 crossover rather than trusting the child copy.

## Why five pair controls

The existing `genesis-genome-specificity-control-v3` is a two-genome, 24-trial 2AFC instrument. A five-member cohort creates ten possible unordered pairs.

G2 freezes a five-edge cycle rather than:

- cherry-picking one visually promising pair;
- choosing pairs after seeing outputs; or
- spending ten full pairwise controls when the methodological requirement is a usable cohort-wide ceiling.

Frozen cycle:

```text
p01  slot 1 A  vs slot 2 B
p02  slot 2 A  vs slot 3 B
p03  slot 3 A  vs slot 4 B
p04  slot 4 A  vs slot 5 B
p05  slot 5 A  vs slot 1 B
```

Every genome is therefore tested against two neighbors and appears exactly once in each candidate role.

Each pair independently uses the existing 24 neutral situations and exact 12/12 seeded candidate-position balance.

## Frozen provider split

```text
generator  google/gemini-3.6-flash
rater      openai/gpt-5.1-2025-11-13
```

This reuses the already-demonstrated cross-provider Slice-B configuration and reduces the same-model self-recognition bound.

Calls if all five pairs are new:

```text
24 trials/pair
48 generation calls/pair
24 blind rating calls/pair
72 calls/pair
5 pairs
360 model calls total
```

The runner is resume-safe. Each completed pair result is written immediately. A later provider/quota failure must preserve already completed pair evidence; rerunning verifies and reuses exact matching pair artifacts rather than overwriting them.

## Frozen result paths

```text
artifacts/validation/m2-pr39/g/results/g2-genome-ceiling-p01-v1.json
artifacts/validation/m2-pr39/g/results/g2-genome-ceiling-p02-v1.json
artifacts/validation/m2-pr39/g/results/g2-genome-ceiling-p03-v1.json
artifacts/validation/m2-pr39/g/results/g2-genome-ceiling-p04-v1.json
artifacts/validation/m2-pr39/g/results/g2-genome-ceiling-p05-v1.json
artifacts/validation/m2-pr39/g/results/g2-cohort-genome-specificity-ceiling-v1.json
```

The aggregate result may not overwrite an existing aggregate artifact.

## Predeclared interpretation

The existing v3 per-pair bands remain unchanged:

```text
20–24 / 24  strong_ceiling_signal
17–19 / 24  detectable_moderate_ceiling
13–16 / 24  inconclusive_near_chance
 0–12 / 24  no_positive_ceiling_signal
```

For G2, a pair is `detectable` at `>=17/24`.

The cohort ceiling is usable for H only if **both** are true:

```text
at least 3 of 5 pairs are detectable
AND
every one of the five cohort genomes is incident to at least one detectable pair
```

Otherwise G2 is `HOLD`.

A HOLD means:

> Preserve the result. Do not rewrite the same frozen genomes, swap pairs or tune loci to chase a ceiling after seeing output.

A different design would require an explicit newly versioned experiment and scientific justification.

The runner reports pooled 120-trial accuracy only as a descriptive summary. It deliberately does **not** claim one pooled binomial p-value because pairs are heterogeneous and each genome appears in two controls. Pair-level exact binomial results remain valid within the frozen v3 instrument.

## Verification before live execution

Active regression:

```text
tools/genesis/genesis-cohort-genome-ceiling.test.mjs
```

It checks:

- the real committed G2 packet verifies mechanically;
- both lineage children replay to `3/3` parent contributions;
- exact once-as-A / once-as-B pair-role balance;
- a 3-pair result covering all five genomes => CLEAR;
- fewer than three detectable pairs => HOLD;
- three detectable pairs leaving one genome uncovered => HOLD.

## Authorized next command

After pulling the branch and getting `npm test` green:

```bash
npm run genesis:g2-genome-ceiling
```

No provider/model flags are accepted for normal execution; the frozen protocol owns them.

After the run, preserve every emitted pair/aggregate artifact before interpretation.

## Current boundary

```text
G1           COMPLETE / CLEAR
G2 inputs    FROZEN
G2 result    PENDING live specificity-ceiling execution
G3-G6        BLOCKED on prior G steps
H            FORBIDDEN until Gate G CLEAR
```

No final-cohort life-generation call is authorized.
