---
id: validation-m2-pr39-slice-e2-n1-result
status: candidate
last-reviewed: 2026-08-19
canonical: false
---

# Milestone #39 — Slice E2 N1 downstream-fertility result

Status: **complete development diagnostic; positive with a conservative interpretation caveat**

N1 tested whether the more particular A2b lived histories produce distinguishable downstream autobiographical material when memory formation is genome-blind and durable-meaning formation is history/genome-blind.

Source artifact:

```text
fibre-m2-pr39-slice-e2-a2b-v3.json
arm: A2b_plausibility_surface_seeded_contingency
```

N1 evidence:

```text
fibre-m2-pr39-slice-e2-n1-v2.json
evidenceVersion: pr39-slice-e2-n1-v2
protocolVersion: pr39-slice-e2-n1-downstream-fertility-v1
model: gpt-5.1-2025-11-13
trials: 18
horizons: 6, 8, 10
positive threshold: 13 / 18
```

## Headline score

The artifact reports:

```text
16 / 18 correct
accuracy: 0.8888888888888888
threshold met: yes
exact half-binomial tail at 16 / 18: 0.0006561279296875

E2-D1: 8 / 9
E2-D2: 8 / 9
```

This headline is **not the load-bearing interpretation** because five trials produced `not_remembered` and the frozen rater still forced a binary A/B choice on those trials.

## Hostile grounding inspection

The 18 trials split into:

```text
remembered:      13
not_remembered:   5
```

All 13 remembered trials also produced `durable_meaning`.

### Remembered trials

Result:

```text
13 / 13 correctly attributed
```

Inspection of all thirteen rater rationales found the decisions grounded in concrete remembered lived material: specific actions, objects, places, conversations, experiments, books, errands, performances, disagreements, and other episode details that appeared in one candidate history and not the other.

Examples include:

- coloured-pencil conflict + egg/salt experiment + buying tomatoes alone;
- spoon/skewer refraction experiment with an older sibling;
- repeated ferry-book choices plus the `Harbor Memory` installation;
- solo co-op checkout plus the silent `Inventory` performance;
- mobile-library bus book + foam-ball wait by school buses + community movie night.

No remembered-trial rationale was observed relying on original Thread IDs, source seed, EventStructure IDs, provider metadata, assignment digests, or other hidden execution metadata.

Therefore the informative N1 evidence is strong: when Pass B actually formed an autobiographical memory, the resulting genome-blind memory/meaning bundle retained enough particular lived material to distinguish its source life in every observed trial.

### `not_remembered` trials

Trials:

```text
2, 13, 15, 17, 18
```

Raw forced-choice result:

```text
3 / 5 correct
2 / 5 incorrect
```

These five choices are **not valid positive downstream-fertility evidence**. With no remembered content and no Pass-C meaning, the rater had no autobiographical bundle to match and instead invented speculative selection rules.

Observed examples include reasoning that:

- one candidate showed stronger self-directed behavior and therefore might produce later meaning;
- caregivers completing schoolwork might cause later gaps in recall;
- hands-on science-like activity might be more likely to produce later reflective memory;
- one candidate aligned with an alleged protocol focus on civic/public-institution context;
- one choice was explicitly described as arbitrary.

Those rationales violate the intended grounding criterion even when the forced guess happened to match the hidden truth label.

Future versions of this diagnostic must not count a forced A/B guess on `not_remembered` as evidence. A `not_remembered` outcome should be treated as an automatic downstream-fertility miss for the source-identification estimand, or the attribution task should be skipped and reported separately.

## Conservative sensitivity result

To avoid taking credit for any of the three lucky/unsupported `not_remembered` guesses, assign **all five `not_remembered` trials as misses** while leaving every remembered trial unchanged.

Then:

```text
remembered, correctly attributed: 13
not_remembered, conservatively failed: 5

conservative score: 13 / 18
```

This still meets the **predeclared 13/18 positive threshold exactly**.

The frozen half-binomial tail for 13 / 18 is:

```text
0.048126220703125
```

