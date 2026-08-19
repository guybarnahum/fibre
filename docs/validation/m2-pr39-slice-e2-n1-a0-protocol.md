---
id: validation-m2-pr39-slice-e2-n1-a0-protocol
status: frozen-before-model-use
last-reviewed: 2026-08-19
canonical: false
---

# Milestone #39 — Gate F N1-on-A0 downstream-fertility protocol

## Purpose

Gate-F review falsified the seeded-contingency/A2b generation mechanism on the fresh E2-V1 world and promoted the corrected A0 coupled chooser/realizer as the generator to carry toward Slice G.

The prior N1 result cannot by itself close Gate F because it measured downstream autobiographical fertility on A2b histories, not on A0 histories.

This protocol asks one narrow question:

> Do the three already-burned E2-V1 A0 histories retain enough particular lived material that genome-blind selective memory and memory-only meaning remain attributable to the life that produced them?

This is not another attempt to make E2-V1 positive. The E2-V1 generation result remains a failed replication. This protocol does not regenerate, tune, repair, select, or replace any source life.

## Exact source evidence

The only admissible source is:

```text
artifacts/validation/m2-pr39/e2/fibre-m2-pr39-slice-e2-v1-fresh-world-v1.json
```

Expected byte SHA-256:

```text
e6f59d1e62e7856914598b8f10424f778bef0ed6256ad771385af67f2e4cc720
```

Required source properties:

```text
evidenceVersion:       pr39-slice-e2-v1-fresh-world-v1
protocolVersion:       pr39-slice-e2-v1-fresh-world-protocol-v1
status:                complete
developmentOnly:       true
burnedForFinalCohort:  true
world:                 E2-V1
A0 arm:                A0_corrected_coupled_chooser_realizer
A0 lives:              exactly 3
A0 episodes/life:      exactly 10
```

Only `arms.A0.lives` is visible to this experiment. The FROZEN lives, FROZEN schedule, E2-V1 comparison result, structure-overlap score, and provider-generation metadata are not part of Pass-B, Pass-C, or rater cognition.

The source world is already burned. Running this protocol does not create a new WorldSpec and must never regenerate an A0 life.

## Relationship to original N1

The cognitive experiment remains N1:

```text
A0 lived history
      ↓
Pass B: life_only_unexposed
      ↓
selective autobiographical memory
      ↓
Pass C: initial meaning from that memory only
      ↓
blind same-world 2AFC rater
```

The following are unchanged from completed N1-v2:

- horizons `6, 8, 10`;
- all three unordered pairs of the three same-world lives;
- each life is the source exactly once at each horizon;
- Pass B sees neutralized life history and public world only;
- Pass B is genome-unexposed and has no prior memories;
- Pass C sees only the resulting autobiographical memory, never history or genome;
- rater sees the memory/meaning bundle and two neutralized same-world candidate histories;
- Thread IDs, seed IDs, EventStructure IDs, selector metadata, generator metadata and provider metadata are absent from rater evidence;
- `not_remembered` remains legal and is never repaired into a memory;
- the existing N1-v2 600-character Pass-B form ceiling remains active;
- the existing deterministic `not_remembered` uncertainty-residue canonicalization remains active from trial 1 and uses no model call.

No A0-specific prompt, salience instruction, richness hint, personality target or desired outcome is introduced.

## Necessary one-world amendment

Original N1 used six lives across two worlds and therefore produced 18 trials. E2-V1 contains three A0 lives in one fresh world, so applying the same three pairs × three horizons produces exactly **9 trials**.

The 18-trial threshold must not be reinterpreted as if it applied to 9 trials. Before any N1-on-A0 model call, this protocol freezes:

```text
trial count:             9
positive threshold:      8 / 9
chance model:            forced binary choice, p = 0.5
P[X >= 8 | n=9,p=.5]:   0.01953125
7 / 9 chance tail:       0.08984375
```

Thus 7/9 does not clear the development diagnostic.

This is a development diagnostic threshold, not publication-grade inferential proof and not a calibrated estimate of the population frequency of rich lives.

## Trial construction

The same three unordered pairs are used:

```text
pair 1: run 1 vs run 2
pair 2: run 1 vs run 3
pair 3: run 2 vs run 3
```

Each pair is tested at horizons:

```text
6 episodes
8 episodes
10 episodes
```

Source-side assignment uses the original N1 cycle:

```text
odd horizon ordinal:  pair1=left,  pair2=right, pair3=left
even horizon ordinal: pair1=right, pair2=left,  pair3=right
```

Therefore each A0 life is the source exactly three times and exactly once at each horizon.

Because 9 is odd, exact A/B and left/right balance is impossible. Candidate ordering is frozen by SHA-256 over:

