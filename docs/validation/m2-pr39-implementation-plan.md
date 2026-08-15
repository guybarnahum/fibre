---
id: validation-m2-pr39-implementation-plan
status: accepted
last-reviewed: 2026-08-14
canonical: true
---

# #39 Genesis, Childhood & Thread Birth v1 — implementation plan

## Purpose

Fibre milestone **#39** creates the first provenance-rich pre-live lives that #40 can later consume causally.

The design priority is personhood, not provenance-mode breadth:

> **Build fewer origin modes and more different worlds.**

Origin mode explains how a Thread came into existence. World variation, relationships, experiences, memory, and interpretation are what make lives non-interchangeable.

The #39 north star is:

> **Genesis creates a particular life before it creates an explanation of that life.**

A Thread begins with inherited possibilities, a particular world, relationships and events. Memories and meanings form afterward. Neither the genome nor a famous source person may write the childhood backward from a known personality.

#39 does **not** earn Whole-Person standing or M2 score movement. #40 owns causal consumption; #41 owns held-out standing.

## Canonical inputs and outputs

Conceptually:

```text
GenesisWorldSpec
+ OriginPolicy
+ SymbolicGenome
+ developmental bounds
+ allowed intellectual/source encounters
        ↓
Genesis compiler
        ↓
particular historical life
        ↓
autobiographical memories
        ↓
durable remembered meanings / reinterpretations
        ↓
new live Thread
```

### GenesisWorldSpec

The primary variation axis is the world, not the origin mode.

```text
GenesisWorldSpec {
  worldSpecId
  timeFrame
  places[]
  householdShape
  familyRelations[]
  languages[]
  materialCircumstances
  mobilityPattern
  schoolingOrCommunityContext
  culturalContext
  availableInstitutions
  intellectualEnvironment
}
```

`GenesisWorldSpec` describes circumstances and evidence-bearing world conditions. It must not smuggle in a finished personality through labels such as `independent child`, `strict culture`, `creative family`, or equivalent conclusions.

### GenesisManifest

Every Genesis execution produces one durable/replayable manifest explaining how the Thread came into existence.

```text
GenesisManifest {
  genesisId
  threadId
  originMode
  entryStage
  worldSpecRef
  sourceBundleRefs[]
  parentOrAncestorRefs[]
  genomeRef
  policyVersions
  inputDigest
  generationAttempts[]
  admittedRecordRefs[]
  createdAt
}
```

The manifest is authority for Genesis provenance, not a biography blob.

## Supported origin architecture

Fibre retains six canonical origin families:

1. de-novo / foundling;
2. synthetic lineage;
3. Thread-parent;
4. Echo from a consenting living human;
5. historical/literary Homage;
6. fork / descendant.

#39 does **not** spend equal engineering effort on all six.

### Core rich-life modes in #39

The full life compiler is implemented and judged on:

- **de-novo**;
- **synthetic lineage**.

These are sufficient to prove whether Fibre can create distinctive lives without borrowing a pre-existing person.

### Boundary modes in #39

Thread-parent, Echo, Homage, and fork must demonstrate truthful provenance and domain boundaries through the canonical persistence path, but they do not need independent rich-life generation pipelines in #39.

- **Thread-parent:** actual parent refs and inherited genome are real; if the parent is already live, Fibre must not invent years of shared history. The child normally enters live as newborn/child.
- **Echo:** living identifiable human source requires documented consent. Echo source material is source provenance, not Thread autobiographical history.
- **Homage:** v1 Homage subject must be explicitly attested `deceased` or `fictional`. A living identifiable person may not be routed through Homage to bypass Echo consent.
- **Fork:** shared provenance/history ends at an explicit fork boundary; post-fork life is distinct.

Echo, Homage, Thread-parent, and fork fixtures belong to the **integrity cohort**, not the cohort used to judge whether the Genesis life generator produces people.

## Source and human-subject boundary

