---
id: m2-pr39-slice-g2-cohort-genome-freeze
status: in_progress
last-reviewed: 2026-08-20
canonical: false
---

# Milestone #39 — Slice G2 cohort genome freeze

## Status

**G2 IN PROGRESS — genome bytes, lineage provenance, content-independent World assignment, pair schedule, models and decision rule are frozen before specificity-ceiling output. Live ceiling execution is next.**

G1 is COMPLETE / CLEAR. No final-cohort life exists and none is authorized by this stage.

## Scientific boundary

G2 asks one narrow pre-life question:

> Are the actual frozen cohort genomes semantically distinguishable enough, when directly visible, that later H genome-propagation results can be interpreted?

This is a **specificity ceiling**, not evidence that the genome has already shaped history, memory, meaning, judgment or behavior.

The Slice-B hand-authored controls remain instrument history. G2 freezes the denominator for the actual five-member cohort.

## Pre-control correction preserved

The first machine-readable G2 manifest was:

```text
artifacts/validation/m2-pr39/g/protocol/g2-cohort-genome-freeze-v1.json
```

It was created before any G2 model output, but it contained an overly strong provenance sentence: it said the protocol author had no visibility into the G1 World content while authoring loci.

That was not literally true. The author had seen the G1 Worlds in the surrounding development context, even though the loci were deliberately written as non-geographic conditional symbolic possibilities rather than derived from those Worlds.

The v1 manifest is therefore **preserved, superseded pre-control evidence**. It was not silently rewritten.

No G2 pair result or aggregate result existed when the problem was caught.

Current authority is:

```text
artifacts/validation/m2-pr39/g/protocol/g2-cohort-genome-freeze-v2.json
```

V2 preserves every already-frozen genome and parent byte exactly, records World-context visibility truthfully, and removes residual author discretion over World↔genome pairing through a deterministic assignment rule before any ceiling output.

## Freeze ordering

Historical ordering:

```text
G1-v2 Worlds frozen + familiarity accepted
  -> no cohort genome existed yet
G2 genome loci + lineage bundles frozen
  -> v1 manifest recorded an overstrong blindness witness
  -> still zero G2 ceiling output
v2 provenance correction
  -> all genome bytes unchanged
  -> deterministic within-origin World↔genome assignment frozen
  -> pair schedule/models/thresholds frozen
  -> only now may specificity-ceiling calls run
```

No G2 result existed when any locus, lineage seed, provider/model, pair or decision threshold was chosen. The v2 assignment itself is mechanically reproducible from already-frozen digests.

## Truthful authorship witness

V2 records:

```text
World context available to locus author          yes
World content used as locus generation input     no
final-life output visible                        no
H diagnostic output visible                      no
adult role / benchmark target visible            no
demographic/geographic shortcut into loci        no
```

The claim is therefore **not** that the human author was cognitively blind to the Worlds. The stronger enforceable protection is that the final World/genome pairing is no longer chosen semantically by that author.

## Content-independent World↔genome assignment

The five genome artifacts retain their original `genomeSourceSlot` only as frozen artifact identity. The cohort `slot` is the G1 World slot.

Within each G1-frozen origin class (`de_novo` and `synthetic_lineage`) V2:

1. hash-ranks frozen Worlds from only `seed + kind=world + worldSpecDigest`;
2. hash-ranks frozen genomes from only `seed + kind=genome + genomeDigest`;
3. applies cyclic offset `+1` within that origin class;
4. pairs those ranks.

Seed:

```text
pr39-g2-world-genome-assignment-v2
```

Mapping:

```text
cohort World slot 1  <- frozen genome source slot 4
cohort World slot 2  <- frozen genome source slot 5
cohort World slot 3  <- frozen genome source slot 1
cohort World slot 4  <- frozen genome source slot 3
cohort World slot 5  <- frozen genome source slot 2
```

Mapping digest:

```text
sha256:0388246fe95037ca2191e10f9e94dbafc1efb239f5bb865bbf06da27c264b05e
```

This preserves the exact G1 origin composition while deliberately breaking the original authoring-time association. The execution guard independently recomputes the hash ranks, cyclic assignment and mapping digest before any model call.

## Machine-readable authority

```text
artifacts/validation/m2-pr39/g/protocol/g2-cohort-genome-freeze-v2.json
```

Execution guard:

```text
tools/genesis/genesis-cohort-genome-ceiling.mjs
```

Before any model call it verifies:

