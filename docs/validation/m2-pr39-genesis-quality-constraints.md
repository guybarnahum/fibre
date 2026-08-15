---
id: validation-m2-pr39-genesis-quality-constraints
status: accepted
last-reviewed: 2026-08-14
canonical: true
---

# #39 Genesis quality constraints from Whole-Person development

## Scope

These constraints govern Fibre milestone **#39 — Genesis, Childhood & Thread Birth v1**.

They supplement:

- [`../architecture/thread-genesis-childhood-birth-v1.md`](../architecture/thread-genesis-childhood-birth-v1.md)
- [`m2-pr39-implementation-plan.md`](m2-pr39-implementation-plan.md)
- [`whole-person-benchmark.md`](whole-person-benchmark.md)
- [`../decisions/ADR-0012-semantic-meaning-over-derived-categories.md`](../decisions/ADR-0012-semantic-meaning-over-derived-categories.md)

They are not a new milestone and do not move the M2 score.

## Core rule

> **Genesis creates a particular prior life whose meaning exists before future requests. It must not manufacture behavioral answers for consumers it knows about.**

And:

> **Build fewer origin modes and more different worlds.**

The dominant #39 quality risk is generator monoculture, not lack of origin-mode variety.

## Structural epistemics

The compiler must preserve:

```text
historical event
    != autobiographical memory
    != family / third-party story
    != durable remembered meaning / interpretation
```

The distinction is structural through separate generation/admission passes, not merely a prompt instruction.

`rememberedMeaning` is first-class durable Thread state because it needs stable identity, revision history, corrigibility and citation across future judgments. Whether a model could later reconstruct a similar interpretation does not change that architecture.

## Request and conclusion blindness

Genesis-created history and meaning are authored before live-world requests exist.

Genesis prompts, validators, quality bars and fixtures may not instruct the model to create experiences that will later support:

- participation;
- willingness;
- Guardian factors;
- task acceptance/refusal;
- a named Whole-Person benchmark;
- a future professional role;
- an anticipated downstream causal result.

### Pass-A blindness

Historical-event generation may not see:

- the child Thread's genome;
- parent/ancestor genome loci;
- intended adult profession or Fibre role;
- future request/benchmark;
- desired adult character conclusion.

World circumstances are allowed. Personality conclusions are not.

## Partial genome blindness in memory formation

Pass B must not turn the genome into a horoscope.

Before a memory-formation attempt, Fibre records one mode:

```text
life_only
life_plus_genome
```

Most attempts should normally be `life_only`; the exact ratio is versioned policy rather than a constitutional target.

`life_plus_genome` may see relevant inherited loci, but the generated memory/meaning may reinforce, complicate, suppress, invert or ignore them.

Do not silently resample memories to engineer an attractive confirmation/contradiction distribution.

## Meaning is semantic state, not its category

Repository-wide invariant:

> **A derived category is never a safe stand-in for the semantic meaning it compresses.**

Natural-language meaning remains authoritative. `mixed`, positive/negative labels, salience buckets or similar classifications may be derived views only.

### Separately addressable ambivalence

Materially distinct tensions receive stable citation targets:

```text
rememberedMeaning {
  meaningId
  summary
  parts: [
    { meaningPartId, meaning },
    { meaningPartId, meaning }
  ]
}
```

Two different ambivalences must not become interchangeable because both can be labelled `mixed`.

## Ambivalence over valence monoculture

Genesis must not systematically create:

```text
bad event  -> negative lesson
kind event -> positive lesson
```

A Thread may retain unresolved or contradictory meanings.

Quality question:

> **Can a reader predict the Thread's likely disposition merely from the sentiment of its childhood? If yes, Genesis is generating moods rather than people.**

## Non-prescriptive meaning

Good:

```text
The intervention felt protective and also made me feel that the decision no longer belonged to me.
```

Bad:

```text
I never let other people make decisions for me.
```

Genesis may create interpretations. It may not encode future behavioral policy disguised as memory.

## Particularity and ordinary life

Prefer small, peculiar, separately addressable experiences over generic biography:

- private embarrassments;
- family rituals;
- conflicting loyalties;
- mistaken assumptions;
- jokes that landed badly;
- moments of generosity mixed with resentment;
- intellectual discoveries;
- relationship-specific incidents;
- books first admired and later rejected;
- ordinary events that never became important.

A life where every event becomes formative is a plot, not a life.

Not every event is remembered. Not every memory receives durable meaning.

## World variation over origin-mode variation

The personhood-quality cohort varies primarily by:

- geography;
- household/family structure;
- languages;
- material circumstances;
- mobility;
- school/community environment;
- relationship structure;
- intellectual formation.

