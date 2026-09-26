---
id: human-physical-inheritance
status: accepted
last-reviewed: 2026-09-26
canonical: true
---

# Human physical inheritance

## Purpose

Fibre gives a Thread a body through inheritance, not through a portrait prompt. The same small, pure component under `core/src/human-phenotype/` is used by Fibre and Population Lab.

The durable causal chain is:

```text
ancestry / family history
  -> founder genomes only for missing biological parents
  -> two parental physical genomes
  -> recombination
  -> child's physical genome
  -> inherited phenotype
  -> lived physical state
  -> portrait
```

Population ancestry is bootstrap evidence for missing parents. Once real parent Threads exist, their physical genomes are the physical inheritance authority. An ancestry label never directly chooses a face.

Physical ancestry and physical genome have no authority over personality, intelligence, ability, dignity, values, religion, politics, class, interests or behavior.

## Compact physical genome

A physical genome is small private inherited state, not literal DNA. It keeps paired inherited values at each locus so a value that is not expressed in one Thread can still be passed to a child.

The conceptual appearance systems are:

- pigmentation;
- hair form and density;
- face proportions;
- eye and brow region;
- nose shape;
- mouth and soft tissue;
- jaw and chin;
- skeletal frame and height tendency.

A system may contain a few correlated loci where needed. The representation stays fixed-size, deterministic and cheap.

Each locus carries two alleles, one inherited from each biological parent. Expression may be blended, additive, dominant/recessive, or another explicit small rule appropriate to that locus. **Unexpressed alleles remain in the genome and remain heritable.**

This is intentionally genotype-like rather than a DNA simulation. Fibre does not model chromosomes, nucleotide sequences, meiosis, disease genetics or molecular biology merely to render believable inherited people.

## Physical Genome Core

The shared core owns:

- the compact paired-locus genome representation;
- deterministic allele transmission;
- deterministic recombination;
- expression of a genome into correlated physical latent factors;
- expression of those factors into concrete semantic inherited phenotype.

It knows nothing about Threads, World storage, Genesis lifecycle, Population Lab UI, prompts, image providers, FIN, D1 or Cloudflare.

Same authoritative inputs and seed produce the same result.

### Parent recombination rule

Every child receives one transmissible allele at each locus from each parent. Selection is deterministic from the conception seed but varies between siblings.

```text
parent A [a1,a2] -- choose one --\
                                  -> child [a?,b?]
parent B [b1,b2] -- choose one --/
```

The child's paired values are stored, not only their expressed phenotype. Recessive or otherwise unexpressed material can therefore reappear in later generations.

Correlated appearance systems may share a small number of latent factors, but Fibre does not average the parents into one face. Siblings should resemble the same family while remaining distinct.

After two real parent genomes are available, ancestry/population priors are not consulted during recombination.

## Founder Genome Generation

When a biological parent is not represented by a Thread, Fibre creates the minimum missing genetic material: a transient founder genome.

```text
parental ancestry history
  -> compact population-genetic physical basis
  -> one plausible founder genome
```

Ancestry provenance remains semantic and inspectable. A separate small physical-population basis shifts overlapping distributions over the same physical loci. It is not an ethnicity-to-face table and must not become a giant taxonomy.

Founder sampling must preserve substantial within-population variation. Two founders with the same ancestry should usually have different genomes.

The current reference-population coefficients are experimental visual priors, not claims of measured allele frequencies. They require Population Lab calibration before production Genesis adoption.

## Unified birth inheritance

All births converge on the same recombination primitive:

| Birth situation | Parent A | Parent B |
| --- | --- | --- |
| two Thread parents | Thread physical genome | Thread physical genome |
| one Thread parent | Thread physical genome | founder genome from missing-parent ancestry |
| no Thread parents | founder genome from maternal ancestry | founder genome from paternal ancestry |

If family history initially describes ancestry without parental structure, the family-history layer first creates plausible maternal and paternal ancestry histories. It must not smear every ancestry component equally across two imaginary parents merely for convenience.

Founder genomes are transient values. They do not need Thread identity, lifecycle or storage records.

## Inherited phenotype

The renderer never receives ancestry as permission to invent appearance. The physical genome is expressed into concrete inherited traits such as pigmentation, hair texture/density, facial proportions, eye spacing, brow morphology, nose breadth/projection, lips, jaw/chin, frame and height tendency.

Numeric latent coordinates are replaceable sampling machinery. Meaning-bearing Thread identity remains semantic/natural-language-first.

## Lived physical state

Time-varying state remains downstream of inherited phenotype: body composition, muscular development, hairstyle/grooming, facial hair, skin condition, acquired scars, injury, clothing, expression and aging.

Inherited frame is not current weight. Inherited hair properties are not today's haircut.

## Population Lab

Population Lab uses the exact shared core. It may inspect:

```text
family history
-> parental ancestry
-> founder genomes (when applicable)
-> child physical genome
-> inherited phenotype
-> lived age-local state
-> portrait
```

The Lab owns experiments, analytics and rendering trials. It does not own a second genetics implementation.

Useful measurements are population-conditioned distributions, within-population variation, sibling variation, mixed-parent inheritance, hidden-allele transmission, phenotype collisions and renderer fidelity. There is no single diversity score and no demographic quota assertion.

## Validation

Before production Genesis adoption:

1. founder cohorts for London, Stockholm and Lagos test population structure plus within-population individuality;
2. synthetic family experiments test siblings and mixed parentage;
3. a three-generation experiment proves an unexpressed inherited value can pass through a parent and affect a descendant;
4. small rendered cohorts test whether the image provider depicts the concrete inherited phenotype.

Tests prove semantic mechanics, not exact random numbers or desired demographic percentages.

## Capability sequence

### Physical Genome Core — in progress

Define paired loci, allele transmission, recombination and pure genome expression in the shared core. This establishes durable hidden inherited material and multigenerational continuity.

### Founder Genome Generation — next

Generate plausible paired founder genomes from maternal/paternal ancestry using the compact physical-population basis.

### Unified Birth Inheritance — deferred

Resolve two real/founder parental genomes for every birth and use one recombination path.

### Population Validation — deferred

Measure founders, siblings, mixed ancestry, multigenerational recessive transmission and renderer fidelity in Population Lab.

### Fibre Adoption — deferred approval gate

Persist physical genome as private inherited Thread state, connect live parent lineage, replace Genesis appearance selection, feed canonical visual identity from expressed phenotype, and define conservative repair for existing society.

## Runtime and ambition guard

Physical inheritance is O(1) per birth: fixed-size genome, bounded arithmetic, no population scan, no optimization, no simulation loop and no model call below family-history/ancestry authoring.

This capability makes lineage physically causal across generations. It deliberately does not add chromosomes, disease genetics, fertility, molecular genetics, security machinery or generic genetics infrastructure.

Rejected: birthplace-to-appearance rules, ancestry labels as renderer instructions, racial phenotype switches, cohort quotas, ancestry-to-personality inference, direct parent averaging, discarding unexpressed inherited material, and a Lab-only implementation.

The compact population basis and expression model remain experimental and replaceable. The durable contract is two parental genomes -> recombination -> child genome -> phenotype.
