---
id: architecture-symbolic-thread-genome-v1
status: accepted
last-reviewed: 2026-10-28
canonical: true
---

# Symbolic Thread Genome — historical v1 and inherited-urges v2

## Scope

This document defines Fibre's artificial inheritance representation. It is not human DNA and does not infer traits from human demographic characteristics.
[ADR-0030](../decisions/ADR-0030-inherited-urges.md), accepted 2026-10-28,
amends **new default births** to v2 family-keyed inherited urges. The v1
contracts below remain historical and replayable, without retroactive changes.

The historical v1 symbolic genome distinguishes these two kinds of heritable material:

```text
symbolic loci       = natural-language inherited dispositions
runtime baselines   = bounded numeric/control parameters with real operational semantics
```

The two must not be confused. Meaning-bearing personality remains natural-language-first. Numeric baselines are allowed only where the underlying thing is genuinely quantitative, such as primitive regulator sensitivity or recovery rate. In v2 the new default authority is instead 13 textual urge loci with variant-bound frozen physiological projections; historical v1 `runtimeBaselines` are never an additional v2 gain.

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

## Individual de-novo birth material (modern Genesis)

**Historical v1 default births** selected six independently authored dispositions from
`tools/genesis/symbolic-locus-library.mjs`. Its immutable library version 1
contains **16 situational variants per ordinal**, balanced across contrasting
non-pathologized temperamental poles:

1. claims and evidence;
2. learning and persistence;
3. social entry and engagement;
4. deciding and committing;
5. response to error and correction;
6. solitude, sociality and idle rhythm.

Each variant is a concrete situation-to-tendency proposition, not a flattering
personality template or a categorical control parameter. Selection is
deterministic by `requestId` and ordinal; it never depends on sex, birthplace,
ethnicity, family profile, culture, or a global uniqueness registry. Genomes
can naturally share loci while having distinct six-locus combinations.

V1 de-novo symbolic genome headers could persist optional `originMaterial`
(`libraryId`, `libraryVersion`, immutable library digest, variant IDs,
selection policy and selection digest). For v1 the digest binds the six selected
values to the original request. Historical genomes with or without this field
keep their original canonical content and digest.

The origin metadata is inspectable **only as provenance**, not ordinary
cognition. Historical v1 Genesis Pass A was genome-blind; the v1 Pass B
experiment exposed the six textual dispositions in its scheduled treatment.
These records remain replayable. The Thread's subsequent history and authored
interpretation can reinforce, transform or contradict an inherited tendency.

### New default v2: family-keyed inherited urges

V2 de-novo birth deterministically selects **13** textual loci, one per family,
from the 130 authored variants in `core/src/inherited-urges.mjs` (10 per family).
Selection is keyed by `requestId`, not sex, ancestry, location or a cultural
stereotype. `originMaterial.kind=urge_library` binds library ID/version/digest,
selected variant IDs and selection digest. Each textual variant carries a frozen
closed orientation and gain, felt-threshold and persistence positions.
No LLM interprets text into numerical physiology; the author-reviewed
projection is inseparable from the selected variant. Its admitted
`thread.genome.urgeProjection` must equal that projection by canonical JSON,
independent of object key order. V2 Genesis Pass A **and Pass B** remain
genome-blind, unlike the historical v1 Pass B experiment.

S1 admits the 13-locus genome and drives three evidenced Body families:
`social_contact`, `exploration` and `presence`. Persistence, triggered-family
evidence, target availability, complete response accounting and learned
character are **not** S1 claims. See [Inherited urges](inherited-urges.md).

## Organismic DNA: legacy runtime baselines and v2 frozen positions

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

1. **bounded** — every parameter lies inside its declared Fibre-species range;
2. **non-semantic** — a value cannot mean `anxious`, `loving`, `brave`, `introverted`, or another personality/feeling verdict;
3. **non-deterministic** — relationship history, developmental state, current World conditions and Thread interpretation can outweigh small inherited differences.

Invalid designs include `safety = 0`, `attachment = 20x`, `happiness = 0.7`, or using numeric baselines as a hidden personality vector.

Developmental gating is separate from baseline magnitude. Reproductive/mating regulation, for example, may become active only at an appropriate developmental stage rather than being an always-on inherited scalar.

See [`intrinsic-regulation.md`](intrinsic-regulation.md).

**Historical G1/D1 baselines:** [Extensible Body regulation](regulation-drive-extensions.md)
and [ADR-0025](../decisions/ADR-0025-extensible-body-regulation.md)
retain v1 bounded `runtimeBaselines` (rest, thermal, energy, sensory, presence,
social and exploration) and recombination of actually present parental
alleles. Old genomes retain their keys/digests and defaults for missing keys.
**V2 instead uses its one frozen family-keyed projection**, never an extra
0.85–1.15 multiplier; gain is 0.5×–2× under the accepted species spread.
Neither mechanism creates named emotion, personality, consent or a target.
S1's v2 birth/admission path is staging-confirmed; future behavioral proof
is still required.

## Recombination

Eligible **v1** source genomes may recombine symbolic loci and bounded runtime
baselines under their existing Fibre-owned versioned policy. V2 family-keyed
recombination, including mixed v1/v2 parents, is **deferred** until an
explicit accepted family-compatible policy exists.

Symbolic recombination copies/recombines atomic text rather than averaging meaning into generic prose. Numeric runtime baselines may use a simple bounded inherited rule appropriate to genuine quantitative parameters, with exact source and recombination provenance.

The resulting value must remain inside its declared species envelope regardless of parent values or mutation.

## Symbolic mutation

Symbolic mutation is explicit semantic variation under a named/versioned policy. V1 uses bounded locus replacement with exact source provenance. Mutation cannot become a hidden path for generating a finished persona.

Historical runtime-baseline mutation, if enabled, must remain bounded within
the same species envelope, with its source/result and mutation witness
inspectable. V2 variants and their positions are currently immutable;
no v2 mutational/recombinational policy is accepted.

## Genotype is not character

Fibre preserves:

```text
genome
  authored symbolic loci + bounded organismic projection
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

Runtime systems may derive numeric controls from relevant textual genome,
character, state and situation. The v2 Body projection is frozen and
variant-bound at birth, rather than inferred from text at runtime;
all such controls are physiological machinery, not inherited personality.

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