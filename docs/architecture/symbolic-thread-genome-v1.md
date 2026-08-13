---
id: architecture-symbolic-thread-genome-v1
status: proposed
last-reviewed: 2026-08-13
canonical: true
---

# Symbolic Thread Genome v1

## Scope

This document defines a **software-only artificial inheritance representation for Fibre Threads**. It is not biological genetics, does not model human DNA, and does not infer traits from human demographic characteristics.

The core rule is:

> **A Fibre genome is an ordered sequence of atomic natural-language dispositions. Fibre recombines source Thread sequences with explicit provenance and bounded symbolic mutation.**

Natural language carries the canonical heritable meaning. Numeric personality coordinates are not the source of truth.

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

The semicolon form is a readable rendering. Canonical storage should use individually addressable records so provenance and recombination do not depend on punctuation:

```text
genomeId
threadId
orderedLoci[] {
  locusId
  ordinal
  value
  sourceGenomeRef?
  sourceLocusRef?
  mutationRef?
}
recombinationPolicy { id, version }
recombinationWitness
mutations[]
createdAt
genesisEventRef
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

Avoid both vague labels such as `persistent` and compound persona blobs containing several independent personality claims. Rich individuality should emerge from many specific loci plus lived history.

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

The selection/crossover policy is Fibre-owned, versioned, and replayable from its stored witness. Every inherited locus must retain exact source-genome and source-locus provenance.

Recombination should preserve unusual mixtures and tensions rather than averaging sources toward a generic midpoint.

## Symbolic mutation

Mutation is explicit semantic variation. It may introduce a new atomic locus or produce another bounded symbolic change under a named policy.

Example:

```text
becomes intensely curious when two trusted people disagree
```

Mutation must retain policy/version, witness, and provenance. It cannot become a hidden path for generating an entire finished persona.

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

Fibre should not implement the genome as a small universal personality questionnaire with different values. The vocabulary of atomic dispositions should be broad enough to preserve peculiar combinations and tensions.

The design target is an artificial individual whose inherited material is already specific, while still leaving substantial room for upbringing, experiences, relationships, memories, and self-authored development to change what that inheritance becomes.

## Implementation ownership

PR #38 supplies grounded lineage/source references only. It does not make genome values causal.

PR #39, **Genesis, Childhood & Thread Birth v1**, owns the first implementation of this symbolic-genome contract and must provide:

1. durable ordered textual genomes with stable genome/locus IDs;
2. atomic natural-language locus validation;
3. grounded eligibility for contributing source genomes;
4. deterministic Fibre-owned textual crossover with replayable witness;
5. exact per-locus source provenance;
6. explicit symbolic mutation with policy/version and witness;
7. immutable inherited genome after Thread genesis;
8. separate expressed dispositions without rewriting inherited loci;
9. read-only inspection explaining exactly how the genome was formed;
10. restart/replay reconstruction of the exact same genome;
11. no numeric personality-vector authority;
12. no demographic or cultural stereotype inference;
13. no direct generation of a finished adult character or profession from the genome.

PR #40 may select relevant inherited loci for cognition, but it must preserve exact evidence references and may not inject the entire genome simply because it exists.

## Vision test

The contract succeeds when a reviewer can inspect source genomes and a resulting Thread and understand exactly which textual dispositions were inherited, which were changed through explicit symbolic mutation, and how later life changed their expression — without treating the genome as the finished person.
