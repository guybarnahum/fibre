---
id: validation-symbolic-thread-genome-implementation-plan
status: accepted
last-reviewed: 2026-08-15
canonical: true
---

# Symbolic Thread Genome implementation plan

## Scope

This is a software-only inheritance plan for artificial Fibre Threads. It does not model biological genetics.

Implementation target: #39, **Genesis, Childhood & Thread Birth v1**.

Canonical architecture: [`Symbolic Thread Genome v1`](../architecture/symbolic-thread-genome-v1.md).

The #39 compiler/review authorities remain `genesis-compiler-contract-v1.md` and `m2-pr39-implementation-plan.md`; this file is the focused implementation checklist for the symbolic-genome substrate.

## Representation rule

Canonical inherited meaning is atomic natural-language text, not a numeric trait vector.

```text
genomeId
owner {
  kind: thread | synthetic_ancestor
  ownerId
}
genesisId
orderedLoci[] {
  locusId
  ordinal
  value
  provenance {
    kind: de_novo | inherited | mutated
    sourceGenomeRef?
    sourceLocusRef?
    mutationRef?
  }
}
inheritancePolicy { id, version }
sourceEligibility
recombinationWitness
mutations[]
genomeDigest
```

A non-live synthetic ancestor remains a synthetic ancestor. Fibre must not mint a fake live parent Thread merely to hold a contributing genome.

Numeric values may be used for genuine measurements or derived runtime controls. They may not replace the canonical textual genome.

## Slice-B implementation

### Durable textual loci

- stable genome/locus IDs;
- ordered atomic natural-language values;
- narrow anti-blob/form validation;
- immutable genotype records;
- no fixed universal personality slots.

The atomicity validator intentionally does **not** reject a vague but structurally atomic locus such as `values honesty`. Specificity is a measured property, not an admission gate.

### Source ownership and eligibility

- every source genome has an exact owner;
- Thread-owned source genomes must resolve to the declared live source Thread;
- synthetic-ancestor-owned source genomes preserve the exact non-live ancestor ID without pretending it is a Thread;
- the child recombination witness records both source genome IDs/digests and source owners;
- Slice E/birth must bind synthetic-ancestor owner IDs to admitted #38 `biological_parent` / `parent_genome_source` lineage evidence before the child becomes live.

Arbitrary source-owner substitution must fail replay.

### Deterministic textual crossover

Given:

```text
Source A  A1 A2 A3 A4 A5 A6 A7 A8
Source B  B1 B2 B3 B4 B5 B6 B7 B8
```

a Fibre-owned policy may derive:

```text
Result    A1 A2 A3 B4 B5 A6 A7 B8
```

Persist exact source-locus provenance, source genome digests, policy/version, selection seed/digest, ordering, and final genome digest.

An inherited locus copies the exact source text. Recombination does not rewrite both parents into compromise prose.

### Explicit symbolic mutation

V1 supports bounded locus replacement only, maximum two replacements per recombination.

Every mutation records:

- stable mutation ID;
- source genome/locus;
- prior-value digest;
- replacement text;
- policy/version;
- resulting locus provenance.

Mutation cannot generate a complete finished persona.

### Policy/replay discipline

Unknown inheritance, crossover, or mutation policy versions fail closed. Policy identity used in deterministic IDs is exactly `{id, version}`; operational bounds such as `maxReplacements` are policy implementation constants, not hidden identity fields.

### Read-only inspection and restart

Inspection must answer:

- who owns this genome;
- which source genomes/owners contributed;
- which textual loci came from which source;
- which loci were explicitly mutated;
- exact final ordered genome and digest.

Read-only inspection must not create schema and must return an empty result on worlds that have no symbolic-genome tables.

## Positive-control specificity diagnostic

Before Slice C life generation, run two intentionally distinct development genomes through fixed neutral situations with the genome directly visible.

A stateless blind rater receives the two genomes and shuffled candidate semantic outputs but not generator context/source labels, then performs trial-level two-alternative discrimination.

The harness reports accuracy against 50% chance. It does **not** emit an admission verdict.

Interpretation:

- near chance: loci are too generic/horoscope-shaped for later genome propagation to be interpretable;
- strong discrimination: the loci are capable in principle of distinguishable semantic output;
- this is only a Slice-B ceiling/instrument check, not Genesis personhood evidence.

Tooling:

```text
npm run genesis:genome-control -- --provider <openai|google> --model <model>
```

## Later #39 integration

Slice C keeps the genome entirely absent from Pass A.

Slice D allows controlled Pass-B exposure and keeps Pass C unconditionally genome-blind.

Slice E closes the synthetic-ancestor lineage binding described above.

Slice H compares achieved genome propagation against this Slice-B ceiling; `life_only_unexposed` remains the negative control.

## Anti-cheats

Fail the implementation if:

- the real genome is a hidden numeric personality vector;
- fixed generic trait slots simply replace numbers with short strings;
- source dispositions are averaged into bland compromise prose;
- a model writes a finished persona and stores it as inherited origin;
- demographic or cultural labels are used as personality shortcuts;
- a synthetic ancestor is represented as a fake live parent Thread merely to satisfy genome storage;
- inherited text changes without an explicit mutation witness;
- current character overwrites the inherited genome;
- restart cannot reconstruct exact locus provenance.

## Completion criteria

```text
[x] durable ordered textual genome
[x] explicit Thread/synthetic-ancestor ownership
[x] stable genome/locus IDs
[x] atomic-locus anti-blob validation
[x] source ownership/eligibility foundation
[x] deterministic textual crossover
[x] exact per-locus provenance
[x] explicit bounded symbolic mutation
[x] immutable genotype
[x] no numeric personality-vector authority
[x] read-only inspection
[x] exact restart/replay
[x] live positive-control harness
[ ] live positive-control result recorded before Slice C
[ ] synthetic-ancestor source owners bound to admitted #38 lineage at Slice E/birth
```

## Boundary

#39 implements inherited origin and prior-life formation. #40 owns bounded causal projection of relevant inherited/lived evidence. #41 closes M2 through held-out stable individuality rather than mere representational difference.
