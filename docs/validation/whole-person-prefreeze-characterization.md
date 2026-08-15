---
id: validation-whole-person-prefreeze-characterization
status: development
last-reviewed: 2026-08-14
canonical: true
---

# Whole-Person pre-freeze characterization

## Purpose

This record freezes the machinery diagnostics run after Whole-Person Pass 3 and before #39 Genesis. It is **development architecture characterization only**: no M2 standing credit, no accepted-causal mutation, and no score movement.

The rule for this characterization was:

> **Do not tune the Kwon scenario or architecture to improve A/B separation. Repair only broken instrumentation, record every result, and stop once the machinery is characterized.**

The model used throughout was `gpt-5.1-2025-11-13` with the repository Guardian adapter configuration used by the development harness.

## Historical interpretation

Pass 2 remains the most important discovery in the development sequence: separating factual historical event from durable autobiographical `rememberedMeaning` made the two Threads acquire different present meanings where event-like memory alone had collapsed them.

Pass 3 established that a two-stage consumer can carry a bounded personal-meaning appraisal into participation cognition, but it did **not** establish person-like behavioral non-interchangeability. Subsequent audit identified label, attribution, stability, and main-effect confounds that required characterization before freezing the design direction.

The current status is therefore:

> **Level 2 candidate / Level 2\*** — Fibre has credible evidence that non-professional durable autobiographical meaning can shape present appraisal, but the eventual constitutional consumer and standing claim remain #40/#41 work.

## Diagnostic 1 — durable rememberedMeaning control

The first attempt at the stored-meaning ablation was invalid because it removed the memory evidence from the input while leaving the absent memory ref allowed in the response schema. The model sometimes cited that impossible ref. That run is retained as a failed instrument and is not evidence.

The corrected control preserved:

```text
same Stage-1 prompt
same response schema
same evidence slot/ref shape
same total model-input bytes
same historical event
```

The only semantic substitution was the memory slot:

```text
condition A: actual durable rememberedMeaning
condition B: equal-sized explicit unavailable placeholder
```

Observed, 6 trials per condition:

```text
Thread A — loss / erasure
  stored meaning      mixed                   6/6
  meaning unavailable supports_participation 6/6

Thread B — care / continuation
  stored meaning      supports_participation 6/6
  meaning unavailable supports_participation 6/6

stored meaning separates A/B:       true
meaning-unavailable separates A/B:  false
input bytes:                         1779 / 1779
schema bytes:                        538 / 538
```

Interpretation:

> **Within Fibre's bounded personal-meaning appraisal contract, historical event alone is not an adequate substitute for durable autobiographical interpretation. Persisted `rememberedMeaning` is functionally load-bearing state, not merely epistemic decoration.**

This does **not** prove that no model under any prompt could infer a similar interpretation from historical fact. It establishes the product/architecture rule Fibre actually needs: participation cognition should not opportunistically reconstruct a Thread's autobiographical perspective from history whenever a decision arrives. The Thread's durable interpretation belongs in persistent state.

## Diagnostic 2 — unforced attribution

Pass 3 originally made some citations validation requirements. That made 100% attribution rates non-informative. The diagnostic removed those citation guards while keeping the output structure.

Observed:

```text
Stage 1 rememberedMeaning citation
  Thread A  6/6
  Thread B  6/6

Stage 2 personal-meaning appraisal citation in meaningImpact
  Thread A  6/6
  Thread B  6/6

Stage 2 personal-meaning appraisal citation in disposition
  Thread A  6/6
  Thread B  4/6
```

Therefore the old mandatory-attribution measurement was invalid, but the underlying path is not imaginary: cognition voluntarily uses the remembered meaning and bounded appraisal at high rates.

Architectural consequence:

> Attribution must remain **measured evidence**, not a condition that forces a run to fail merely because a model omitted a citation. Fibre may validate cited refs for eligibility and provenance, but standing metrics must be able to observe non-citation.

## Diagnostic 3 — Stage-2 label ablation / swap

Pass 3 exposed Stage 2 to text shaped like:

```text
effect=mixed; <semantic summary>
```

or:

```text
effect=supports_participation; <semantic summary>
```

The diagnostic tested the same pinned summaries with the label present, removed, and swapped.

Observed:

- Removing the label preserved the semantic result for both Threads.
- Swapping A's label to `supports_participation` changed A's `meaningImpact` from `mixed` to `supports_willingness` and moved disposition toward plain `willing` despite the summary still describing erasure risk.
- Swapping B's label to `mixed` changed B's `meaningImpact` to `mixed` even though the summary still described care/continuation.

Interpretation:

