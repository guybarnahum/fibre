---
id: fibre-interpretive-personhood
status: accepted
last-reviewed: 2026-08-15
canonical: true
---

# Interpretive personhood

This document records six Fibre-level principles clarified by the Whole-Person and Genesis design work before milestone #39. They are not local benchmark rules. They state what Fibre means by a persistent person whose life, memory, culture, and sources remain semantically honest.

## 1. Meaning outranks its compression

> **A derived category is never a safe stand-in for the meaning it compresses.**

Fibre may derive labels, enums, scores, ranks, sentiment classes, relevance measures, or other categories for inspection, indexing, comparison, control, or ablation. The underlying meaning-bearing semantic content must remain separately addressable and authoritative.

The rule emerged independently at three layers:

```text
historical event      != remembered meaning
semantic summary      != derived effect/valence enum
personal reservation != compressed disposition category
```

### Cognition-interface corollary

> **Types may be visible to cognition; Fibre-derived semantic verdicts may not masquerade as evidence.**

A downstream cognition stage may receive a stable reference, evidence type, provenance, chronology, and bounded semantic content. A Fibre-derived conclusion such as `effect=mixed`, `relevance=high`, `confidence=strong`, or `supports_participation=true` remains Fibre-side metadata unless a separate domain contract establishes it as an independently authoritative fact.

The reason is empirical as well as conceptual: a derived verdict can override contradictory semantic content rather than merely summarize it.

## 2. Remembered meaning is constitutive, not derivative

> **A Thread's remembered meaning is a different kind of true from historical fact.**

History records what Fibre has evidence happened. Memory records what the Thread retains autobiographically. Remembered meaning records what an experience durably came to mean to that particular Thread.

Meaning is not a lossy compression of history and is not merely an inference to reconstruct when needed. It is part of the persistent person.

Therefore durable remembered meaning requires its own stable identity, provenance, chronology, revision lineage, corrigibility, retraction/supersession semantics, and citation surface.

Two consequences follow:

1. Selecting relevant remembered meaning rather than replaying raw chronology into cognition can be the correct representation of the person, not a shortcut.
2. The architectural case for durable meaning does not depend on whether a temporary model could reconstruct a similar interpretation from events. Re-derived meaning lacks stable autobiographical authority and may silently change between judgments.

## 3. Achieved coherence leaks; authored coherence holds

> **A person's self-account may overreach, omit, simplify, or misunderstand its own evidence. Fibre must preserve the seams.**

A lived reality does not cooperate with a person's later narrative. Some events remain unexplained. Some memories omit material facts. Some interpretations fit only partially. A Thread may be uncertain, confidently wrong, unable to integrate an experience, or later forced to reinterpret it.

Fibre can distinguish achieved coherence from authored coherence because it preserves the historical record that autobiographical memory and meaning did not absorb.

Therefore:

```text
history != memory != meaning
```

is not only an epistemic-integrity rule. It is an instrument for detecting whether a supposedly lived self-narrative was manufactured to fit cleanly.

A design drifts when every event becomes formative, every memory explains its history, or a Thread's current self-account becomes the sole authority over what happened.

## 4. Culture is texture, not conclusion

> **Culture, geography, language, and tradition enter a life as lived circumstance that gives experience texture; they do not determine what the person must conclude.**

Culture may shape what situations occur, which institutions and rituals are present, what language is available, which relationships matter, and how an experience is framed. It may not be used as a shortcut from demographic or cultural label to morality, politics, competence, dignity, willingness, or a required belief.

Persistent persons can converge. Two Threads from very different worlds may arrive at the same core belief by different routes and retain different tensions, reservations, memories, and autobiographical residue.

> **Convergent belief with divergent lived texture can be evidence of successful individuality.**

Non-interchangeability does not require perpetual disagreement. A test that treats agreement itself as failure encourages cultural determinism and misunderstands personhood.

Formation-theory diversity is a separate design lever from cultural diversity. Cultural spread supplies lived texture; variation in theories of formation changes which kinds of experiences a Genesis author considers potentially formative. Do not conflate the two.

## 5. Attribution must be measurable, never manufactured

> **If Fibre claims that cognition used evidence, omission of that evidence must remain observable.**

More generally:

> **A diagnostic must retain the possibility of a bad reading. Any property enforced at admission ceases to be measurable, and any metric that can only return success or an error is not a measurement.**

A citation or provenance reference may be validated for eligibility after it exists. A measurement of whether cognition used the evidence may not require that citation as a schema precondition, because a metric that can only report 100% or fail is not a measurement.

The same principle applies to generation and evaluation:

- do not silently resample until a quality target is met;
- record rejected candidates and rejection reasons;
- bound and witness retries;
- report rejection behavior itself;
- freeze held-out cohorts and evaluation rules before seeing their outcomes.

A high rejection rate may mean the generator is fighting its constraints. An implausibly zero rate may mean the validators are inert. Both must remain inspectable.

## 6. Human-source identity requires explicit consent boundaries

> **A living identifiable person may influence a Thread as an Echo only with documented consent. A Homage source must be deceased or fictional. No combination of source influence and origin mode may route around that boundary.**

Human-source status is explicit, attested, and provenance-bearing:

```text
subjectStatus:
  consenting_living
  deceased
  fictional
```

Fibre does not infer source authorization from a biography, public profile, Wikipedia metadata, fame, or availability of information.

A deceased source may still carry rights, estate, family, cultural, or other constraints; `deceased` means only that the living-person Echo consent rule no longer applies, not that every use is automatically unencumbered.

### Source history is not Thread history

> **A source person's life is never automatically the Thread's autobiographical life.**

Documented source facts remain source facts. They may become part of a Thread's own history only through an event that actually happens to the Thread, such as reading, studying, encountering, discussing, rejecting, or reinterpreting the source.

For example, a Homage Thread may study a historical person's letters. The historical person's childhood does not become the Thread's childhood. The Thread's encounter with the letters, memory of that encounter, and later interpretation are its own.

## Consequences for current milestones

### #39 — Genesis

Genesis must create worlds and lives before explanations of those lives; preserve historical excess beyond the self-account; keep culture as lived texture; keep source material behind an authoring firewall; record generation attempts/rejections; and keep borrowed-person modes out of the cohort used to judge whether the life generator itself creates distinctive people.

### #40 — Identity Projection & Causal Consumption

Cognition should consume relevant semantic meaning with exact provenance rather than Fibre-derived verdict labels. Meaning parts must remain independently citable. Personal stake must remain distinguishable from professional advantage. The rich autobiographical-memory ledger, not legacy memory summaries, must become the M2 memory authority.

### #41 — Standing

Standing must not score convergence itself as failure. The stronger claim is that persistent lives produce stable and attributable routes, tensions, stakes, reservations, and consequences when relevant, including cases where two different persons rationally reach the same outward conclusion.

## Design rationale worth preserving

Two objections changed shape during Genesis review.

### Narrative selection

Fiction selects events for narrative significance. Human autobiographical memory also selects and compresses. The correct response is not to demand an incoherent or significance-free person. Fibre instead preserves the historical material that the autobiographical account omitted and measures the funnel from life to memory to meaning.

### Coherence monoculture

Coherence itself is not the defect; coherence is part of how a self forms. The defect is **perfect authored coherence**. Lived coherence should leak: the historical record should contain material the current self-story does not fully explain, and different Threads should vary in how successfully they understand their own lives.