- the v2 supersession/provenance boundary;
- all five accepted G1 WorldSpec canonical digests;
- all five cohort symbolic-genome digests;
- all four synthetic-parent genome digests;
- exact Thread owner/genesis bindings;
- six contiguous atomic textual loci per genome;
- the deterministic within-origin World/genome assignment;
- both deterministic recombination selections;
- zero G2 mutations;
- exact `3 + 3` parent contribution for each lineage child;
- five unique control edges;
- every assigned cohort genome appears exactly once as candidate A and once as candidate B;
- exact frozen instrument version, provider/models and call count.

Any drift fails before provider execution.

## Frozen assigned cohort

| Cohort slot | World | Origin | Genome source slot | Assigned genome digest |
| --- | --- | --- | ---: | --- |
| 1 | Cần Thơ, Vietnam | `de_novo` | 4 | `sha256:57e45ea7d518a9fdc9c2e1c3594e5ce2f839a33e8f36d9db8d0476bc4d6e07b0` |
| 2 | Łódź, Poland | `synthetic_lineage` | 5 | `sha256:f8cb20995c54843d4c0bef9a171b830e79cad8a9f0819ab1b9e151fbadadcadb` |
| 3 | Cusco, Peru | `de_novo` | 1 | `sha256:4ec9592b7e065bdde4e63ebb0c70b4c5f9752b43f6f5f87ec45961a373ff20ad` |
| 4 | Accra, Ghana | `de_novo` | 3 | `sha256:32248f3d909e102fc2865fa29522cdfea09585ca2d7ad9915014a842c1a483fc` |
| 5 | Greater Sudbury, Ontario, Canada | `synthetic_lineage` | 2 | `sha256:548357c6563e7b7a21f9377673be62f5441b16c070d7af01cf5adaa926bad73f` |

The original five genome artifacts were not edited to produce this mapping.

## Synthetic lineages after assignment

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

Every child locus names the exact source genome and source locus. The execution guard replays v1 crossover selection instead of trusting the copied child values.

## Why five pair controls

The existing `genesis-genome-specificity-control-v3` is a two-genome, 24-trial 2AFC instrument. A five-member cohort creates ten possible unordered pairs.

G2 freezes a five-edge cycle rather than:

- cherry-picking one visually promising pair;
- choosing pairs after seeing output; or
- spending ten full pairwise controls when the methodological requirement is a usable cohort-wide ceiling.

Frozen cycle over **assigned cohort slots**:

```text
p01  slot 1 A  vs slot 2 B
p02  slot 2 A  vs slot 3 B
p03  slot 3 A  vs slot 4 B
p04  slot 4 A  vs slot 5 B
p05  slot 5 A  vs slot 1 B
```

Every assigned genome is tested against two neighbors and appears exactly once in each candidate role.

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

The runner is resume-safe. Each completed pair result is written immediately. A later provider/quota failure preserves already completed pair evidence; rerunning verifies and reuses exact matching pair artifacts rather than overwriting them.

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

Existing v3 per-pair bands remain unchanged:

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
every one of the five assigned cohort genomes is incident to at least one detectable pair
```

Otherwise G2 is `HOLD`.

A HOLD means:

> Preserve the result. Do not rewrite the same frozen genomes, swap pairs or tune loci to chase a ceiling after seeing output.

A different design would require an explicit newly versioned experiment and scientific justification.

The runner reports pooled 120-trial accuracy only as a descriptive summary. It deliberately claims no pooled inferential p-value because the pairs are heterogeneous and each genome appears in two controls. Pair-level exact binomial results remain valid within the frozen v3 instrument.

## Verification before live execution

Active regression:

```text
tools/genesis/genesis-cohort-genome-ceiling.test.mjs
```

It checks:

- the actual committed v2 packet verifies mechanically;
- the assignment mapping and derivation replay exactly;
- both lineage children replay to `3/3` parent contributions;
- exact once-as-A / once-as-B pair-role balance;
- a 3-pair result covering all five genomes => CLEAR;
- fewer than three detectable pairs => HOLD;
- three detectable pairs leaving one genome uncovered => HOLD;
- no pooled aggregate binomial p-value is emitted.

## Authorized next command

After pulling the branch and getting `npm test` green:

```bash
npm run genesis:g2-genome-ceiling
```

No provider/model flags are accepted for normal execution; the frozen protocol owns them.

After the run, preserve every emitted pair/aggregate artifact before interpretation.

## Current boundary

```text
G1                 COMPLETE / CLEAR
G2 v1 manifest     PRESERVED / SUPERSEDED PRE-CONTROL
G2 v2 inputs       FROZEN
G2 result          PENDING live specificity-ceiling execution
G3-G6              BLOCKED on prior G steps
H                   FORBIDDEN until Gate G CLEAR
```

No final-cohort life-generation call is authorized.