```text
E2-N1-A0|<pairOrdinal>|<repetitionOrdinal>|candidate-order
```

mapping an even final hex nibble to `left` as candidate A and an odd nibble to `right` as candidate A.

The frozen plan must yield:

```text
truth labels:       A=5, B=4
candidate A side:   left=5, right=4
source uses/life:   3, 3, 3
```

Any other plan is a protocol error and must stop before model use.

## Neutralization boundary

The existing N1 neutralizer is reused with the E2-V1 WorldSpec.

Pass B may receive:

- neutral subject ID;
- public WorldSpec descriptions;
- neutral place IDs;
- neutral participant IDs and factual participant relations contained in visible history;
- visible episode timestamps/ages;
- factual `observableAction` history through the assigned horizon.

Pass B must not receive:

- A0/FROZEN arm labels;
- source seed;
- source Thread ID;
- original participant/place IDs;
- EventStructure IDs;
- intellectual-context metadata not already represented by lived observable facts;
- E2 characterization or comparison metrics;
- candidate-attempt/rejection metadata;
- genome;
- future history;
- downstream benchmark identity.

The rater receives only ordinal, age, neutral place label + public place description, and factual observable action for each candidate history, plus the produced memory/meaning bundle.

## Pass-B form profile

The already-established N1-v2 mechanical form profile remains unchanged:

```text
profile: n1-pass-b-bounded-output-v1
rememberedContent model-facing max: 600 characters
canonical admission max: unchanged
```

This is a form bound only. It does not request a memory or change which episode should be remembered.

## Known not-remembered residue policy

The completed N1-v2 run established a mechanical provider residue in which the model can return semantically `not_remembered` while putting explanatory text in `uncertainty`.

From trial 1 of this protocol, the already-recorded policy is active:

```text
raw:
{
  "outcome": "not_remembered",
  "episodeRefs": [],
  "rememberedContent": null,
  "uncertainty": ["..."]
}

canonical:
{
  "outcome": "not_remembered",
  "episodeRefs": [],
  "rememberedContent": null,
  "uncertainty": []
}
```

Conditions:

- no model call is used;
- the semantic remembered/not-remembered decision cannot change;
- original raw output and digest remain evidence;
- any failure other than this exact residue stops execution.

Unlike the original N1-v2 execution, this is not a post-score amendment: it is frozen before the first N1-on-A0 model call.

## Scoring and conservative interpretation

The rater is still forced to choose A or B on every trial so the execution remains comparable with original N1.

However, the known methodological weakness from N1 is incorporated into the interpretation before model use:

> A `not_remembered` trial receives **zero positive downstream-fertility credit**, regardless of whether the forced rater happened to choose the correct history.

Two scores are therefore recorded:

1. **Raw forced-choice score** — ordinary rater correctness over all 9 trials, for comparability with original N1.
2. **Conservative fertility score** — a trial is credited only when Pass B formed an actual memory **and** the blind rater chose the correct source history.

The Gate-F development criterion is frozen as:

```text
conservative fertility score >= 8 / 9
```

This criterion is intentionally stricter than crediting lucky guesses on no-memory trials.

No post-run alternative score may replace it.

## Interpretation

### If conservative score is 8/9 or 9/9

The narrow Gate-F evidence gap is supported:

> Corrected A0 can produce fresh-world lived histories whose concrete differences survive through genome-blind selective memory and memory-only meaning strongly enough to remain source-attributable in this development diagnostic.

This does not prove that every A0 life is rich, that A0 is optimal, that values/personality have already changed, or that the result generalizes to arbitrary worlds.

### If conservative score is 7/9 or lower

The gap remains open. Record the result as a negative result. Do not change the threshold, histories, horizons, candidate assignments, prompt, seeds, or source world and rerun to seek a pass.

A failure would mean the A0 histories observed in E2-V1 are not sufficiently demonstrated to carry the milestone's downstream-fertility claim. Gate F would then decide the architectural consequence.

## Burn and rerun discipline

- The source E2-V1 histories are already burned and immutable evidence.
- The first N1-on-A0 model call burns this exact downstream experiment execution.
- Model/provider failure may resume only from checkpointed raw outputs under the same source digest, protocol, plan, provider and model.
- A completed experiment must never be rerun because of its score.
- A failed semantic result must never be replaced by another seed/order/threshold.
- No result from this experiment may feed back into Pass A generation.

## Gate-F standing

This protocol exists only to close the remaining Gate-F bookkeeping-with-consequence gap identified after E2-V1:

```text
shipping generation evidence:       corrected A0
existing downstream evidence:       A2b
required aligned downstream test:   corrected A0 → N1
```

Gate F remains HOLD until the result is recorded and hostile review explicitly says CLEAR.