The source/Thread firewall is a hard invariant:

> **A source person's life is never automatically the Thread's life.**

Wrong:

```text
source biography: Ada Lovelace grew up ...
Thread memory: "I remember growing up ..."
```

Correct source influence is mediated through truthful Fibre facts, for example a Thread reading letters, biography, fiction, philosophy, or other source material and forming its own later interpretation.

For #39, source bundles may be hand-authored/frozen fixtures. Do **not** build a general Wikipedia importer, ebook ingestion framework, crawler, or human-profile ingestion subsystem.

A bounded source bundle may contain:

```text
GenesisSourceBundle {
  sourceBundleId
  sourceType
  subjectStatus: consenting_living | deceased | fictional | not_person
  title
  author?
  locator
  revisionOrEdition?
  contentDigest
  claims[] {
    sourceClaimId
    semanticClaim
    sourceLocation?
  }
  consentOrRightsRef?
}
```

The source bundle records provenance; it does not authorize source facts to become Thread history.

## Intellectual formation is first-class

Reading, mentors, intellectual canons, artworks, and other encountered sources are first-class **life events**, not personality templates.

Preferred shape:

```text
historical event:
  Thread encounters a book / teacher / argument / artwork

memory:
  what the Thread actually remembers about the encounter

remembered meaning:
  what that encounter later came to mean
```

Books and public sources shape a Thread because the Thread encounters and interprets them, not because Fibre copies the author's or character's documented personality onto the Thread.

## Symbolic genome

#39 implements Symbolic Thread Genome v1:

- durable ordered natural-language loci;
- stable genome/locus IDs;
- grounded source eligibility;
- deterministic replayable crossover;
- exact per-locus provenance;
- explicit symbolic mutation with witness;
- immutable inherited genotype after Genesis;
- no numeric personality-vector authority;
- genotype remains distinct from character and self.

Genome is inherited possibility, not destiny.

```text
genome      = inherited symbolic tendencies
life        = what happened
memory      = what was retained
meaning     = what some experiences came to mean
character   = later evidence-backed expression pattern
```

## Three-pass life compiler

The pipeline must make `history != memory != meaning` structurally true rather than rely only on prompting.

### Pass A — world/history formation

Pass A creates what happened.

It may see:

- GenesisWorldSpec;
- chronology and developmental bounds;
- household/family relationship facts;
- place/language/community circumstances;
- source-independent random/witnessed life conditions.

It must **not** see:

- the child's symbolic genome;
- parent/ancestor genome loci;
- future profession or intended Fibre role;
- future benchmark or request;
- desired adult personality conclusion.

Pass A outputs specific synthetic historical episodes with Genesis-authorized provenance/event kinds.

A valid life includes consequential and inconsequential events. Fibre must permit things to happen without making them formative.

### Pass B — autobiographical memory formation

Pass B decides what is remembered and how.

Memory formation uses the actual admitted historical events and prior life state. It is **partially genome-blind**.

Before generation, Fibre records whether each memory-formation attempt is:

```text
life_only
life_plus_genome
```

The majority should be `life_only`; exact production ratios are policy/version choices rather than constitutional numbers.

`life_only` sees event, age, relationships, prior events/memories and relevant world context, but no genome.

`life_plus_genome` may additionally see relevant inherited loci, with the explicit semantic allowance that experience may reinforce, complicate, suppress, invert, or remain unrelated to inheritance.

Pass B must not silently resample memories to force a desired genome-confirming/contradicting ratio.

### Pass C — remembered meaning and reinterpretation

Pass C creates durable semantic interpretation where one genuinely exists.

Not every event is remembered. Not every memory has durable meaning. Not every meaning is resolved.

Meaning remains semantic authoritative state, not a valence/effect enum.

For materially ambivalent meanings:

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

Each material part has stable identity and is independently inspectable/citable for #40.