This conservative sensitivity result is the load-bearing N1 conclusion, not the raw 16/18 headline.

## Memory and meaning observations

Observed memory outcomes:

```text
13 / 18 remembered
 5 / 18 not_remembered
```

Observed initial meaning outcomes:

```text
13 / 13 remembered memories -> durable_meaning
 0 no_durable_meaning in this development sample
```

The 100% conditional durable-meaning rate is a characterization observation, not a new gate. Canonical Slice-D authority still permits `no_durable_meaning`; N1 does not establish that every remembered experience should or will acquire durable meaning.

The purpose of N1 was downstream fertility/non-interchangeability, not calibration of the Pass-C meaning rate.

## Residue canonicalization amendment

Five `not_remembered` Pass-B raw outputs authored explanatory `uncertainty` strings even though canonical Pass B requires a `not_remembered` record to contain no memory residue.

The execution used:

```text
n1-not-remembered-residue-canonicalization-v1
```

For an otherwise exact `not_remembered` shape only, Fibre deterministically removed the forbidden uncertainty residue:

```text
outcome: not_remembered           unchanged
episodeRefs: []                   unchanged
rememberedContent: null           unchanged
uncertainty: [...] -> []           form canonicalization only
```

No model call was used for this canonicalization, no memory decision changed, Pass C remained skipped, and provider-raw digests were retained.

This amendment occurred after trial 1 had already scored correctly. The evidence therefore records it explicitly as a **post-score mechanical amendment** rather than presenting it as pre-score protocol design.

Because the conservative N1 conclusion treats every `not_remembered` trial as a miss, none of the five canonicalized trials contributes positive evidentiary credit to the load-bearing result.

## E2 interpretation

N1 closes the central downstream-fertility question raised by the E2 investigation:

```text
particular lived routes
        ↓
genome-blind selective memory
        ↓
history/genome-blind durable meaning
        ↓
source life remains distinguishable
```

Observed development evidence:

```text
H6
  grounding-coupled generation
  -> cast collapse / zero introduced people

A2
  stateless single-winner opportunity selection
  -> cast expansion
  -> new between-life opportunity-template collapse

A2b
  blind eligible opportunity surface + seeded contingency
  -> cast differentiation survives
  -> structure overlap falls sharply
  -> N1 informative remembered trials: 13 / 13 source-identifiable
  -> conservative all-trial N1: 13 / 18, meeting frozen threshold
```

The A2b plausibility cognition approved all offered routes plus `world_emergent` in every observed window, so it supplied no useful discrimination in these diagnostic worlds. The evidence therefore supports **seeded contingency over a mechanically eligible opportunity surface** as the useful mechanism, not the plausibility-model call itself.

## Remaining caveats

N1 is development evidence, not a final-cohort gate:

1. trials share only two worlds and six source lives, so the exact binomial number is descriptive rather than a claim of 18 independent samples;
2. `not_remembered` forced-choice scoring was methodologically weak and is excluded from positive interpretation;
3. one execution-profile amendment bounded Pass-B remembered content to 600 model-facing characters after v1 failed mechanically before scoring;
4. the residue canonicalization amendment was introduced after one v2 trial had scored and is therefore explicitly visible;
5. all observed remembered outputs acquired durable meaning, so Pass-C tendency calibration remains an observation rather than an established natural rate;
6. A2b still showed some locality concentration and candidate-attempt repair/rejection pressure; those remain visible characterization facts rather than hidden admission gates.

## Decision

**N1 supports E2 downstream fertility.**

Use the conservative statement:

> In this development sample, all 13 histories that produced a genome-blind autobiographical memory yielded memory/meaning bundles correctly attributable to their source life; treating every `not_remembered` trial as a failure still gives 13/18, exactly meeting the frozen positive threshold.

Do **not** claim that the raw 16/18 score is fully grounded evidence.

No further Pass-A quality tuning or N1 rerun is justified from this result. The next Milestone-#39 work should carry the E2 mechanism and caveats into Slice F / Gate F review rather than optimize the burned development worlds.

No admission verdict is created by N1.