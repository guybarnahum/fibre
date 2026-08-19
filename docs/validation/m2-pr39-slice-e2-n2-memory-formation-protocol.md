---
id: validation-m2-pr39-slice-e2-n2-memory-formation-protocol
status: frozen-development-protocol
last-reviewed: 2026-08-19
canonical: false
---

# Milestone #39 — Slice E2 N2 corrected downstream-fertility protocol

## Purpose

N2 answers the single remaining Gate-F question after the old N1 instrument was found to frame Pass B as memory detection rather than memory formation:

> When the corrected A0 generator produces particular lived histories, can a contract-correct constitutive Pass B form autobiographical memories whose source histories remain distinguishable after genome-blind Pass C meaning formation?

This is a new instrument. It does not inherit the old N1 `13/18` threshold or the failed N1-on-A0 `8/9` threshold.

The prior burned artifacts remain permanent evidence and are not rerun.

## Doctrine correction frozen before N2

Normative rule:

> **Pass B forms what the Thread retains autobiographically from the visible admissible history at the remembering moment. It does not detect or verify a memory that must already exist. Absence of prior memories is normal and is not evidence that nothing is retained. `not_remembered` remains a first-class legal formation outcome.**

See:

```text
docs/validation/m2-pr39-pass-b-memory-formation-semantics-correction.md
docs/concepts/development-and-memory.md
docs/architecture/genesis-compiler-contract-v1.md
```

The old N1 prompts are not edited; they remain part of the burned old instruments.

## Source histories

N2 uses exactly six corrected-A0 lives across two fresh source-free worlds.

### E2-V1

Three existing A0 lives from the already-burned E2-V1 artifact:

```text
artifacts/validation/m2-pr39/e2/fibre-m2-pr39-slice-e2-v1-fresh-world-v1.json
SHA-256: e6f59d1e62e7856914598b8f10424f778bef0ed6256ad771385af67f2e4cc720
```

No E2-V1 life is regenerated or replaced.

### E2-V2

Three A0 lives generated once on a second source-free fresh WorldSpec:

```text
tools/genesis-rich-life-e2-v2-world.mjs
tools/genesis-rich-life-e2-v2-a0.mjs
```

The E2-V2 world, seeds, offered schedules, generator witness and requirement that **all three completed lives flow into N2** are frozen before first model use.

There is no post-generation source-life selection. If source generation cannot complete under the existing three-candidate cap, that failed artifact is retained and the world is not regenerated or tuned.

## Trial plan

Each world contributes the same 9-trial structure used by N1:

```text
three source lives
three unordered pairs: 1-2, 1-3, 2-3
three horizons: 6, 8, 10 episodes
one source life per pair/horizon trial
```

Across two worlds:

```text
trial count:        18
source lives:        6
uses per source life: 3
truth labels:       9 A / 9 B
candidate ordering: 9 left-as-A / 9 right-as-A
```

Assignments are deterministic and content-independent. No trial assignment depends on history wording, memory plausibility, structure IDs or later score.

## Corrected Pass-B cognition

Pass B remains the clean `life_only_unexposed` control:

- visible history only through the canonical Pass-B cognition boundary;
- no genome;
- no structure/richness metadata;
- no target personality;
- no future events;
- `priorMemories: []` at this initial formation point.

The model-facing instruction is constitutive:

> Form the autobiographical memory this Thread retains from the supplied visible history at `rememberingAt`, if any. Absence of prior memories is normal and is not evidence that nothing is retained. `not_remembered` remains fully legal.

When remembered, the same bounded-output profile is retained:

```text
rememberedContent <= 600 model characters
```

This is a form bound below canonical admission limits, not a memory-content or salience selector.

## Pass C and rater

Pass C is unchanged:

- initial meaning formation;
- sees one formed memory only;
- sees no history and no genome;
- `no_durable_meaning` remains legal.

The blind rater is unchanged in substance:

- receives the memory/meaning bundle;
- receives two same-world candidate histories truncated to the same horizon;
- identifiers are neutralized;
- must choose A or B using concrete lived details;
- source arm labels, seeds, structure labels and model metadata are absent.

## Why the old composite score is retired

The old conservative score gave zero credit to `not_remembered` and then compared total credited trials to a fixed binomial threshold.

That conflated two different properties:

1. whether Pass B forms an autobiographical memory at all;
2. whether a formed memory is particular enough to identify its source history.

The failed 8/9 design was also badly powered. Before that run the old instrument had already observed `not_remembered` in 5/18 trials. Across both burned old instruments the observed formation count is:

```text
A2b old N1: 13/18 remembered
A0 old N1:    6/9 remembered
pooled:       19/27 remembered = 70.37%
```

For planning only, N2 rounds this down to a 0.70 memory-formation rate.

## N2 decision rule

N2 uses **two jointly required criteria**, frozen before first N2 model call.

### Criterion A — enough formed memories for the attribution test to be informative

At least:

```text
10 / 18 trials remembered
```

Planning witness:

```text
if true memory-formation rate = 0.70,
P(remembered >= 10 of 18) = 0.9404141160133612
```

This is a diagnostic floor, not a claim that a healthy Thread must remember a fixed percentage of life. It prevents a source generator from looking perfectly attributable by producing only one or two memories.

### Criterion B — source attribution above chance conditional on formed memory

Let:

```text
m = number of remembered trials
k = remembered trials with correct blind source attribution
```

N2 passes Criterion B only if the exact one-sided binomial tail under `p = 0.5` is `<= 0.05`.

The exact predeclared threshold table for every possible `m >= 10` is:

```text
m remembered    minimum k correct    exact chance tail at threshold
10              9                    0.0107421875
11              9                    0.03271484375
12              10                   0.019287109375
13              10                   0.046142578125
14              11                   0.0286865234375
15              12                   0.017578125
16              12                   0.0384063720703125
17              13                   0.0245208740234375
18              13                   0.048126220703125
```

`not_remembered` contributes neither a correct nor incorrect attribution to Criterion B. Its frequency is evaluated by Criterion A.

### Combined Gate-F interpretation

N2 supports the downstream-fertility claim only if **both A and B pass**.

No post-hoc substitution is allowed:

- high memory count cannot compensate for chance-level attribution;
- perfect attribution of too few memories cannot compensate for low memory formation;
- durable-meaning rate, raw forced choices on no-memory cases, structure overlap and stylistic quality cannot replace either criterion.

Planning characterization, not a promise of result:

```text
at memory rate 0.70 and perfect attribution,
approximate probability of satisfying both criteria = 0.9404

at memory rate 0.70 and attribution probability 0.90,
approximate probability of satisfying both criteria = 0.8647
```

These calculations assume independent Bernoulli trials for planning only. The actual development trials share worlds/source lives, so N2 remains a development diagnostic rather than publication-grade population inference.

## Burn discipline

- E2-V2 burns on first model use.
- N2 source bindings are digested before the first N2 Pass-B call.
- No prompt, threshold, world, seed, horizon, source life, assignment or scoring rule changes after first N2 model use.
- `not_remembered` remains legal even if it causes Criterion A to fail.
- A negative N2 result is retained and reported; no rerun is authorized by score.

## Scope

A positive N2 result would establish only the Gate-F development claim that corrected-A0 histories can supply downstream autobiographical fertility under a contract-correct Pass-B formation instrument.

It would not establish:

- genome causality;
- Whole-Person causal standing;
- a calibrated natural memory rate;
- universal Rich-Life quality;
- a production richness score;
- final-cohort validity.
