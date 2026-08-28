---
id: validation-generative-diagnostic-methodology
status: accepted
last-reviewed: 2026-08-27
canonical: true
---

# Generative diagnostic methodology

## Purpose

This document records enduring methodology learned from Fibre's provider-backed Genesis and personhood-adjacent experiments. It complements [`experiment-lifecycle.md`](experiment-lifecycle.md): the lifecycle governs when evidence is fresh, frozen, sealed and retained; this document governs whether a diagnostic instrument actually measures the property it claims to measure.

The standard is:

> **A diagnostic must be able to fail for the right reason, distinguish its target construct from easy proxies, and preserve enough provenance to tell scientific effects from context leakage, model-order sensitivity and operational retries.**

These rules apply prospectively. They do not authorize rerating, resampling or reinterpretive threshold changes to already frozen experiments.

## 1. State the estimand and unit before provider output

Every provider-backed diagnostic names, before the first real evaluator call:

- the construct being measured;
- the unit of observation;
- the comparison/control condition;
- the chance/null model when one exists;
- the effect size or resolution the experiment can meaningfully detect;
- known confounds and how they are counterbalanced or bounded;
- which outcomes would count as positive, negative, inconclusive or instrument-invalid.

Do not infer the null model from a convenient formula after reading the result. Derive it from the actual randomization and call structure.

A diagnostic that cannot distinguish an interesting null from an interesting effect at its planned sample size must say so before execution.

## 2. Controls must exercise both success and failure

Where practical, use all of the following:

- **positive control:** a case where the measured mechanism should be detectable;
- **negative control:** a plausible case where it should not be detectable;
- **counterfactual control:** material drawn from another Thread/treatment or a matched non-event that exposes generic matching/overgeneralization;
- **deliberate-failure control:** a known violation that proves the guard/instrument can actually reject or detect failure.

Do not count a property as validated merely because every admitted case passes a diagnostic that had no condition expected to fail.

A positive control must be matched closely enough in difficulty to support sensitivity claims about the real task. Ceiling performance on an easier calibration does not automatically validate a harder test.

## 3. Preserve direction and separate distinct effects

Do not compress semantically different phenomena merely because one statistic can summarize both.

Examples:

- positive correlation and inverse correlation are different findings; `abs(rho)` may be useful for magnitude but must not erase direction;
- rank association and systematic location/valence shift are different effects and need separate measurements;
- memory coverage, citation cardinality, semantic accommodation and self-account overreach are different constructs;
- provider-form validity, semantic quality and scientific outcome are separate dimensions.

Derived labels may summarize, but the underlying per-item data and direction remain inspectable.

## 4. Repeated deterministic model calls are not independent samples

Multiple stateless calls to the same model at temperature zero, where the only planned variation is option ordering or deterministic presentation permutation, are **robustness checks**, not independent scientific replicates.

They may establish:

- sensitivity to answer-position/order;
- response stability under equivalent presentations;
- majority robustness against a narrow presentation artifact.

They do not by themselves establish sampling variance or multiply the number of independent observations.

Use terms such as `order-robustness checks` or `repeated deterministic measurements` unless the experimental design actually supports an independence assumption.

Report:

- logical observation count;
- committed evaluator-judgment count;
- physical provider attempts/retries;

as distinct quantities when they differ.

## 5. Post-hoc findings remain post-hoc

Unexpected structure in frozen data is valuable evidence for the next experiment, but it does not become a predeclared finding retroactively.

Record post-hoc observations with:

- their descriptive counts/effect size;
- any exploratory analysis clearly labeled as such;
- the prospective measurement needed to confirm them;
- no threshold change or replacement cohort.

Do not fit increasingly elaborate models to a small frozen cohort merely to turn an exploratory signal into significance. Prefer a future predeclared experiment with enough independent units for the intended model.

## 6. Confounding can invalidate both positive and null interpretations

A treatment perfectly or strongly confounded with age, history horizon, call ordinal, provider phase or another causal axis cannot cleanly support either:

- "the treatment caused the effect"; or
- "the treatment has no effect".

A null under confounding is not evidence of absence. A caveat field adjacent to an unconditional headline does not repair that problem; the headline itself must respect the identification limit.

Counterbalance treatment placement prospectively whenever the scientific claim depends on separating those axes.

## 7. Power/sensitivity belongs in the claim boundary

Before execution, state the smallest effect the planned design can credibly resolve.

After execution:

- failure to cross a threshold means only what the sensitivity boundary permits;
- an underpowered null is reported as inconclusive rather than absence;
- a positive result at ceiling may establish detectability but may have no headroom for regression or ranking.

