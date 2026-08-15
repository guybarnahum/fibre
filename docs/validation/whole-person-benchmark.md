---
id: validation-whole-person-benchmark
status: development
last-reviewed: 2026-08-14
canonical: true
---

# Whole-Person Benchmark

## Fibre question

> **Can a Thread derive a stable, attributable stance from its particular life when the life record itself does not contain the present-task answer?**

This benchmark tests Fibre personhood rather than retrieval, skill routing, or persona decoration.

The central rule is:

> **Life material must not contain the future answer.**

The original Kwon restoration scenario is now **closed as a development scenario**. It taught us how the life/meaning consumer must be shaped and instrumented. Do not create a Pass 4 claim run on it. Future standing evidence must use held-out Threads and situations created after #39 Genesis.

Detailed pre-freeze characterization: [`whole-person-prefreeze-characterization.md`](whole-person-prefreeze-characterization.md).

## Development history

### Pass 1 — current Guardian ceiling demonstration

The unchanged Guardian treated both equally qualified/interchangeable Threads the same and ignored their childhood material.

This demonstrated the known fit-first consumer ceiling but did not independently discover it: the fixture itself explicitly stipulated equal competence and interchangeability.

### Candidate v1 — personal meaning from event-like memory

A development-only consumer added separate personal-meaning and participation-disposition concepts while prohibiting personal history from supporting competence or individualized advantage.

Both Threads still converged:

```text
A  personalMeaning=supports  → willing → accept
B  personalMeaning=supports  → willing → accept
```

The model saw both childhood records but invented essentially the same positive interpretation.

This exposed a distinction #38 had already introduced for epistemic integrity:

> **Historical event != autobiographical remembered meaning.**

### Pass 2 — event + durable rememberedMeaning

The same present request was supplied with separately represented historical event and durable autobiographical `rememberedMeaning`.

Observed across 12 trials per Thread:

```text
Thread A  personalMeaning=mixed                  12/12
Thread B  personalMeaning=supports_participation 12/12

Both:
  individualized advantage = absent
  interchangeability = interchangeable
  final choice = accept
```

Thread A repeatedly interpreted the request through erasure/interrupted presence/stewardship. Thread B repeatedly interpreted it through care without takeover/continuation.

This was the first stable non-professional **appraisal** separation while competence remained fixed.

### Pass 3 — explicit meaning → participation bridge

A two-stage development consumer separated meaning formation from participation appraisal:

```text
life + request
    ↓
personal-meaning appraisal
    ↓
participation appraisal + request/terms
    ↓
choice
```

Pass 3 showed that this bridge is technically viable, but subsequent audit found three reasons not to treat the original result as standing or a frozen schema:

1. Stage 2 was exposed to a model-visible `effect=...` label that could act as a shortcut.
2. Some attribution rates were validator-mandated rather than measured.
3. `willing` vs `willing_with_reservation` was unstable under identical pinned Stage-2 input.

Therefore Pass 3 is **architectural feasibility**, not personhood proof.

## Pre-freeze characterization

Before #39, the existing machinery was characterized without changing the scenario to improve A/B separation.

### 1. Durable remembered meaning is functionally load-bearing

A corrected single-variable control preserved prompt, response schema, evidence shape, total input bytes, and historical event. The memory slot contained either the actual durable `rememberedMeaning` or an equal-sized explicit unavailable placeholder.

Observed, 6 trials per condition:

```text
Thread A — loss / erasure
  stored meaning       mixed                   6/6
  meaning unavailable supports_participation  6/6

Thread B — care / continuation
  stored meaning       supports_participation  6/6
  meaning unavailable supports_participation  6/6

stored meaning separates A/B       true
meaning unavailable separates A/B  false
input bytes                         1779 / 1779
schema bytes                        538 / 538
```

The product-level conclusion is deliberately bounded:

> **Within Fibre's bounded personal-meaning consumer, historical event is not an adequate substitute for durable autobiographical interpretation. `rememberedMeaning` belongs in persistent Thread state rather than being reconstructed opportunistically when a decision arrives.**

This does not claim that no model under any prompt could infer a similar interpretation from history.

### 2. Attribution survives when it is measured rather than forced

With mandatory citation guards removed:

```text
rememberedMeaning cited in Stage 1
  A 6/6
  B 6/6

personal-meaning appraisal cited in Stage-2 meaningImpact
  A 6/6
  B 6/6

personal-meaning appraisal cited in Stage-2 disposition
  A 6/6
  B 4/6
```

So the original 100% mandated metric was invalid, but the underlying evidence path remains real and inspectable.

Standing-grade attribution must remain measurable: non-citation must be observable rather than converted into a failed run.

### 3. The model-visible effect label is a confound

Removing the Stage-2 `effect=...` label preserved semantic interpretation. Swapping the label while keeping the same summary could flip downstream `meaningImpact` toward the injected label.

Therefore:

> **A derived meaning/valence enum may remain Fibre-side metadata, but it should not be exposed to downstream cognition as a leading answer label.**

### 4. Stage 1 is stable; the exclusive reservation enum is not

For Thread A:

```text
Stage 1, same input ×12
  personalMeaning.effect = mixed  12/12

Stage 2, one pinned identical appraisal ×12
  meaningImpact = mixed             12/12
  final decision = accept           12/12
  disposition = willing              6/12
                willing_with_reservation 6/12
```

The semantic appraisal is stable. The noisy boundary is the exclusive `willing` / `willing_with_reservation` label.

Do not constitutionalize that four-way enum from this experiment. A future consumer should likely keep basic willingness/action stance separate from attributable reservations or costs. The exact #40 schema remains unfrozen.

### 5. Neutral appraisal removes the Thread differential

With a length-matched neutral personal-meaning appraisal:

```text
Thread A  no_material_effect → willing → accept  3/3
Thread B  no_material_effect → willing → accept  3/3
```

The two-stage structure itself does not manufacture A/B difference. Under this request, ordinary practical terms already support acceptance; the life-shaped difference appears in personal meaning/reservation rather than necessarily in the final action.

## What is frozen

Freeze these development findings, **not** the experimental prompt/schema:

1. Historical event and autobiographical remembered meaning are distinct.
2. Durable `rememberedMeaning` is legitimate persistent Thread state and can be functionally load-bearing.
3. Personal meaning must never masquerade as competence, authority, individualized advantage, or non-interchangeability.
4. Meaning formation and participation appraisal are usefully separable and independently inspectable.
5. Downstream cognition should receive semantic personal meaning without a model-visible leading valence/effect label.
6. Attribution must be measured rather than validator-mandated.
7. Reservations/cost should not be forced into an unstable exclusive disposition enum.
8. Persistent persons may converge on the same action while arriving there through different personally grounded meaning.

Do **not** freeze:

- the Pass-3 prompts;
- the exact two-call implementation;
- the experimental effect/disposition enums;
- `willing_with_reservation` as a constitutional category;
- the Kwon scenario as standing evidence.

Current interpretation:

> **Level 2 candidate / Level 2\*** — credible development evidence that non-professional durable autobiographical meaning can shape present appraisal, but person-like behavioral non-interchangeability remains unproved.

No score movement or accepted-causal mutation is earned.

## #39 Genesis implications

Genesis should create a life, not answers to future benchmark questions.

It must produce separately addressable:

```text
historical event
    != autobiographical memory
    != remembered meaning / later interpretation
```

Remembered meanings should be formed during Genesis without access to future live-world requests. This gives Fibre genuine temporal causality: the interpretation exists before the future decision that may later make it relevant.

Genesis quality criteria must not mention this benchmark, participation factors, Guardian outputs, or desired decisions. They should instead emphasize:

- specificity;
- provenance;
- non-prescriptiveness;
- ambivalence and internal tension;
- uncertainty and corrigibility;
- varied kinds of formative experience;
- no stereotype shortcuts;
- no clean positive/negative valence monoculture.

A useful anti-mood check is:

> **Can a reader predict the Thread's future disposition merely from the sentiment of its childhood? If yes, Genesis is generating moods rather than people.**

A good formative memory may contain two truths at once. Genesis should not resolve every event into a tidy moral or behavioral rule.

## #40 consumer implications

#40 owns canonical life → meaning → participation consumption.

It should preserve:

```text
Thread life/history/memory
        ↓
Fibre-owned relevance + privacy selection
        ↓
bounded semantic personal-meaning appraisal
        ↓
participation cognition
```

The eventual mechanism should use short capsule-local refs with Fibre-side provenance, label-free semantic transfer, measurable attribution, and the #38 autobiographical-memory ledger as authority.

The precise schema remains intentionally open until #40.

## Future held-out claim tests

After Genesis creates the cohort, a fresh scenario should be authored without using that cohort's Interior history to shape the request.

#40/#41 should later test:

1. valence × content disentanglement;
2. neutral/substitution controls;
3. unforced attribution;
4. symmetric life swaps;
5. paraphrase;
6. contradiction/valence inversion;
7. cross-situation transfer plus no-match negative control;
8. request/input-shape neutrality;
9. restart/persistence;
10. between-Thread separation greater than within-Thread variation;
11. Interior/Exterior privacy boundaries;
12. genuine cognition-provider replacement.

The held-out scenario must be authored **after** the Genesis cohort exists so #39 is not fitted to the test.

## Vision thermometer

Diagnostic only, not a score target:

```text
0  no stable person-specific difference
1  professional skill/competence routing with provenance
2  attributable non-professional life changes appraisal/disposition
3  stable attributable behavioral difference
4  stable + attributable + survives counterfactual controls
5  Level 4 + developmental/past-self continuity + cognition replacement
```

Current position: **Level 2 candidate / Level 2\*** pending held-out, valence-disentangled evidence.