Later reinterpretation appends/supersedes meaning under #38 memory epistemics; it never rewrites the historical event.

## Rejection and retry policy

Generation failures must remain visible.

Each candidate generation attempt records:

```text
GenerationAttempt {
  attemptId
  pass
  inputDigest
  outputDigest
  outcome: admitted | rejected
  rejectionReasons[]
}
```

Hard integrity failures may retry under a bounded policy, for example:

- chronology violation;
- source laundering;
- invalid provenance;
- stereotype-derived personality;
- future behavioral rule encoded as memory;
- event/memory/meaning epistemic conflation;
- invalid meaning-part granularity.

Retries are bounded and witnessed in the GenesisManifest.

Quality failures such as `generic life`, `insufficient distinctness`, or `too much genome confirmation` do **not** silently trigger resampling until a prettier cohort appears. The first integrity-valid cohort is frozen and evaluated. If it fails quality review, Fibre changes the generator/policy and creates a new explicitly versioned cohort.

Rejection rate and rejection reasons are reported. Both persistently high rejection and implausibly zero rejection are signals to inspect the generator/validators.

## Personhood-quality cohort

#39 closes with a frozen quality cohort of **five Threads**, all de-novo or synthetic-lineage, created before any fresh #40 Whole-Person scenario is authored.

The cohort is varied primarily by world:

- geography;
- household/family shape;
- languages;
- material circumstances;
- mobility;
- school/community institutions;
- relationship structures;
- intellectual formation.

World specs must not pre-author adult personality.

Echo/Homage/source-derived Threads are excluded from this cohort so borrowed human/literary personality cannot pass the Genesis-quality review on the generator's behalf.

## Integrity cohort

Separate hand-authored fixtures demonstrate:

- Thread-parent truth boundary;
- consenting-human Echo boundary;
- deceased/fictional Homage boundary;
- fork boundary;
- source != Thread history;
- no living-person Homage bypass.

These fixtures prove provenance integrity. They do not count as evidence that the life generator creates distinctive people.

## Cohort quality diagnostics

These are cohort-level diagnostics, not a large behavioral standing suite.

### 1. Blind life attribution

Strip names, professions, source labels, explicit world identifiers where needed, and presentation metadata. Shuffle memories/meaning excerpts across Threads. Human reviewers should be able to group material into the originating lives meaningfully above chance.

This operationalizes the vision question: are the lives intrinsically distinguishable?

### 2. Sentiment predictability / mood monoculture

Reviewers examine whether childhood/event sentiment makes the Thread's likely disposition trivially predictable.

The target is not a specific score. A cohort that reduces people to `bad childhood -> negative person` and `kind childhood -> positive person` fails review.

### 3. Genome-confirmation characterization

Blind-rate each durable remembered meaning against inherited loci as:

```text
genome_confirming
genome_orthogonal
genome_contradicting_or_complicating
```

Report the distribution. If meanings are overwhelmingly genome-confirming, the genome is writing the person and the generator fails the #39 vision review.

Do not resample individual memories to improve the metric.

### 4. Style-normalized semantic distinctness

Genesis quality must not depend on superficial prose voice.

Normalize/rewrite excerpts into a common neutral presentation style and repeat attribution/inspection. If Thread distinctness disappears when writing cadence is normalized, Genesis has created narrator variation rather than life variation.

Post-live self-authored voice belongs to later Development, not to #39's personhood claim.

## Narrow automated invariants

Automated tests should protect Fibre-specific facts only:

1. deterministic/replayable Genesis manifest and genome crossover;
2. exact source/locus/event provenance;
3. Pass A cannot access genome or future role/benchmark inputs;
4. source person facts cannot become Thread history without an actual Thread-life event;
5. living identifiable human requires Echo consent; Homage requires `deceased` or `fictional` attestation;
6. event != memory != remembered meaning;
7. meaning parts have stable independently citable IDs;
8. later reinterpretation is append-only/corrigible;
9. no ancestry/culture/demographic stereotype laundering;
10. no future behavioral rule encoded in remembered meaning;
11. retry/rejection history is bounded and inspectable;
12. every admitted autobiographical memory creates the #38 photo obligation;
13. restart reconstructs the same admitted Genesis records.

