---
id: m2-pr39-slice-g3-pass-b-treatment-freeze
status: frozen_pending_verification
last-reviewed: 2026-08-20
canonical: false
---

# Milestone #39 — Slice G3 Pass-B treatment freeze

## Status

**G3 FROZEN — static verification is required before G4. No final-cohort life generation is authorized.**

Machine-readable authority:

```text
artifacts/validation/m2-pr39/g/protocol/g3-pass-b-treatment-freeze-v1.json
```

Verifier/assignment authority:

```text
tools/genesis/genesis-g3-treatment-freeze.mjs
```

## Purpose

G3 prevents final-cohort memory results from choosing their own control design.

Before any final life exists, it freezes:

- the exact number/order of eligible Pass-B calls;
- the direct `life_only` / `life_plus_genome` treatment schedule;
- whole-genome exposure policy;
- guaranteed clean-control positions;
- the only positions that may become `life_only_exposed`;
- expected and minimum call-level cell sizes;
- the action on a sparse exposed cell.

The governing rule remains:

> **Do not repair a control cell after observing the cohort.**

## Call schedule

Each of the five Threads receives six Pass-B memory-formation opportunities after the same mechanically named history horizons:

```text
Pass-B ordinal       1   2   3   4   5   6
history horizon      4   5   6   7   8  10 episodes
direct mode          L   L   T   L   L   T
```

where:

```text
L = life_only
T = life_plus_genome
```

Across the cohort:

```text
5 Threads × 6 calls          = 30 eligible Pass-B calls
5 Threads × 2 treatment      = 10 life_plus_genome calls
remaining                    = 20 life_only calls
treatment proportion         = 10/30 = 33.333...%
frozen permitted range       = 30–40%
```

The schedule is identical for all five Threads. No assignment decision depends on episode wording, World, genome text, memory salience or later outcome.

## Why this position structure

### Ordinals 1–2 — guaranteed clean control

Both calls are genome blind and occur before any treatment call.

Therefore they contribute exactly:

```text
10 guaranteed life_only_unexposed calls
```

No stochastic memory outcome can erase this clean early cell.

### Ordinal 3 — early direct treatment

Every Thread receives whole-genome treatment at the six-episode horizon.

If this call produces `remembered`, the admitted memory is legitimately visible as prior autobiographical memory on later Pass-B calls. If it produces `not_remembered`, there is no treatment memory to propagate.

This distinction is observed from admitted prior-memory history, not guessed from exposure or caller metadata.

### Ordinals 4–5 — propagation observation window

Both calls are directly genome blind.

For a given Thread:

```text
ordinal 3 remembered      -> ordinals 4 and 5 are life_only_exposed
ordinal 3 not_remembered  -> ordinals 4 and 5 remain life_only_unexposed
```

This makes the middle stratum real within-life propagation rather than a hidden genome leak.

### Ordinal 6 — late direct treatment

Every Thread receives a second treatment at the ten-episode horizon.

Because it is the final Pass-B call, this treatment cannot enlarge the `life_only_exposed` cell after outcomes are visible. It provides additional direct-treatment observations without contaminating later controls.

## Genome exposure

Treatment uses:

```text
kind       whole_genome
loci       all 6 frozen loci
order      ordinal 1..6
```

Reason:

- no relevance-selected loci;
- no arbitrary new prefix size;
- the treatment surface matches the whole-genome surface tested by G2;
- six textual loci are small enough that truncation is not needed for context bounds.

The helper reconstructs exposure from the frozen symbolic-genome bundle and verifies its embedded digest before returning the six loci.

## Three strata

The canonical domain definitions remain unchanged:

```text
life_only_unexposed
life_only_exposed
life_plus_genome
```

`formationMode` comes from the frozen ordinal schedule.

`priorTreatmentMemoryExposure` is true only when the call's admitted `priorMemories` contains a memory whose `formationMode` was `life_plus_genome`.

The analysis stratum is then derived mechanically by the existing Pass-B contract. It is not caller-selected.

## Exact arithmetic

Let:

```text
R = number of Threads whose ordinal-3 treatment call returns remembered
```

Then:

```text
life_plus_genome      = 10
life_only_exposed     = 2R
life_only_unexposed   = 20 - 2R
```

Examples:

```text
R=0 -> unexposed 20, exposed 0,  treatment 10
R=2 -> unexposed 16, exposed 4,  treatment 10
R=3 -> unexposed 14, exposed 6,  treatment 10
R=5 -> unexposed 10, exposed 10, treatment 10
```

Thus `life_only_unexposed` can never fall below 10 under the frozen design.

## Planning expectation

For planning only, G3 retains the pre-G development memory-formation witness:

```text
q = 0.70
```

This is not a required or calibrated natural recall rate.

At that planning value:

```text
E[R]                         = 3.5 Threads
E[life_only_exposed]         = 7 calls
E[life_only_unexposed]       = 13 calls
life_plus_genome             = 10 calls
```

No final cohort is required to match these expected values.

## Minimum call-level analyzability

Frozen before cohort generation:

```text
life_only_unexposed   minimum 10 calls
life_only_exposed     minimum  6 calls
life_plus_genome      minimum 10 calls
```

The exposed minimum is equivalent to:

```text
R >= 3 of 5 early treatment calls remembered
```

If `R < 3`:

```text
HOLD_D3_THREE_STRATUM_INTERPRETATION_PRESERVE_COHORT_NO_REGENERATION
```

This is an interpretation HOLD, not permission to regenerate Threads, repeat memory calls or change treatment positions.

These are **call-level** minima. G5 still owns the independent rater and must separately freeze any minimum number of remembered-content records needed for a content-attribution statistic. `not_remembered` remains a legal first-class outcome.

## Content independence

Assignment may use only:

```text
cohort slot
Pass-B ordinal
frozen horizon schedule
admitted prior-memory formationMode for deriving exposure stratum
```

It may not use:

```text
episode content
memory wording
salience
meaning
World identity / geography
genome text / locus content
G2 pair score
provider response when choosing direct mode
H result
```

The treatment schedule itself never changes after freeze.

## Verification

Active regression:

```text
tools/genesis/genesis-g3-treatment-freeze.test.mjs
```

It proves:

- 30 exact eligible calls;
- 10/30 direct treatment = 33.3%;
- clean ordinals `[1,2]`;
- treatment ordinals `[3,6]`;
- propagation-observation ordinals `[4,5]`;
- analysis stratum derives from prior admitted treatment memory rather than caller choice;
- `R=3` yields `14 / 6 / 10` calls across unexposed/exposed/treatment;
- `R=2` triggers the frozen exposed-cell HOLD;
- treatment exposes all six frozen loci in ordinal order.

Manual static command:

```bash
npm run genesis:g3-verify
```

It makes no model calls.

## Boundary

```text
G1          COMPLETE / CLEAR
G2          COMPLETE / CLEAR — bounded five-pair textual-distinguishability ceiling
G3          FROZEN — pending npm test + genesis:g3-verify confirmation
G4          BLOCKED until G3 verification is green
G5-G6       BLOCKED
H           FORBIDDEN until Gate G CLEAR
```

G3 does not authorize final-life generation. G4 must consume this exact protocol and may not change the treatment schedule.
