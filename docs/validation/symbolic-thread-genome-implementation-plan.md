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

Before using genome propagation as an interpretable #39 result, establish that directly visible symbolic loci are capable of carrying distinguishable semantic information.

Recorded first complete live result: [`m2-pr39-slice-b-genome-control-result.md`](m2-pr39-slice-b-genome-control-result.md).

### Independence

The control is **trial-independent at both cognition surfaces**:

- 24 distinct neutral situations;
- one generator call for Genome A × one situation;
- one separate generator call for Genome B × the same situation;
- one stateless 2AFC rater call for that situation only;
- no generator call sees another trial;
- no rater call sees another trial.

This is 48 generation calls plus 24 rating calls. Cross-trial voice clustering is therefore unavailable to both generator and rater.

Candidate position is also controlled rather than left to hash luck. The 24 situation IDs are deterministically ranked by a seeded digest and assigned **exactly 12 Genome-A-left and 12 Genome-A-right**. A fixed left-only or right-only rater therefore scores exactly 12/24 by construction. The rater never receives the hidden Genome-A side; the emitted artifact attaches that side only after the blind choice exists and reports accuracy separately for A-left and A-right trials.

A different rater provider/model should be used when available. If generator and rater are identical, that fact is recorded explicitly as an interpretation bound rather than hidden.

The harness reports the exact one-sided binomial tail against 50% chance. It does **not** emit `pass`, `verdict`, or any admission decision.

### Predeclared Slice-B reading

The following reading is frozen **before the first live provider call**:

| Correct of 24 | Reading |
| --- | --- |
| 20–24 | strong directly-visible ceiling signal from the hand-authored exemplars; instrument/concept check only |
| 17–19 | detectable moderate ceiling; 17/24 is the first one-sided exact-binomial result below 0.05 (`p ≈ 0.032`); preserve the result and do not tune merely to chase a higher score |
| 13–16 | inconclusive / near chance; do not silently tune the same run or convert this into a genome admission rule |
| 0–12 | no positive ceiling signal; preserve as a development finding; H genome-propagation claims remain uninterpretable until a separately versioned instrument establishes a ceiling |

A weak run does not make an otherwise truthful genome record inadmissible. It is evidence about the expressive specificity of the development loci/control.

### Slice B vs Slice G

The hand-authored Slice-B genomes are an **instrument check**, not H's actual denominator.

At Slice G, after the five cohort WorldSpecs are frozen genome-blind and the five actual cohort genomes are frozen/assigned but **before cohort life generation**, re-run the same independent, position-balanced discrimination instrument against a predeclared pair schedule over the Genesis-produced cohort genomes. Freeze the pair schedule before any control output is seen.

That Slice-G cohort-genome result is the ceiling used to interpret H. If hand-authored exemplars discriminate but Genesis-produced genomes do not, the finding belongs to genome generation/recombination and must be visible before cohort life generation.

Tooling:

```text
npm run genesis:genome-control -- \
  --provider <openai|google> --model <generator-model> \
  --rater-provider <openai|google> --rater-model <preferably-different-model>
```

The same harness accepts externally frozen genome JSON for Slice G:

```text
--genome-a-file <json> --genome-b-file <json> --genome-source <label>
```

## Later #39 integration

Slice C keeps the genome entirely absent from Pass A.

Slice D allows controlled Pass-B exposure and keeps Pass C unconditionally genome-blind.

Slice E closes the synthetic-ancestor lineage binding described above.

Slice G freezes the actual cohort-genome specificity ceiling before life generation.

Slice H compares achieved genome propagation against the Slice-G cohort-genome ceiling; `life_only_unexposed` remains the negative control. The Slice-B hand-authored score is retained as instrument history, not substituted for the cohort ceiling.

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
[x] trial-independent 24-trial live positive-control harness
[x] exact seeded 12/12 A-left/A-right candidate-position balance
[x] per-side position/accuracy evidence recorded after blind rating
[x] predeclared Slice-B interpretation
[x] Slice-G external frozen-genome reuse surface
[x] live Slice-B positive-control result recorded before interpreting genome propagation
[ ] Slice-G cohort-genome ceiling frozen before cohort life generation
[ ] synthetic-ancestor source owners bound to admitted #38 lineage at Slice E/birth
```

## Boundary

#39 implements inherited origin and prior-life formation. #40 owns bounded causal projection of relevant inherited/lived evidence. #41 closes M2 through held-out stable individuality rather than mere representational difference.