Do not use a small-cell exact test as though it could detect modest effects when its significance threshold requires a gross effect.

## 8. Prospective holdouts require structural isolation

When a diagnostic relies on information being unavailable to cognition, "do not use this" prompt language is insufficient.

A prospective holdout must be excluded at the cognition/compiler boundary:

```text
sealed source
   -> provenance-taint closure
   -> excluded from cognition inputs and derived summaries
```

Required evidence:

- holdout selection before the cognition stage under test;
- exact source/provenance identifiers;
- transitive exclusion of derived semantic artifacts;
- per-call inclusion/exclusion manifests;
- a hard failure if any holdout-tainted source reaches cognition;
- a deliberate-leak test proving the firewall is active.

Prefer causally local holdouts whose later visible history does not implicitly reveal them. If later descendants expose the event, choose another holdout or seal the descendant closure explicitly.

Text-overlap checks are useful secondary sanity checks but are not authoritative isolation boundaries because semantic leakage can survive paraphrase.

## 9. Forbidden-information matches are audit triggers, not wins

If cognition is structurally forbidden to receive a fact, statistically preferential factual alignment with that fact cannot be credited as advanced reasoning, memory or personhood evidence.

Interpret against controls:

- own sealed holdout;
- matched plausible non-event;
- another Thread's sealed holdout;
- positive-control material that cognition was allowed to receive.

Then distinguish:

- **generic overgeneralization:** broad accommodation across true/fake/cross-Thread controls;
- **stochastic collision:** isolated surprising match without systematic excess;
- **provenance/isolation anomaly:** systematic preferential factual matching to forbidden own-history material.

A provenance/isolation anomaly triggers investigation of the firewall, world/context cues and derivation graph. It is never upgraded into semantic evidence for the Thread.

## 10. Separate thematic accommodation from factual alignment

Generative models often match abstract themes while missing concrete historical facts. A useful evaluator therefore separates:

- **thematic accommodation:** a broad self-understanding plausibly applies to an event;
- **episode-specific factual alignment:** concrete details or uniquely identifying structure align.

Some thematic generalization beyond remembered experience may be legitimate. The target is not "all holdouts must fail". Excessive accommodation must be interpreted relative to matched and counterfactual baselines.

## 11. Operational retries must not become scientific resampling

Provider timeouts, network failures and other clearly transient transport errors may be retried/resumed without changing the scientific trial **only while no valid judgment for that trial has been committed**.

Rules:

- commit an accepted judgment durably before advancing;
- never ask again for an already committed valid judgment;
- resume the same unfinished trial after transient interruption;
- bound/back off automatic transport-resume cycles;
- preserve/log operational failures relevant to interpreting execution;
- stop on provider-valid but diagnostic-invalid output rather than silently resampling;
- stop on auth/quota/configuration failures;
- do not retry a disappointing scientific judgment for quality.

Live evaluator execution is an explicitly authorized development/standing activity. Deterministic scoring and replay of frozen evidence should be provider-free and suitable for ordinary CI.

## 12. Scientific language follows instrument standing

Use the narrowest wording the instrument supports.

Preferred patterns:

- `reliably distinguishable under this task` rather than `particular person` when the test is a text-attribution task;
- `inconclusive at available sensitivity` rather than `no effect` when power/confounding blocks absence claims;
- `instrument confounded with citation presence` rather than a reassuring negative conclusion when a proxy dominates;
- `cohort exhibits saturation` rather than `all Genesis is pathological` when a deterministic cohort property has not yet been generalized beyond the cohort.

Mechanical/runtime evidence never supports identity, memory, meaning or character claims.

## PR39 methodological lesson

PR39's frozen D1-D5 run is the motivating case for these rules:

- D1 reached ceiling and retained environmental/cultural cues, so it established distinguishability rather than Fibre-level particularity;
- D2's original six-pair-per-Thread correlation bands were underpowered, while a post-hoc positive-reframing signal became prospective follow-up debt;
- D3 was confounded and under-sensitive, so genome propagation remained inconclusive;
- D4 directly exposed a `30/30` memory and `30/30` durable-meaning saturation/selectivity defect in the frozen cohort;
- D5's intended construct remained valid but `65/70` judgments tracked citation presence, so the executed instrument did not isolate self-account overreach;
- temperature-zero repeated calls with option permutation were robustness checks rather than independent replicates;
- durable operational resume preserved committed judgments through provider timeouts without rerating accepted results.

The accepted implementation follow-up is [`../state/genesis-selectivity-scientific-hardening.md`](../state/genesis-selectivity-scientific-hardening.md).