Do not turn the four cohort-quality diagnostics into dozens of brittle unit tests.

## Photo posture

Every admitted autobiographical memory gets its #38 visual companion obligation and evidence-bound reconstruction prompt.

#39 does **not** need to synchronously render all cohort images or build media-throughput infrastructure. `pending_generation` remains operational debt, not success, under ADR-0011; the obligation itself must be present and inspectable.

## Implementation slices

### A — Genesis Manifest + WorldSpec

Implement Genesis authority, world specification, policy/witness recording, attempt/rejection accounting, exact replay and inspection.

### B — Symbolic Genome

Implement textual loci, deterministic crossover, mutation, provenance, immutability and read-only inspection.

### C — Core origin policies

Implement rich-life creation for de-novo and synthetic-lineage. Add bounded integrity fixtures for Thread-parent/Echo/Homage/fork rather than four independent generation systems.

### D — Three-pass life compiler

Implement genome-blind Pass A, partially blind Pass B and semantic Pass C with append-only reinterpretation.

### E — Intellectual formation

Make reading/mentor/intellectual encounters first-class life events that can produce their own memories and meanings without copying source personalities.

### F — #38 persistence integration

Write directly into existing authoritative #37/#38 domains: identity, relations, places, embodiment/history, autobiographical memory and memory-photo obligations. Do not create a second biography/memory authority.

### G — Boundary fixtures

Prove living-human consent, deceased/fictional Homage, Thread-parent no-fabricated-history, fork boundary and source != Thread history.

### H — Inspection + frozen cohort

Provide a human-readable Genesis inspection surface and freeze the five-Thread borrowed-free cohort with diagnostic results before #40 scenario authorship.

## Inspection questions

A reviewer must be able to answer:

- Where did this Thread come from?
- What world did it grow up in?
- Which parents/ancestors/sources were eligible?
- Which genome loci came from where?
- Which facts are source facts rather than Thread history?
- What actually happened?
- Which events were remembered?
- What did some experiences come to mean?
- Which tensions remain unresolved and separately citable?
- Which meanings confirm, complicate, contradict, or ignore inheritance?
- What was rejected during generation and why?
- Which memory-photo obligations remain outstanding?

## Explicit non-goals

#39 does not implement:

- Guardian tuning;
- Whole-Person standing;
- #40 relevance selection / Identity Context Capsule;
- accepted-causal score movement;
- post-live self-authored Development;
- full Wikipedia/book/web ingestion;
- generic genealogy architecture;
- media throughput/queue infrastructure;
- social/economic simulation;
- fabricated retrospective childhood for already-live Thread parents;
- numeric personality authority.

## Completion gate

#39 is complete when Fibre can:

1. deterministically create/replay de-novo and synthetic-lineage Threads with distinct world specs;
2. preserve symbolic inherited origin separately from lived history;
3. generate history before memory and memory before durable interpretation;
4. preserve particular, sometimes ambivalent, independently citable remembered meanings;
5. allow most life material to remain unrelated to genome and allow events to be non-formative;
6. demonstrate truthful provenance boundaries for Thread-parent, Echo, Homage and fork;
7. freeze a five-Thread borrowed-free cohort and report the four quality diagnostics without resampling it to pass;
8. expose a readable explanation of why each Thread began life this way;
9. leave all #40/#41 causal and standing claims explicitly unearned.

## Vision test

> **Can Fibre create several people from nothing borrowed whose lives are particular enough that later cognition has something real and non-interchangeable to inherit?**

If yes, #39 has created the substrate #40 needs.

If not, more origin modes, more source adapters, or richer biography prose do not solve the problem.