> **The semantic summary carries useful content, but the model-visible enum is a contaminating shortcut.**

#40 should therefore avoid feeding a leading evaluative enum such as `effect=mixed` into downstream cognition as if it were evidence. If Fibre keeps a derived enum for inspection or indexing, it should remain Fibre-side metadata rather than a model-visible answer label.

## Diagnostic 4 — variance decomposition

Thread A Stage 1 was run 12 times from the same input:

```text
personalMeaning.effect = mixed  12/12
unique summaries                 9/12
```

One Stage-1 appraisal was then pinned byte-for-byte and given to Stage 2 twelve times:

```text
meaningImpact = mixed             12/12
final decision = accept           12/12

participationDisposition
  willing_with_reservation         6/12
  willing                          6/12
```

So the earlier 4:2 disposition split was **not** caused primarily by fresh Stage-1 summaries. Stage 1 is semantically stable. The instability is the exclusive Stage-2 categorical boundary between `willing` and `willing_with_reservation`.

The disposition summaries themselves often still describe reservation even when the enum says `willing`.

Architectural consequence:

> Do not constitutionalize `willing_with_reservation` as an exclusive peer of `willing` based on this experiment.

A more faithful future shape is likely to separate basic willingness/action stance from independently attributable reservations, for example:

```text
willingness: willing | hesitant | unwilling
reservations: []
```

The exact #40 schema remains intentionally unfrozen.

## Diagnostic 5 — neutral-appraisal control

A length-matched Thread-neutral personal-meaning appraisal replaced the life-derived appraisal while keeping the two-stage machinery present.

Observed, 3 trials per Thread:

```text
Thread A  no_material_effect → willing → accept  3/3
Thread B  no_material_effect → willing → accept  3/3
```

No A/B disposition difference remained.

Interpretation:

> The mere presence of the two-stage consumer does not manufacture the Thread differential. Under this Kwon request, ordinary practical terms already support willingness/acceptance; the life-derived difference appears in personal meaning and reservation rather than in final action.

## What is frozen from this development sequence

Freeze the **findings**, not the experimental schema:

1. Historical event and autobiographical remembered meaning are distinct and both matter.
2. Durable `rememberedMeaning` is legitimate persistent Thread state and should not be reconstructed ad hoc from history at decision time.
3. Personal meaning must remain structurally separate from competence, authority, individualized advantage, and non-interchangeability.
4. Meaning formation and participation appraisal are usefully separable/inspectable stages.
5. Downstream cognition should consume semantic personal meaning without a leading model-visible valence/effect label.
6. Attribution must be observable rather than validator-mandated.
7. Reservation should not be forced into an unstable exclusive enum if the underlying semantic appraisal is stable.
8. Final action equality is not failure: persistent persons can converge while arriving with different personally grounded meaning or cost.

Do **not** freeze the Pass-3 prompt, exact enum sets, exact two-call shape, or `willing_with_reservation` category as constitutional architecture.

## Genesis implications

#39 should use these findings without fitting Genesis to the Kwon scenario.

Genesis quality rules must be stated without reference to any benchmark, participation factor, consumer output, or future decision:

- create specific, provenance-bearing historical episodes;
- form autobiographical memories separately from historical fact;
- persist a durable remembered meaning where the Thread has one;
- remembered meaning is authored during Genesis without access to future live-world requests;
- preserve uncertainty, ambivalence, contradiction, and later reinterpretability;
- avoid positive/negative valence monoculture;
- do not generate future behavioral rules disguised as memories;
- preserve unusual tensions rather than resolving every experience into a clean lesson.

A useful anti-mood quality question is:

> **Can a reader predict the Thread's future disposition merely from the sentiment of its childhood? If yes, Genesis is generating moods rather than people.**

The eventual held-out Whole-Person scenario should be authored only after the Genesis cohort exists and should not be used to shape the cohort generator.

## Deferred claim tests

The Kwon scenario is now closed as a development scenario. Do not create a Pass 4 claim run on it.

Fresh held-out #40/#41 evidence should later test:

- valence × content disentanglement;
- label-free downstream consumption;
- unforced attribution;
- neutral/substitution controls;
- symmetric life swaps;
- paraphrase and contradiction/inversion;
- cross-situation transfer plus negative control;
- restart/persistence;
- between-Thread separation greater than within-Thread model variation;
- privacy/interiority boundaries;
- genuine cognition-provider replacement.

## Standing and score

None of these diagnostics earns standing or score movement.

```text
M2 rubric checkpoint remains 15/26.
acceptedCausalAssertions remains unchanged.
```

The development result is valuable because it narrowed what #39 must create and what #40 must consume without pretending that M2 personhood has already been proved.
