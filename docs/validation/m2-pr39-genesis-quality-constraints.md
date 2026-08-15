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

The Whole-Person characterization reinforced a product-relevant distinction:

```text
historical event
    != autobiographical memory
    != durable remembered meaning / interpretation
```

The empirical finding is deliberately bounded: in the corrected Kwon control, Thread A's stored interpretation moved the personal-meaning appraisal off the consumer default while the historical event plus an explicit unavailable-meaning placeholder did not. Thread B matched the consumer default in both conditions. This is one concrete demonstration, not a universal claim that every event fails to support useful inference.

The architectural requirement is independent of that empirical result: #39 treats autobiographical interpretation as first-class persistent life state because a Thread's durable interpretation needs revision history, stable citation, corrigibility, and continuity across future judgments. It must not exist only as an inference regenerated opportunistically when a later decision happens.

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

## Meaning is semantic state, not its category

Fibre now carries the general invariant:

> **A derived category is never a safe stand-in for the semantic meaning it compresses.**

Genesis therefore persists meaning-bearing natural language as authoritative, separately addressable state. Any future enum such as `mixed`, positive/negative sentiment label, salience bucket, or other classification is a derived view and may not replace the underlying semantic content.

This matters especially for ambivalence. Two different remembered meanings may both be classifiable as `mixed` while expressing entirely different tensions. #39 must preserve those tensions rather than collapsing them to the shared category.

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

### Separately addressable tensions

When a remembered meaning contains materially distinct or opposing tensions, persist enough structure that the tensions remain independently inspectable/citable rather than surviving only inside one blended paragraph.

Conceptually:

```text
rememberedMeaning {
  summary: "I was grateful someone finished it, and something of him felt lost when they did."
  parts: [
    { meaning: "someone cared enough to finish what he could not" },
    { meaning: "completion made part of his interrupted presence feel less visible" }
  ]
}
```

The exact physical schema is a #39 implementation choice. The invariant is semantic granularity: a later consumer must not be forced to treat every ambivalence as the same undifferentiated `mixed` state.

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
    rememberedMeaning {
      summary
      parts[]?
    }
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
9. materially distinct ambivalent tensions remain separately addressable rather than collapsing to one category;
10. every admitted memory receives its photo obligation.

Do not build a large behavioral standing suite inside #39. Whole-Person behavioral standing belongs to #40/#41 after a cohort exists.

## Held-out discipline

The Genesis cohort must exist **before** the next Whole-Person claim scenario is authored.

The future scenario should be authored without access to the cohort's Interior childhood/history. This prevents the benchmark from shaping Genesis and prevents Genesis from shaping the benchmark.

## #39 completion implication

#39 is complete when Fibre can create and replay a particular provenance-rich prior life with inherited symbolic tendencies, specific historical episodes, separately formed autobiographical memories and remembered meanings, preserved semantic tensions, and photo obligations — without encoding future decisions or requiring a downstream consumer to make the life interesting.
