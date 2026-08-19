---
id: validation-m2-pr39-slice-e2-n1-downstream-fertility-protocol
status: candidate
last-reviewed: 2026-08-19
canonical: false
---

# Milestone #39 — Slice E2 N1 downstream-fertility protocol

Status: **pre-run frozen development protocol**

Purpose: test whether the particular histories produced by the frozen A2b development artifact survive canonical memory selection and meaning formation strongly enough that a blind rater can distinguish which same-world life produced them.

## Claim under test

A life is not rich merely because its event list differs from another life.

N1 asks the downstream question:

> when canonical Pass B is run in `life_only` / genome-unexposed mode and canonical Pass C is run from that memory alone, does the resulting autobiographical memory/meaning bundle retain enough concrete lived specificity to identify its source history above chance?

This is a **diagnostic of experiential fertility**, not an admission gate and not a new authority class.

## Frozen source

Use exactly the completed development artifact:

```text
fibre-m2-pr39-slice-e2-a2b-v2.json
arm: A2b_plausibility_surface_seeded_contingency
worlds: E2-D1, E2-D2
lives/world: 3
episodes/life: 10
```

The source artifact is development-only and burned for final-cohort use.

N1 must not regenerate, repair, filter, rank or otherwise alter any A2b life.

## Canonical B/C boundary

### Pass B

Each trial runs canonical Pass-B validation/projection with:

```text
formationMode: life_only
priorTreatmentMemoryExposure: false
analysisStratum: life_only_unexposed
genomeExposure: null
genomeExposurePolicyRef: null
priorMemories: []
```

Pass-B cognition receives only its normal clean-control surface.

The history projection intentionally contains only canonical Pass-B history fields:

```text
episodeId
occurredAt
ageAtEvent
placeRef
participantRefs
observableAction
introducedParticipants
```

It does **not** expose:

```text
structureRef
intellectualEncounter
A2b selector/plausibility output
seeded-draw witness
seed
run ordinal
richness diagnostics
model provenance
genome
future material
```

`not_remembered` is a legal and complete outcome. N1 must not retry it for quality.

### Pass C

Pass C runs only when Pass B returns `remembered`.

It receives exactly one normalized target memory through the canonical initial Pass-C cognition boundary:

```text
mode: initial
priorMeaning: null
trigger: null
```

Pass C sees no underlying history and no genome.

`no_durable_meaning` is legal and must not be retried for quality.

## Identity neutralization

N1 must prevent cosmetic A2b identifiers from becoming a matching channel.

Before Pass B, each source life is independently rewritten into a neutral diagnostic namespace:

- subject ID -> `thr_n1_subject`;
- chronological episode IDs -> `n1_ep_01` through `n1_ep_10`;
- world place IDs -> stable neutral place IDs within that world;
- participant IDs -> neutral aliases assigned by deterministic first appearance;
- introduced-participant IDs use the same neutral aliases.

Only identifiers are neutralized. Observable history content, chronology, ages, world descriptions and factual relationships between events are preserved.

The same ordinal episode namespace is used independently for every candidate life, so `n1_ep_04` never reveals which original A2b seed produced the memory.

## Blind rater surface

The rater receives:

1. the generated memory outcome;
2. if remembered, normalized remembered content and uncertainty;
3. if Pass C ran, the initial meaning outcome and any durable meaning text;
4. two neutralized same-world candidate histories labeled `A` and `B`.

Each candidate history exposes only:

```text
ordinal
ageAtEvent
neutral place label + factual place description
observableAction
```

It does not expose original IDs, participant IDs, structure labels, intellectual metadata, seeds, run ordinals, selector/draw evidence, generation provenance, or richness metrics.

The rater must choose `A` or `B` and cite one or more episode ordinals that support the choice. It is instructed to use concrete lived causes rather than generic writing style or metadata.

A `not_remembered` result still goes to the rater with no invented residue. Such a trial is expected to contribute no source signal unless the absence itself is legitimately inferable; forced choice remains required.

## Trial design

Within each world there are three unordered life pairs:

```text
seed01 / seed02
seed01 / seed03
seed02 / seed03
```

Run three independent B/C/rater executions per pair:

```text
2 worlds × 3 pairs/world × 3 repetitions = 18 trials
```

Source-life assignment and candidate A/B presentation order are frozen deterministically from world ordinal, pair ordinal and repetition ordinal before any model call. They do not depend on generated memory/meaning or rater output.

No trial may be rerun because its memory, meaning or rater answer looks weak.

## Primary estimand

Primary outcome:

```text
number of correct source-life identifications out of 18 forced-choice trials
```

Null:

```text
p = 0.5
```

Predeclared one-sided positive threshold:

```text
>= 13 / 18 correct
exact binomial p = 0.048126220703125
```

For reference:

```text
12 / 18 -> p = 0.1189422607421875
14 / 18 -> p = 0.01544189453125
```

The threshold is frozen before N1 model use and must not be changed after seeing results.

## Grounding requirement

A score above chance is necessary but not sufficient for a positive Rich-Life interpretation.

The result must also be inspected for whether correct answers are grounded in concrete lived material rather than:

- cosmetic identifier leakage;
- model/provenance leakage;
- structure labels;
- seed-specific formatting;
- generic demographic/world facts shared by both candidates;
- unsupported personality inference.

Rater-cited episode ordinals and short rationale are retained as evidence for hostile review.

If the rater succeeds mainly by matching concrete remembered details to one candidate history, that is legitimate memory-level downstream fertility. Pass C need not manufacture a distinctive meaning on every trial; `no_durable_meaning` remains legal evidence.

## Model and execution freeze

Use OpenAI:

```text
gpt-5.1-2025-11-13
```

for Pass B, Pass C and the blind diagnostic rater in this development run.

All calls use temperature 0 under the existing adapter configuration. Repeated executions are separate model calls, not retries-until-good.

## Evidence and non-feedback

Record:

- source artifact digest;
- neutralization digest for each candidate life;
- Pass-B canonical input/cognition/output digests and provenance;
- Pass-C canonical input/cognition/output digests and provenance when run;
- rater input/output digests and provenance;
- source assignment and blinded candidate ordering;
- rater-cited episode ordinals;
- correct/incorrect result;
- aggregate exact-binomial score.

N1 output:

- is development-only;
- is burned for final-cohort use;
- is never published as Thread history, memory or meaning;
- is never fed back into Pass A/B/C;
- is never used to rerun A2b until a desired score appears.

## Interpretation

```text
>=13/18 + concretely grounded rationales
  -> positive evidence that A2b histories are fertile for differentiated memory/meaning

<13/18
  -> downstream source life is not distinguishable above the frozen threshold;
     event-route diversity has not yet earned the stronger Rich-Life claim

score above threshold but cosmetic/unjustified grounding
  -> confounded; not positive Rich-Life evidence
```

No result from N1 by itself freezes the production mechanism. Fresh validation worlds remain required before combined E+F review.