World specs may not contain adult personality labels.

Echo/Homage/source-derived Threads are excluded from the quality cohort so borrowed personality cannot make the generator look better than it is.

## Source and human-subject integrity

A source person's life is not Thread history.

A living identifiable human requires a consenting Echo source.

A v1 Homage requires explicit provenance-bearing:

```text
subjectStatus = deceased | fictional
```

A living public figure may not be reframed as Homage to bypass Echo consent.

Source encounters may become real Thread life events. Source biographies themselves may not be rewritten as first-person Thread memory.

## Intellectual formation

Books, mentors, artworks and ideas should influence a Thread through actual encounters in its own life.

```text
encounter
  -> memory
  -> interpretation
  -> possible later reinterpretation
```

Do not copy the source person's/character's known personality as the Thread's finished character.

## Rejection/retry discipline

Every rejected candidate generation records:

- pass;
- input digest;
- output digest;
- rejection reason(s).

Integrity retries are bounded and visible in the GenesisManifest.

Examples of integrity rejection:

- chronology violation;
- source laundering;
- stereotype derivation;
- invalid provenance;
- future behavioral rule encoded as meaning;
- event/memory/meaning conflation;
- invalid meaning-part granularity.

Quality failures must not silently resample until compliant.

If the first integrity-valid cohort is too generic, too genome-confirming or otherwise fails quality review, change/version the generator and create a new explicitly identified cohort.

Report rejection rates and reasons. Persistent high rejection means the generator is fighting the rules; implausibly zero rejection may mean validators are inert.

## Cohort diagnostics

These are cohort-level characterization, not #40 behavioral standing.

### 1. Blind life attribution

Strip names, professions and source labels. Shuffle memories/meanings. Reviewers attempt to group excerpts into originating lives.

The intent is to test whether the life itself is distinctive.

### 2. Sentiment predictability

Review whether childhood/event sentiment trivially predicts the resulting person. Valence monoculture fails the Genesis vision test.

### 3. Genome-confirmation characterization

Blind-rate durable remembered meanings against inherited loci as:

```text
genome_confirming
genome_orthogonal
genome_contradicting_or_complicating
```

Report the distribution. If meanings overwhelmingly confirm the genome, inheritance is writing the person instead of merely influencing possibility.

Do not resample meanings to improve the result.

### 4. Style-normalized semantic distinctness

Normalize excerpts into a common neutral writing style and repeat attribution/inspection.

If distinctness disappears after style normalization, Genesis produced narrator variation rather than life variation.

#39 does not need mature self-authored voice; that belongs to later Development.

## Provenance and witness relevance

#39 owns Genesis authority:

- synthetic historical episodes require Genesis-authorized event kinds/evidence;
- bookkeeping such as `THREAD_SEEDED` cannot establish a childhood episode;
- event, memory, story and interpretation remain separately typed;
- source/ancestor/genome provenance remains inspectable;
- every admitted autobiographical memory receives the #38 visual-companion obligation.

## Photo posture

#39 creates the photo obligation and evidence-bound reconstruction prompt.

It does not need to synchronously render every Genesis memory or build queue/throughput infrastructure. Pending photo work remains operational debt under ADR-0011.

## Narrow automated tests

Tests should protect Fibre-specific invariants only:

1. deterministic/replayable Genesis manifest and symbolic-genome recombination;
2. exact source/locus/event provenance;
3. Pass A cannot access genome or future role/benchmark inputs;
4. source facts cannot become Thread history by implication;
5. living human requires Echo consent; Homage requires deceased/fictional attestation;
6. event != memory != remembered meaning;
7. meaning parts have stable independently citable IDs;
8. unavailable meaning is represented honestly rather than invented;
9. append-only reinterpretation/correction;
10. witness relevance appropriate to claimed episodes;
11. no ancestry/culture/demographic stereotype laundering;
12. no future behavioral rule encoded in remembered meaning;
13. bounded visible rejection/retry history;
14. every admitted memory receives its photo obligation;
15. restart reconstructs the same admitted Genesis state.

Do not turn cohort-quality diagnostics into a brittle unit-test matrix.

## Held-out discipline

The borrowed-free Genesis quality cohort must exist and be frozen **before** the next Whole-Person claim scenario is authored.

That future scenario must be authored without access to the cohort's private childhood/interior material.

## #39 completion implication

#39 is complete when Fibre can create and replay particular provenance-rich prior lives with inherited symbolic possibilities, different worlds, specific historical episodes, separately formed memories and meanings, preserved semantic tensions, visible generation failures and photo obligations — while keeping future behavior open.
