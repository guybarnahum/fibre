---
id: validation-genesis-d5-sealed-history-diagnostic
status: active
last-reviewed: 2026-08-27
canonical: false
---

# Genesis D5 prospective sealed-history diagnostic

## Purpose

This is the pre-#40 replacement for the citation-confounded #39 D5 instrument.

The construct remains **self-account accommodation / overgeneralization**. The diagnostic asks whether a Thread's already-formed self-account broadly or specifically accommodates material that differs in whether cognition was allowed to receive it.

This instrument does **not** claim personhood, hidden memory, paranormal reconstruction, or Whole-Person standing.

## Why #39 cannot simply be rerated

The #39 cohort was generated before prospective sealed-history isolation existed. Its episodes therefore cannot become valid holdouts retroactively.

A valid D5 packet must be created from a future diagnostic generation in which holdouts were selected **before** Pass-B / Pass-C / self-account formation and mechanically excluded throughout the relevant cognition path.

The runner consequently refuses live/replay execution without an explicit prospective packet and requires exposure manifests proving the isolation boundary.

## Four blinded conditions

Each prospectively sealed own-history holdout creates one logical observation with four evaluator judgments:

| Condition | Purpose |
| --- | --- |
| remembered/cited positive | task-matched sensitivity control; the episode is visible and a memory depending on it contributes to the self-account source graph |
| own sealed holdout | experimental target; true history that target cognition was structurally forbidden to receive |
| matched plausible non-event | negative control for generic self-description that fits almost anything |
| another Thread's sealed holdout | counterfactual control for generic accommodation of plausible but non-own history |

The evaluator never receives condition names, source IDs, Thread IDs, expected results, provenance labels, or scoring thresholds. It sees only:

```text
selfAccount
candidateEpisode
```

Presentation order is rotated across units so provider phase is not permanently tied to one condition.

## Structural packet requirements

A packet uses contract:

```text
fibre-genesis-d5-sealed-history-packet-v1
```

It must contain:

- one target Thread and one already-formed self-account;
- one complete explicit source dependency graph;
- 1–4 own holdout episode refs selected prospectively;
- the sealed-history exposure manifests from cognition formation;
- exactly one four-condition unit per sealed own holdout;
- for each positive control, a visible episode plus a memory that transitively depends on that episode;
- the self-account source must transitively depend on the positive-control memory;
- the self-account source must not be in the sealed-history taint closure;
- plausible non-events must not be target-Thread sources;
- cross-Thread holdouts must belong to another Thread and must not appear in the target graph.

Every supplied exposure manifest must bind to the same source-graph digest and sealed-source set and must pass the mechanical leak assertion.

A packet with no exposure manifests is invalid. A self-account that depends on sealed history is invalid. This prevents retrospective #39 material or provenance-incomplete packets from masquerading as prospectively isolated evidence.

## Evaluator outputs

The evaluator scores two separate dimensions:

### Thematic accommodation

```text
none | plausible | strong
```

This asks whether the broad self-understanding could plausibly accommodate the candidate episode.

### Episode-specific factual alignment

```text
none | partial | specific
```

This asks whether concrete details, relationships, actions, circumstances, or unusually identifying structure in the self-account align with that particular episode.

Generic personality language is not factual alignment. The evaluator is explicitly told not to infer that a candidate event happened.

## Unit, estimand, and sensitivity

The logical unit is **one prospectively sealed own-holdout unit**, not one evaluator call. A unit produces four blinded measurements.

For `n` holdouts in one target packet, the current large-effect development thresholds are:

```text
positive-control thematic sensitivity     >= ceil(0.75 * n)
generic-overreach thematic signal         >= ceil(0.75 * n) in each of own/fake/cross controls
own forbidden factual audit signal        >= ceil(0.75 * n) specific
matched/cross factual control ceiling      <= floor(0.25 * n) specific
```

With the intended maximum `n=4`, those become 3/4 and 1/4 boundaries. This is a coarse development diagnostic, not population inference. A weaker difference is not evidence of absence.

No chance model is claimed for the semantic ordinal judgments.

## Classification

The deterministic scorer uses the narrowest supported interpretation:

### `INSTRUMENT_SENSITIVITY_FAILED`

The remembered/cited positive controls do not reach the predeclared thematic sensitivity floor. Other D5 conclusions are not trusted.

### `PROVENANCE_AUDIT_TRIGGER`

The self-account has specific factual alignment to at least 75% of its own forbidden holdouts while matched non-events and cross-Thread holdouts stay at or below 25% specific alignment.

This is **not a win**. It requires an isolation/provenance/world-cue audit because target cognition was forbidden to receive those facts.

### `GENERIC_OVERGENERALIZATION`

At least 75% of own holdouts, plausible non-events, and cross-Thread holdouts all receive thematic accommodation. This indicates the self-account is broad enough to fit many plausible histories rather than preferentially reflecting its own evidenced life.

### `NO_LARGE_OVERREACH_SIGNAL_AT_RESOLUTION`

The positive control works and neither large generic-overreach nor forbidden-own-history factual pattern crosses the predeclared threshold.

This wording deliberately does not claim absence of smaller overgeneralization effects.

## Execution discipline

`tools/genesis/genesis-d5-sealed-history-diagnostic.mjs` provides:

- provider-free generic instrument preflight;
- provider-free prospective-packet validation and plan freezing;
- explicitly authorized live evaluation only when a valid packet exists;
- Birth Center durable invocation journaling;
- zero scientific quality retries;
- provider-disabled exact replay of committed evaluator judgments;
- separate reporting of logical units, committed judgments and physical provider attempts.

Operational transport retries remain bounded provider-runtime recovery, not scientific resampling. Once a valid evaluator judgment is durably committed it is never requested again.

## Current bridge standing

The mechanical sealed-history firewall is implemented and tested. This four-condition evaluator/scorer makes the D5 instrument executable prospectively.

There is intentionally **no valid live D5 result yet**, because the closed #39 cohort was not prospectively sealed and the bridge does not authorize a replacement #39 cohort merely to manufacture one.

The extension path remains open: any future Genesis diagnostic generation can select causally local holdouts before memory formation, compile every relevant cognition packet through the sealed-history firewall, retain the manifests, form a self-account from the allowed state, and then run this four-condition evaluator without changing the D5 construct or scoring boundary.
