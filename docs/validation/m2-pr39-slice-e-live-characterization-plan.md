---
id: m2-pr39-slice-e-live-characterization-plan
status: candidate
last-reviewed: 2026-08-18
canonical: false
---

# Milestone #39 — Slice E burned rich-life characterization

## Purpose

Characterize whether the Slice-E rich-life instrument actually produces developmentally varied prior lives with ordinary social texture and first-class intellectual encounters. This is development evidence, not an admission gate and not a causal test.

The run must not tune against the final Slice-G/H cohort. The world and seed below are therefore permanently burned once used.

## Frozen run

```text
implementation head before live evidence: 02432cf88e928c0a7398a59d381a8b550833cbde
origin mode: synthetic_lineage
provider: openai
model: gpt-5.1-2025-11-13
seed: slice-e-dev-burned-001
episodes: 10
world: world_slice_e_dev_burned_001
developmental span: age 6 through 17.999
EventStructurePool: genesis-event-structure-pool-v2
```

The model choice follows the repository's configured OpenAI reasoning model. The synthetic lineage is a real deterministic crossover of two synthetic-ancestor symbolic genomes, but the lineage/genome witness is discarded before Pass-A cognition.

## Exact command

```bash
npm run genesis:rich-life-dev -- \
  --provider openai \
  --model gpt-5.1-2025-11-13 \
  --origin-mode synthetic_lineage \
  --episodes 10 \
  --seed slice-e-dev-burned-001 \
  --out /tmp/fibre-m2-pr39-slice-e-burned-001.json \
  --overwrite
```

The evidence artifact must report `developmentOnly: true`, `burnedForFinalCohort: true`, and `admissionVerdict: null`.

## What to inspect

Inspect the generated life as a chronology, not as ten independent samples. Record without tuning:

- age spread and whether episodes actually advance through childhood/adolescence;
- ordinary/social versus higher-consequence balance;
- structure-grounded versus world-emergent episodes;
- intellectual-encounter count, kinds, access modes, and ages;
- whether access visibly shifts from caregiver/institution mediation toward peer/self-directed opportunities with age;
- whether book/text, conversation/argument, art, scientific idea, mentor/teacher, overheard discussion, and philosophical/religious possibilities are represented in the instrument and which actually instantiate;
- whether intellectual encounter metadata remains observable-history fact rather than lesson, trait, belief, significance, or adult-policy language;
- participant continuity and whether relationships/people recur rather than every episode introducing a disposable cast;
- repairs/rejections and any provider/schema failures;
- monoculture, over-articulation, moral neatness, excessive consequence, or profession/identity foreshadowing.

## Interpretation discipline

There is no richness threshold and no pass/fail score for this development run. A sparse, repetitive, bland, or overly neat life is a finding about the instrument. Do not reject or regenerate it merely to obtain a prettier result.

A mechanical contract violation may be fixed and rerun with the same burned seed, with the failure and repair recorded. A purely aesthetic or quality weakness must be recorded rather than silently tuned away.

This run does not establish genome causality, source/origin integrity, final cohort quality, M2 standing, or future behavior. Those remain owned by G/H, F, and #40/#41 respectively.
