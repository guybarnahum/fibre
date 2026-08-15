---
id: architecture-symbolic-thread-genome-v1
status: accepted
last-reviewed: 2026-08-15
canonical: true
---

# Symbolic Thread Genome v1

## Scope

This document defines a **software-only artificial inheritance representation for Fibre Threads**. It is not biological genetics, does not model human DNA, and does not infer traits from human demographic characteristics.

The core rule is:

> **A Fibre genome is an ordered sequence of atomic natural-language dispositions. Fibre recombines eligible source sequences with explicit provenance and bounded symbolic mutation.**

Natural language carries the canonical heritable meaning. Numeric personality coordinates are not the source of truth.

## Genome ownership

A durable symbolic genome has an explicit owner rather than assuming every contributing parent is already a live Thread:

```text
owner {
  kind: thread | synthetic_ancestor
  ownerId
}
```

This distinction is required by the accepted Genesis origin families:

- a `thread` owner is an actual/future Thread identity;
- a `synthetic_ancestor` owner is a non-live synthetic parent/ancestor used by `synthetic_lineage`.

A synthetic ancestor must **not** be minted as a fake live Thread merely to hold a genome.

For a Thread-owned source genome, eligibility requires the exact persisted source owner and a live source Thread. For synthetic-lineage source genomes, Slice B preserves the exact synthetic-ancestor owner; Slice E/birth must bind that owner ID to the admitted #38 biological-parent / `parent_genome_source` lineage evidence before the child becomes live.

Genome ownership therefore preserves source identity. It does not by itself fabricate or replace the child’s relationship ledger.

## Textual loci

A genome is an ordered set of independently addressable textual loci, for example:

```text
persists after setbacks but changes approach;
shows affection through practical help;
enjoys unfamiliar technical problems;
addresses conflict directly and early;
seeks company when stressed;
becomes skeptical when authority relies on status rather than evidence
```

The semicolon form is a readable rendering. Canonical storage uses individually addressable records so provenance and recombination do not depend on punctuation:

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
inheritancePolicy { id, version }
sourceEligibility
recombinationWitness
mutations[]
createdAt
```

`value` remains natural language.

## Atomicity

A locus expresses one reasonably independent heritable tendency.

Good:

```text
takes promises literally
becomes more persistent when another person is relying on her
recovers from embarrassment by becoming more prepared
is reluctant to ask for favors
becomes playful around very serious people
```

Avoid compound persona blobs containing several independent personality claims.

A vague locus such as `values honesty` is **not mechanically rejected merely for being uninteresting**. Atomicity is a form gate; semantic specificity is measured by the Slice-B positive control. Otherwise the diagnostic would measure the validator rather than the genome design.

## Recombination

Given two eligible source genomes:

```text
Source A
A1 ; A2 ; A3 ; A4 ; A5 ; A6 ; A7 ; A8

Source B
B1 ; B2 ; B3 ; B4 ; B5 ; B6 ; B7 ; B8
```

Fibre may derive:

```text
New Thread
A1 ; A2 ; A3 ; B4 ; B5 ; A6 ; A7 ; B8
```

The selection/crossover policy is Fibre-owned, versioned, and replayable from its stored witness. Every inherited locus retains exact source-genome and source-locus provenance and the exact source owner remains inspectable.

Recombination copies the inherited textual locus rather than averaging two parents into generic prose. Unusual mixtures and tensions should survive inheritance.

## Symbolic mutation

Mutation is explicit semantic variation under a named/versioned policy.

V1 uses a bounded **locus replacement** operation: the resulting locus retains the exact source genome/locus, prior-value digest, replacement text, mutation ID, and policy witness. V1 permits at most two replacements per recombination.

Example:

```text
becomes intensely curious when two trusted people disagree
```

Mutation cannot become a hidden path for generating an entire finished persona.

## Genotype is not character

Inherited symbolic dispositions are origin facts, not permanent instructions.

Fibre preserves the distinction:

```text
genome      = inherited symbolic tendencies
life        = experiences that interact with those tendencies
character   = current evidence-backed patterns and tensions
self        = the Thread's current interpretation of itself
```

A Thread may inherit a tendency and later learn to act against it. The inherited locus remains true as origin while character and self-authored interpretation evolve.

## Numeric boundary

Canonical personality meaning must not collapse to universal scalar coordinates such as:

```text
persistence = 0.82
trust = 0.41
creativity = 0.93
```

Numbers remain appropriate for things with real numerical semantics, including balances, time, evidence confidence, memory salience/accessibility, observed frequencies, model controls, and experimental measurements.

Runtime systems may derive temporary numeric controls from relevant textual genome, character, state, and situation. Those controls are projections, not inherited identity.

## Non-interchangeability

Fibre must not implement the genome as a small universal personality questionnaire with different values. The vocabulary of atomic dispositions should be broad enough to preserve peculiar combinations and tensions.

The design target is an artificial individual whose inherited material is already specific, while still leaving substantial room for upbringing, experiences, relationships, memories, and self-authored development to change what that inheritance becomes.

### Slice-B specificity control

Mechanical validity does not prove that loci are semantically informative.

Before Pass-A life generation, #39 runs a development positive control using two intentionally distinct genomes and controlled neutral situations. A model authors semantic outputs with each genome visible; a stateless blind rater then performs two-alternative discrimination without seeing generator context or source labels.

This is a **capability ceiling / instrument check**, not Genesis personhood evidence and not an admission gate.

- a result near chance means the loci may be horoscope-shaped or too generic to support interpretable inheritance;
- a strong result only establishes that the loci can matter when directly visible;
- later Slice-H propagation may legitimately be much weaker because Pass A and Pass C are genome-blind and life intervenes.

## Implementation ownership

#38 supplies grounded lineage/source references. It does not make genome values causal.

#39, **Genesis, Childhood & Thread Birth v1**, owns the first implementation of this symbolic-genome contract and must provide:

1. durable ordered textual genomes with stable genome/locus IDs;
2. explicit Thread or synthetic-ancestor genome ownership;
3. atomic natural-language locus validation;
4. grounded eligibility for contributing source genomes without fake parent Threads;
5. deterministic Fibre-owned textual crossover with replayable witness;
6. exact per-locus source provenance;
7. explicit symbolic mutation with policy/version and witness;
8. immutable inherited genome after Thread genesis;
9. separate expressed dispositions without rewriting inherited loci;
10. read-only inspection explaining exactly how the genome was formed;
11. restart/replay reconstruction of the exact same genome;
12. no numeric personality-vector authority;
13. no demographic or cultural stereotype inference;
14. no direct generation of a finished adult character or profession from the genome.

#40 may select relevant inherited loci for cognition, but it must preserve exact evidence references and may not inject the entire genome simply because it exists.

## Vision test

The contract succeeds when a reviewer can inspect source genomes and a resulting Thread and understand exactly which textual dispositions were inherited, which were changed through explicit symbolic mutation, and how later life changed their expression — without treating the genome as the finished person.
