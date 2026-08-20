---
id: m2-pr39-memory-meaning-characterization
status: implemented
last-reviewed: 2026-08-20
canonical: false
---

# Milestone #39 — Pre-G memory/meaning characterization

## Purpose

Pre-G Seam Stage 2 adds a shared, measurement-only way to characterize autobiographical-memory selectivity and initial durable-meaning outcomes before Slice G freezes the final cohort protocol.

This stage responds to two Gate-F carry-forwards:

1. trial-level `remembered` is too coarse to diagnose over-retention; the more relevant quantity is how much visible history a formed memory cites;
2. `no_durable_meaning` is doctrinally first-class but has not appeared in development evidence, so future evidence should report the durable/no-durable meaning rate explicitly without turning it into a quota.

No model call, prompt, admission rule, regeneration rule, or Gate-F result is changed by this stage.

## Canonical characterization record

The shared pure function lives in:

`services/world-kernel/src/genesis-memory-meaning-characterization.mjs`

Each observation contains only the mechanically reportable fields needed for this characterization:

```text
formationRef
visibleEpisodeCount
memoryOutcome
citedEpisodeRefs
meaningOutcome
```

The coherent cases are:

```text
not_remembered
  citedEpisodeRefs = []
  meaningOutcome = null

remembered
  citedEpisodeRefs = one or more visible episode refs
  meaningOutcome = durable_meaning | no_durable_meaning
```

The characterization layer does not infer whether a memory or meaning is good. It rejects only structurally incoherent measurement input, such as a `not_remembered` result that cites episodes or a remembered result whose Pass-C outcome is missing.

## Memory selectivity metric

For each remembered observation:

```text
citedEpisodeCount = number of distinct cited episode refs

citationShare = citedEpisodeCount / visibleEpisodeCount
```

Aggregate reporting includes:

```text
remembered observations
cited episodes total
cited episodes per memory: mean / min / max
citation share of visible history: mean / min / max
same measures grouped by visibleEpisodeCount
```

This is the preferred #39 characterization for the concern previously approximated by a near-total trial-level remembered rate. A trial may form a memory while still retaining only a small fraction of the history visible to Pass B.

There is deliberately **no target citation share** and no high/low admission threshold. A high or low value is evidence to interpret, not a regeneration trigger.

## Meaning-rate characterization

The same record stream reports the initial memory/meaning funnel:

```text
observations
remembered
notRemembered
rememberedRate

durableMeaning
noDurableMeaning
rememberedToDurableMeaningRate
```

`no_durable_meaning` remains a fully legal result. Stage 2 does not define a required minimum or maximum durable-meaning rate.

A 100% durable-meaning rate is therefore not automatically a defect and not automatically healthy. It is a characterization that must be interpreted in light of the conditioning imposed by Pass B and the constitutive Pass-C semantics established in Stage 1.

## Admission separation

Every characterization result contains:

```text
admissionVerdict: null
```

and an explicit note that the measurements must not be used as admission gates or regeneration triggers.

This separation is part of the contract. Slice G may freeze how these values are reported, but it must not silently convert them into biography-quality quotas.

## N2 adapter

`tools/genesis-memory-meaning-n2-characterization.mjs` adapts the already-sealed N2 result to the shared record shape without modifying the retained artifact.

The adapter uses:

```text
visibleEpisodeCount <- trial.horizon
memoryOutcome       <- trial.passB.output.outcome
citedEpisodeRefs    <- trial.passB.output.episodeRefs
meaningOutcome      <- trial.passC.output.outcome, or null when Pass C did not run
```

The Stage-2 regression reads the retained N2 JSON and verifies that:

- all 18 trials remain remembered;
- all 18 remembered trials remain `durable_meaning` in that historical evidence;
- the three visible horizons 6/8/10 each contribute six observations;
- citation share is selective rather than whole-history retention;
- the derived characterization has `admissionVerdict: null`;
- the sealed N2 Gate-F result remains unchanged.

The N2 artifact itself is not rewritten.

## Use in Slice G/H

When G freezes the final diagnostic/reporting protocol, use this shared characterization shape for initial memory/meaning reporting rather than defining a second experiment-specific metric.

Per Thread, G/H should be able to report at least:

```text
historical / visible history count appropriate to the Pass-B call
remembered vs not_remembered
cited episode count
citation share of visible history
durable_meaning vs no_durable_meaning
```

Cohort aggregation may report the same mean/rate distributions, but N2 and other development evidence remain development evidence rather than population inference.

## Non-claims

Stage 2 does not establish:

- a healthy universal memory-retention percentage;
- a healthy universal durable-meaning rate;
- that every retained memory should have meaning;
- that `no_durable_meaning` must appear in a fixed-size cohort;
- that citation share measures memory fidelity or psychological realism in full;
- any #40/#41 causal standing.

It creates a better measurement surface, not a new personhood claim.
