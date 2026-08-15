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

### Scope and asymmetry

The convergence is one-sided: Thread A moves from `mixed` to `supports_participation` when its durable interpretation is unavailable; Thread B remains `supports_participation` in both conditions.

That means `supports_participation` behaves as this consumer's default in the corrected control, and the observed separation is carried by Thread A alone. The result therefore demonstrates one concrete case where stored autobiographical interpretation moves an appraisal away from the consumer default. It does **not** establish a general symmetric effect across meanings or valences.

A live alternative explanation remains that this consumer has a pro-participation prior and only sufficiently negative/ambivalent content moves it. That is a #40 weighting/consumer question, not a reason to omit or flatten autobiographical interpretation in #39.

The unavailable condition is also stronger than literal absence: it explicitly says that no durable interpretation is recorded. The bounded empirical claim is therefore about this consumer under that manipulation, not about all possible reconstruction strategies.

### Empirical finding

> **Within Fibre's bounded personal-meaning consumer, under a fixed prompt/schema/input shape, the historical event alone did not sustain Thread A's stored interpretation; the appraisal reverted to the consumer default when durable `rememberedMeaning` was marked unavailable.**

This does not prove that no dedicated reconstruction stage or other prompt could infer a similar interpretation from historical fact.

### Architectural rule and independent warrant

> **`rememberedMeaning` is durable Thread state whether or not a model could reconstruct a similar interpretation later.**

The warrant is Fibre's persistence model, not reconstruction difficulty. An interpretation re-derived separately at each future decision has no stable revision history, cannot be disputed/corrected/retracted as the Thread's own durable autobiographical state, cannot be cited consistently across judgments, and may silently change between two appraisals of the same past. That is the same integrity reason Fibre keeps history and memory as durable ledgers rather than disposable prompt inferences.

The experiment supports this architecture; it does not carry the architecture by itself.

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

- Removing the label preserved the semantic result for both Threads. A still produced `mixed → willing_with_reservation → accept`; B still produced `supports_willingness → willing → accept`.
- Swapping A's label to `supports_participation` changed A's `meaningImpact` from `mixed` to `supports_willingness` despite the summary still describing erasure risk.
- Swapping B's label to `mixed` changed B's `meaningImpact` to `mixed` even though the summary still described care/continuation.

Interpretation:

> **The semantic summary carries useful content on its own, while the model-visible enum can override contradictory semantic content.**

This confirms the broader Fibre rule now recorded in `AGENTS.md`:

> **A derived category is never a safe stand-in for the semantic meaning it compresses.**

#40 should therefore avoid feeding Fibre-derived verdicts such as `effect=mixed`, relevance ranks, confidence/strength flags, or similar conclusions into downstream cognition as though they were the evidence itself. Types and provenance may be visible. Derived categories may remain Fibre-side metadata for inspection, indexing, control, or ablation.

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

So the earlier 4:2 disposition split was **not** caused primarily by fresh Stage-1 summaries. Stage 1 is semantically stable. The instability is the exclusive Stage-2 categorical boundary between `willing` and `willing_with_reservation`, sandwiched between stable `meaningImpact` and stable final decision.

The raw summaries appear to preserve reservation more often than the enum, but that impression has not been blind-rated and is not treated as a measured result.

Architectural consequence:

> Do not constitutionalize `willing_with_reservation` as an exclusive peer of `willing` based on this experiment.

The exact #40 schema remains intentionally unfrozen. One plausible future shape is to separate basic willingness from independently attributable reservation content, but that remains a #40 design question rather than a #39 persistence requirement.

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

## Cross-diagnostic principle

Three unrelated diagnostics exposed the same architectural pattern:

```text
historical event       != rememberedMeaning
derived effect enum    != semantic meaning summary
disposition category   != full reservation semantics
```

Therefore Fibre adopts the general rule:

> **A compressed category is never a safe stand-in for the meaning it was derived from. Semantic content remains separately addressable and authoritative; derived categories are secondary views.**

This principle governs #39 meaning persistence, #40 capsule/consumer design, and future personhood-bearing factor schemas.

## What is frozen from this development sequence

Freeze the **findings**, not the experimental schema:

1. Historical event and autobiographical remembered meaning are distinct persistent substrates.
2. In the corrected control, Thread A's stored meaning moved appraisal off the consumer default while Thread B matched the default in both conditions; the demonstrated generality is therefore one-arm/existential, not symmetric across meanings.
3. Durable `rememberedMeaning` is legitimate persistent Thread state for independent persistence/integrity reasons, not because reconstruction is assumed impossible.
4. Personal meaning must remain structurally separate from competence, authority, individualized advantage, and non-interchangeability.
5. Meaning formation and participation appraisal are usefully separable/inspectable concepts.
6. Downstream cognition should consume semantic personal meaning without a leading model-visible verdict/effect label.
7. Attribution must be observable rather than validator-mandated.
8. Reservation should not be constitutionalized as an unstable exclusive enum when the surrounding semantic appraisal and action are stable.
9. Final action equality is not failure: persistent persons can converge while arriving with different personally grounded meaning or cost.
10. A derived category is not a substitute for the semantic meaning it compresses.

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
- preserve unusual tensions rather than resolving every experience into a clean lesson;
- when a remembered meaning is genuinely ambivalent, persist the constituent tensions as separately addressable semantic parts rather than relying only on a single blended paragraph or `mixed` category.

A useful anti-mood quality question is:

> **Can a reader predict the Thread's future disposition merely from the sentiment of its childhood? If yes, Genesis is generating moods rather than people.**

The eventual held-out Whole-Person scenario should be authored only after the Genesis cohort exists and should not be used to shape the cohort generator.

## Deferred claim tests

The Kwon scenario is now closed as a development scenario. Do not create a Pass 4 claim run on it.

Fresh held-out #40/#41 evidence should later test:

- valence × content disentanglement;
- whether different ambivalent meanings remain distinguishable downstream;
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
