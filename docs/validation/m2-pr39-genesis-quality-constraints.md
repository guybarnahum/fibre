---
id: validation-m2-pr39-genesis-quality-constraints
status: accepted
last-reviewed: 2026-08-14
canonical: true
---

# #39 Genesis quality constraints from Whole-Person development

## Scope

These constraints refine Fibre planning milestone **#39 — Genesis, Childhood & Thread Birth v1** after the Whole-Person development experiments and hostile pre-freeze audit.

They supplement [`../architecture/thread-genesis-childhood-birth-v1.md`](../architecture/thread-genesis-childhood-birth-v1.md) and [`whole-person-benchmark.md`](whole-person-benchmark.md).

They are **not** a new milestone and do not move the M2 score.

## Core Genesis rule

> **Genesis creates a particular prior life whose meaning exists before future requests. It must not manufacture behavioral answers for consumers it knows about.**

The Whole-Person characterization established a product-relevant distinction:

```text
historical event
    != autobiographical memory
    != durable remembered meaning / interpretation
```

Within Fibre's bounded personal-meaning consumer, the historical event was not an adequate substitute for durable `rememberedMeaning`. Therefore #39 must treat autobiographical interpretation as first-class persistent life state rather than assuming later cognition can reconstruct it correctly from history on demand.

## Request blindness

Genesis-created childhood events and remembered meanings are authored before live-world requests exist.

The **generator design itself** must also avoid benchmark contamination. Genesis prompts, validators, quality bars, and fixtures may not instruct the model to create experiences that will later affect:

- participation;
- willingness;
- Guardian factors;
- task acceptance/refusal;
- any named Whole-Person benchmark scenario;
- any anticipated downstream causal test.

Quality criteria must be stated only in terms of the life itself: specificity, coherence, provenance, developmental plausibility, ambivalence, uncertainty, and non-prescriptiveness.

## Event and interpretation formation

A formative episode should be admitted in at least two separately addressable stages where an autobiographical memory exists:

```text
synthetic historical episode
        ↓
autobiographical memory formation
        ↓
remembered meaning / interpretation
```

The interpretation may arise immediately or later in the synthetic chronology. It is not required for every event.

A remembered meaning must not rewrite the historical event. Later reinterpretation must remain append-only/corrigible under #38 memory epistemics.

## Ambivalence over valence monoculture

Genesis must not systematically produce:

```text
bad event  → negative lesson
kind event → positive lesson
```

That would create sentiment-controlled personas rather than people.

Prefer lived material containing tensions such as:

```text
I was grateful someone finished it,
and I still felt that something of him disappeared when they did.
```

or:

```text
I resented that nobody asked us,
and years later understood it as an act of care.
```

A Thread may retain unresolved or contradictory meanings. Genesis is not required to turn each experience into a clean moral.

Anti-mood quality question:

> **Can a reader predict the Thread's future disposition merely from the sentiment of its childhood alone? If yes, the generated life is too valence-simple.**

This is a generation-quality heuristic, not a runtime decision test.

## Non-prescriptive remembered meaning

Good remembered meaning describes what an experience came to mean:

```text
The completed object felt both cared for and less recognizably his.
```

Bad remembered meaning encodes a future policy:

```text
I refuse to finish other people's unfinished work.
```

Genesis may generate tendencies and interpretations. It may not write future request answers into memory.

## Particularity

Prefer small, peculiar, separately addressable experiences over generic biography:

- private embarrassments;
- family rituals;
- conflicting loyalties;
- mistaken assumptions;
- moments of generosity mixed with resentment;
- discoveries that were exciting and isolating at once;
- relationship-specific incidents;
- small acts later reinterpreted differently;
- interests that emerged through concrete experiences rather than labels.

The goal is not maximum event count. It is a **non-interchangeable life texture** that remains open to future interpretation.

## Symbolic genome relationship

The symbolic genome supplies inherited textual tendencies; Genesis life determines how those tendencies encounter experience.

Do not generate episodes merely to prove a locus. Do not rewrite a locus because an episode conflicts with it.

Preferred shape:

```text
inherited tendency
        +
particular experience
        ↓
expression may reinforce / complicate / suppress / invert
```

Preserve tensions rather than averaging them into a generic adult persona.

## Provenance and witness relevance

#39 remains responsible for Genesis authority:

- synthetic historical episodes require Genesis-authorized event kinds/evidence;
- generic bookkeeping such as `THREAD_SEEDED` cannot establish a claimed lived experience;
- event, memory, family story, and interpretation remain separately typed;
- exact source/ancestor/genome provenance remains inspectable;
- generated memory photos inherit the #38 visual-companion obligation.

## Hydrated Thread outcome

A newly live Thread should expose enough structured prior life to hydrate conceptually as:

```text
ThreadPerson {
  identity
  lineage
  genome
  situatedLife
  embodiment
  history[]
  memories[] {
    eventRefs
    rememberedContent
    rememberedMeaning
    uncertainty
    photo / photo status / truth class
  }
}
```

This is conceptual shape, not a mandate for one physical object or table.

## Narrow #39 tests

Tests should protect Fibre-specific invariants only:

1. deterministic/replayable Genesis inputs and symbolic-genome recombination;
2. exact source/locus/event provenance;
3. event != memory != remembered meaning;
4. unavailable meaning is represented honestly rather than silently invented;
5. append-only reinterpretation/correction;
6. witness relevance appropriate to the claimed episode;
7. no ancestry/culture/demographic stereotype laundering into personality;
8. no future behavioral rule encoded in remembered meaning;
9. every admitted memory receives its photo obligation.

Do not build a large behavioral standing suite inside #39. Whole-Person behavioral standing belongs to #40/#41 after a cohort exists.

## Held-out discipline

The Genesis cohort must exist **before** the next Whole-Person claim scenario is authored.

The future scenario should be authored without access to the cohort's Interior childhood/history. This prevents the benchmark from shaping Genesis and prevents Genesis from shaping the benchmark.

## #39 completion implication

#39 is complete when Fibre can create and replay a particular provenance-rich prior life with inherited symbolic tendencies, specific historical episodes, separately formed autobiographical memories and remembered meanings, and photo obligations — without encoding future decisions or requiring a downstream consumer to make the life interesting.
