---
id: validation-symbolic-thread-genome-implementation-plan
status: proposed
last-reviewed: 2026-08-13
canonical: true
---

# Symbolic Thread Genome implementation plan

## Scope

This is a software-only inheritance plan for artificial Fibre Threads. It does not model biological genetics.

Implementation target: PR #39, **Genesis, Childhood & Thread Birth v1**.

Canonical architecture: [`Symbolic Thread Genome v1`](../architecture/symbolic-thread-genome-v1.md).

## Representation rule

Canonical inherited personality meaning is atomic natural-language text, not a numeric trait vector.

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
inheritancePolicy { id, version }
recombinationWitness
mutations[]
genesisEventRef
```

Numeric values may be used for genuine measurements or derived runtime controls. They may not replace the canonical textual genome.

## Work slices

### A. Durable textual loci

- stable genome and locus IDs;
- ordered atomic natural-language values;
- anti-blob validation;
- immutable inherited record after Genesis;
- separate expressed-disposition view.

### B. Grounded source eligibility

- source genome references resolve through #38 grounded lineage/source records;
- arbitrary caller-provided opaque references carry no inheritance authority;
- eligibility is inspectable and replayable.

### C. Deterministic textual crossover

Given:

```text
Source A  A1 A2 A3 A4 A5 A6 A7 A8
Source B  B1 B2 B3 B4 B5 B6 B7 B8
```

a policy may derive:

```text
Result    A1 A2 A3 B4 B5 A6 A7 B8
```

Persist exact source-locus provenance, policy/version, ordering, deterministic witness, and final genome digest.

### D. Explicit symbolic mutation

Support a bounded set of visible semantic operations such as introducing or replacing one atomic locus. Every mutation records policy/version, witness, and provenance. Mutation cannot generate a complete finished persona.

### E. Genesis integration

The Genesis compiler consumes the symbolic genome together with family/source evidence, geography/culture constraints, developmental rules, and historical episode generation. Genome remains origin; later experience and current character remain separate layers.

### F. Rich specificity guard

Synthetic prior-life material should be many particular addressable records, not a generic profile paragraph or a standard personality questionnaire. Fixture review should be able to distinguish Threads from randomly sampled formative records even with names and professions removed.

This is an implementation-quality guard, not causal M2 credit.

### G. Read-only inspection and replay

Inspection must answer:

- what source genomes were eligible;
- which textual loci came from which source;
- which loci are mutations;
- exact final ordered genome and digest;
- what expressed dispositions were derived without changing inherited origin;
- whether restart reconstructs the same genome exactly.

## Anti-cheats

Fail the implementation if:

- the real genome is a hidden numeric personality vector;
- fixed generic trait slots simply replace numbers with short strings;
- source dispositions are averaged into bland compromise prose;
- a model writes a finished persona and stores it as inherited origin;
- demographic or cultural labels are used as personality shortcuts;
- current character overwrites the inherited genome;
- restart cannot reconstruct exact locus provenance.

## Completion criteria

```text
[ ] durable ordered textual genome
[ ] stable genome/locus IDs
[ ] atomic-locus anti-blob validation
[ ] grounded source eligibility
[ ] deterministic textual crossover
[ ] exact per-locus provenance
[ ] explicit symbolic mutation
[ ] immutable genotype / separate expression
[ ] no numeric personality-vector authority
[ ] rich non-template Genesis integration
[ ] read-only inspection
[ ] exact restart/replay
[ ] repository validation green
```

## Boundary

#39 implements inherited origin and prior-life formation. #40 owns bounded causal projection of relevant inherited/lived evidence. #41 closes M2 through held-out stable individuality rather than mere representational difference.
