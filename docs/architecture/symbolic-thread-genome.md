---
id: architecture-symbolic-thread-genome-v1
status: accepted
last-reviewed: 2026-09-10
canonical: true
---

# Symbolic Thread Genome v1

## Scope

This document defines Fibre's artificial inheritance representation. It is not human DNA and does not infer traits from human demographic characteristics.

A Fibre genome has two different kinds of heritable material:

```text
symbolic loci       = natural-language inherited dispositions
runtime baselines   = bounded numeric/control parameters with real operational semantics
```

The two must not be confused. Meaning-bearing personality remains natural-language-first. Numeric baselines are allowed only where the underlying thing is genuinely quantitative, such as primitive regulator sensitivity or recovery rate.

## Genome ownership

A durable genome has an explicit owner:

```text
owner {
  kind: thread | synthetic_ancestor
  ownerId
}
```

A synthetic ancestor is provenance, not a fake live Thread. Source-owner identity must remain exact through recombination and birth publication.

## Symbolic loci

The symbolic genome is an ordered set of independently addressable natural-language dispositions, for example:

```text
persists after setbacks but changes approach;
shows affection through practical help;
enjoys unfamiliar technical problems;
addresses conflict directly and early;
seeks company when stressed;
becomes skeptical when authority relies on status rather than evidence
```

Canonical storage uses addressable records rather than punctuation:

```text
genomeId
owner { kind, ownerId }
genesisId
orderedLoci[] {
  locusId
  ordinal
  value
  sourceGenomeRef?
  sourceLocusRef?
  mutationRef?
}
runtimeBaselines { ... }
inheritancePolicy { id, version }
sourceEligibility
recombinationWitness
mutations[]
createdAt
```

A symbolic locus expresses one reasonably independent tendency. It is origin material, not a permanent instruction.

## Runtime baselines: organismic DNA

Primitive regulation is substantially more uniform across Threads than personality. The regulator families and broad dynamics are Fibre-species invariants; genetics only tunes them within bounded envelopes.

Examples of legitimate inherited runtime baselines include:

```text
threat sensitivity
energy depletion / recovery tendency
rest pressure sensitivity
attachment-proximity sensitivity
exploration / novelty appetite
regulatory persistence / recovery rate
```

These may be numeric because they describe control-system parameters rather than semantic meaning.

They must satisfy three rules:

1. **bounded** — every parameter has a narrow allowed Fibre-species range;
2. **non-semantic** — a value cannot mean `anxious`, `loving`, `brave`, `introverted`, or another personality/feeling verdict;
3. **non-deterministic** — relationship history, developmental state, current World conditions and Thread interpretation can outweigh small inherited differences.

Invalid designs include `safety = 0`, `attachment = 20x`, `happiness = 0.7`, or using numeric baselines as a hidden personality vector.

Developmental gating is separate from baseline magnitude. Reproductive/mating regulation, for example, may become active only at an appropriate developmental stage rather than being an always-on inherited scalar.

See [`intrinsic-regulation.md`](intrinsic-regulation.md).

## Recombination

Eligible source genomes may recombine both symbolic loci and bounded runtime baselines under Fibre-owned, versioned policy.

Symbolic recombination copies/recombines atomic text rather than averaging meaning into generic prose. Numeric runtime baselines may use a simple bounded inherited rule appropriate to genuine quantitative parameters, with exact source and recombination provenance.

The resulting value must remain inside its declared species envelope regardless of parent values or mutation.

## Symbolic mutation

Symbolic mutation is explicit semantic variation under a named/versioned policy. V1 uses bounded locus replacement with exact source provenance. Mutation cannot become a hidden path for generating a finished persona.

Runtime-baseline mutation, when enabled, must be much smaller: bounded perturbation within the same species envelope, with source value, resulting value and mutation witness inspectable.

## Genotype is not character

Fibre preserves:

```text
genome
  symbolic dispositions + narrow organismic baselines
life
  experiences, relationships, development, World conditions
character
  current evidence-backed patterns and tensions
self
  the Thread's current interpretation of itself
```

A Thread may inherit a disposition and learn to act against it. Two Threads with nearly identical regulatory baselines may become radically different people because their lives and interpretations differ.

## Numeric boundary

Canonical personality meaning must not collapse to universal scalar coordinates such as:

```text
persistence = 0.82
trust = 0.41
creativity = 0.93
```

Numbers are appropriate only for things with real numerical semantics: balances, time, evidence confidence, observed frequencies, model controls, measurements, and bounded organismic regulator parameters.

Runtime systems may derive temporary numeric controls from relevant textual genome, character, state and situation. Derived controls are projections, not inherited identity.

## Birth binding and immutability

The child genome may exist before the child is live. At birth, publication verifies the exact persisted genome/source lineage and binds it to the child. A mismatch fails closed.

Inherited genome material is immutable after Genesis. Later regulation, character development and semantic self-understanding do not rewrite DNA.

## Thread Editor: explore DNA

Thread Editor should make a Thread's genome explorable as origin evidence, not as a horoscope/profile card.

The operator should be able to inspect:

```text
DNA
  symbolic loci
    value
    inherited from whom / which source locus
    mutation if any
    later expression/history when available

  organismic baselines
    regulator family / parameter
    inherited value
    normal Fibre-species envelope
    parent/source values
    recombination/mutation witness
    current effective value after developmental/context projection
```

The Editor should make small differences legible. It should not visually exaggerate bounded regulatory variation into large personality differences.

A useful debug path is:

```text
DNA baseline
  -> current regulator configuration
  -> drive signal
  -> interoceptive cue
  -> Thread-authored semantic interpretation
  -> behavior / plan / memory consequence
```

This provides causal inspection while preserving the rule that genotype is not the finished person.

## Vision test

The genome succeeds when a reviewer can understand exactly what was inherited, what mutated, how narrow primitive-regulator variation remains, and how later life changed expression — without treating numeric regulator settings or symbolic loci as destiny.