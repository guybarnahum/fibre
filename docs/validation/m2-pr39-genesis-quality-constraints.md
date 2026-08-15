---
id: validation-m2-pr39-genesis-quality-constraints
status: accepted
last-reviewed: 2026-08-15
canonical: true
---

# #39 Genesis quality constraints from Whole-Person development

## Scope

These constraints govern Fibre milestone **#39 — Genesis, Childhood & Thread Birth v1**.

They supplement:

- [`../vision/interpretive-personhood.md`](../vision/interpretive-personhood.md)
- [`../architecture/thread-genesis-childhood-birth-v1.md`](../architecture/thread-genesis-childhood-birth-v1.md)
- [`m2-pr39-implementation-plan.md`](m2-pr39-implementation-plan.md)
- [`../decisions/ADR-0012-semantic-meaning-over-derived-categories.md`](../decisions/ADR-0012-semantic-meaning-over-derived-categories.md)

They are not a new milestone and do not move the M2 score.

## Core rules

> **Genesis creates a particular prior life whose meaning exists before future requests. It must not manufacture behavioral answers for consumers it knows about.**

> **Build fewer origin modes and more different worlds.**

> **Culture is texture, not conclusion.**

The dominant #39 quality risks are generator monoculture, plot-shaped biography, genome-as-horoscope, cultural determinism, source-personality leakage, and perfectly authored self-coherence.

## Structural epistemics

The compiler must preserve:

```text
historical event
    != autobiographical memory
    != family / third-party story
    != durable remembered meaning / interpretation
```

`rememberedMeaning` is first-class durable Thread state. History is allowed to contain material the current memory/meaning account omits, misunderstands, or cannot integrate.

A cohort in which every self-account perfectly explains its own history is suspiciously authored.

## Source/world firewall

Fiction and documentary material may inform **human authorship** of WorldSpecs, abstract event structures, and Pass-C calibration. The compiler does not receive the title, author, character names, quotations, or famous fictional coordinates merely because a source inspired an abstraction.

> **Take the structure; move the instance.**

Do not lift a connected event set from one work. Pool abstract event structures across sources/traditions and instantiate them independently.

`worldAuthorshipMethod` remains inspectable so future reviewers can look upstream when worlds or lives collapse toward monoculture.

## Request, conclusion, and Pass-A blindness

Pass A may not see:

- child genome;
- parent/ancestor genome loci;
- future profession/Fibre role;
- future request/benchmark;
- desired adult character conclusion;
- source-instance identities used by the human WorldSpec/event-structure author.

World circumstances are allowed. Personality conclusions are not.

Development worlds used to tune Slices C-E are permanently disjoint from the fresh cohort worlds authored at Slice G.

## Partial genome blindness

Before each memory-formation attempt Fibre records:

```text
life_only
life_plus_genome
```

The majority should normally be `life_only`; exact ratios are versioned policy rather than constitutional targets.

`life_plus_genome` may see bounded relevant inherited loci, but experience may reinforce, complicate, suppress, invert, or ignore them.

Never silently resample memories to engineer a favorable genome relationship.

## Locus specificity before life generation

Natural-language loci must be specific enough to discriminate.

At Slice B, a controlled positive-control task presents candidate meanings generated specifically against two intentionally different test genomes. Blind raters should identify the associated genome above chance. If they cannot, loci are too horoscope-shaped for downstream Genesis.

This positive control establishes that genome semantics can carry information. It does **not** imply actual lived meanings should remain strongly genome-predictable after history and memory intervene.

## Semantic meaning and ambivalence

> **A derived category is never a safe stand-in for the meaning it compresses.**

Natural-language meaning remains authoritative. `mixed`, sentiment labels, effect labels, salience buckets, or similar classifications are derived views only.

Materially different tensions receive stable citation targets:

```text
rememberedMeaning {
  meaningId
  summary
  parts[] {
    meaningPartId
    meaning
  }
}
```

Meaning may be ambivalent, unresolved, contradictory, incomplete, or later reinterpreted. It may not encode future behavioral policy disguised as autobiography.

## Particularity and historical excess

Prefer particular experiences, relationship-specific incidents, mistakes, rituals, private embarrassments, intellectual encounters, conflicting loyalties, and ordinary events that never become important.

Not every event is remembered. Not every memory receives durable meaning.

A life where nearly every event becomes autobiographically important is plot-shaped.

## Culture and convergence

Cultural/geographic spread exists to provide lived texture, not to manufacture belief spread.

The final cohort must include a deliberately designed **convergent pair**: very different cultural/world texture, comparable formative structure, and a plausible opportunity to converge on at least one broad belief.

Success is not merely agreement. The route, tension, and autobiographical residue should remain attributable to the particular life.

Two Threads from opposite worlds who never agree about anything are suspicious: culture may be acting as a determinant rather than lived circumstance.

## Narrative integration varies

Genesis must not produce five equally articulate, perfectly self-aware narrators.

Across the final cohort, allow different degrees of achieved coherence, including at least examples analogous to:

- relatively coherent current self-story;
- unresolved knot the Thread circles without fully explaining;
- confident interpretation that historical evidence complicates.

Uniform articulacy is a distinct failure from uniform prose style.

## Source and human-subject integrity

- Living identifiable person -> documented-consent Echo.
- Homage -> explicitly attested deceased or fictional source.
- No combination of origin/source influence may bypass living-human consent.
- Source biography is not Thread autobiography.
- A source can matter to a Thread through an actual Thread event such as reading, studying, discussing, admiring, rejecting, or reinterpreting it.

Echo/Homage/source-derived Threads remain outside the personhood-quality cohort used to judge the Genesis life generator.

## Rejection and retry discipline

Every rejected candidate records pass, input digest, output digest, and reasons.

Integrity retries are bounded and visible. Quality failure does not silently trigger resampling until a prettier cohort appears.

If a frozen cohort fails quality review, preserve it, change/version the compiler or policy, use new development worlds where appropriate, and create a separately identified cohort.

## Five cohort diagnostics

### 1. Life attribution: raw and normalized

Run attribution twice:

1. **Raw:** remove names, professions, and source labels.
2. **Normalized:** also normalize prose style and obvious setting/world identifiers.

The normalized condition is the stronger result.

Raters attribute by **route, tension, and residue**, not merely by which conclusion the Thread holds. This permits the convergent pair to agree without becoming interchangeable.

### 2. Sentiment coupling

Rate historical-event sentiment blind to meanings. Separately rate remembered-meaning valence blind to events. Characterize their relationship.

Excessively high coupling means Pass C is turning event mood into interpretation rather than producing person-specific meaning.

### 3. Genome discrimination

At Slice H, present one actual remembered meaning and two candidate genomes: the Thread's and another cohort Thread's.

Actual-life discrimination should be materially weaker than the controlled Slice-B positive control and must not approach ceiling. Pure chance is not constitutionalized as the goal: a genome that can never leave any trace is also not the intended architecture.

Freeze the interpretation/threshold before Slice H.

### 4. Life funnel

Report per Thread:

```text
historical events                       N
of which autobiographically remembered n1
of which acquired durable meaning      n2
of which have >1 material meaning part n3
```

The funnel is a detector for plot prior and narrative over-determination, not a quota.

### 5. Self-account overreach

For each Thread ask:

> **Does durable history contain something the Thread's current remembered meanings cannot accommodate?**

Inspect omissions, contradictions, flattering explanations, uncertainty, unresolved evidence, and experiences the Thread fails to integrate.

This diagnostic depends on Fibre preserving what autobiography edited out.

## Slice-G freeze discipline

Before generating the five quality Threads, freeze:

- five fresh WorldSpecs never used for compiler iteration;
- one deliberate convergent pair;
- narrative-integration variation;
- model/prompt/policy/event-structure versions;
- memory-blinding and retry policy;
- world-familiarity characterization;
- independent rater protocol;
- all diagnostic thresholds/interpretation;
- expected funnel posture.

Diagnostic raters must not have seen WorldSpecs, compiler prompts, or genomes except where the genome-discrimination task explicitly supplies compared genomes.

## Inspection questions

For each Thread the final review should answer:

- What did its world make likely that its actual life did **not** do?
- What history did its current self-account omit or fail to explain?
- Does it misunderstand any material part of its own experience?
- Which beliefs converge with another Thread, and how do route/tension/residue remain different?
- Which photo obligations remain pending?

## Narrow automated tests

Protect Fibre-specific invariants only:

1. replayable Genesis manifest and symbolic-genome recombination;
2. exact source/locus/event provenance;
3. Pass A blindness to genome, future role/benchmark, and source-instance identities;
4. source facts cannot become Thread history by implication;
5. living human requires consented Echo; Homage requires deceased/fictional attestation;
6. event != memory != remembered meaning;
7. meaning parts have stable independently citable IDs;
8. append-only reinterpretation/correction;
9. witness relevance appropriate to claimed episodes;
10. no demographic/cultural stereotype laundering into personality/conclusion;
11. no future behavioral rule encoded in remembered meaning;
12. bounded visible rejection/retry history;
13. every admitted memory receives its photo obligation;
14. restart reconstructs the same admitted Genesis state.

Do not turn cohort diagnostics into a brittle behavioral unit-test matrix.

## Design reasoning preserved

Two earlier objections were refined rather than discarded:

- **Narrative selection:** fiction's selection for significance is dangerous when imported as plot, but autobiographical memory also selects. Fibre's answer is to preserve historical excess and inspect the life funnel rather than demand significance-free memory.
- **Coherence monoculture:** coherence itself is constitutive, not a defect. The defect is perfect authored coherence. Fibre therefore looks for where achieved coherence leaks against durable history.

## #39 completion implication

#39 is complete when Fibre can create and replay particular provenance-rich lives with inherited symbolic possibilities, culturally textured but non-deterministic worlds, historical excess, separately formed memories/meanings, independently citable tensions, visible generation failures, and a frozen cohort whose five diagnostics were predeclared and not resampled to pass.
