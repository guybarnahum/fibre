---
id: architecture-thread-genesis-childhood-birth-v1
status: accepted
last-reviewed: 2026-08-14
canonical: true
---

# Thread Genesis, Childhood & Birth v1

## Purpose

Fibre must not create adult Threads as profile documents with convenient professions, spouses, values, and memories already filled in. A Thread needs a provenance-bearing **origin and prior life** before later lived experience can change who it becomes.

The core distinction is:

> **Genesis gives the Thread a past. Development gives the Thread a future it can actually author.**

The stronger #39 design principle is:

> **Genesis creates a particular life before it creates an explanation of that life.**

Genesis is a Fibre-owned birth compiler. Models may propose candidate episodes, memories, meanings and media, but Fibre owns world constraints, provenance, admission, consistency, replay and durable truth classification.

The inherited substrate is [`Symbolic Thread Genome v1`](symbolic-thread-genome-v1.md): an ordered sequence of atomic natural-language dispositions, not a numeric personality vector and not a model of human DNA.

Canonical implementation plan: [`../validation/m2-pr39-implementation-plan.md`](../validation/m2-pr39-implementation-plan.md).

## Primary variation axis: the world

Origin mode explains **how a Thread came into existence**. It is not the main source of personhood variation.

The primary Genesis variation is the Thread's world:

```text
GenesisWorldSpec {
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

A WorldSpec describes circumstances, not personality. It must not smuggle conclusions such as `independent child`, `strict culture`, `creative family`, or equivalent adult character claims into history generation.

Two de-novo Threads from genuinely different worlds should be capable of becoming more distinct than two Threads that differ only by origin label.

## Origin families

Fibre retains six canonical origin families:

1. **De-novo / foundling** — Fibre creates a coherent origin, household/upbringing, geography, symbolic inherited tendencies, childhood, formation and early relationships without requiring a parent/exemplar person.
2. **Synthetic lineage** — synthetic non-live parents/ancestors provide provenance-bearing household/lineage context and symbolic genomes. Parents plus grandparents are a useful bounded default, not a constitutional minimum.
3. **Thread-parent** — one or more existing Threads are actual parents. Their durable genome/lineage evidence may contribute inheritance. Fibre must not fabricate shared history for already-live parents.
4. **Echo** — a disclosed artificial Thread derived from a **consenting living human** source. Approved source biography, family/culture, likeness, voice, autobiography and intellectual material remain protected provenance; the Echo becomes its own person after Genesis.
5. **Historical/literary Homage** — a disclosed derivative shaped by a **deceased or fictional** source. Source material and Fibre-created life remain structurally distinct. A living identifiable person may not be routed through Homage to bypass Echo consent.
6. **Fork / descendant** — a technical origin sharing provenance/history with an existing Thread through an explicit fork boundary, then becoming a distinct person and life trajectory.

These are architectural families, not six required independent life generators.

For #39, de-novo and synthetic-lineage are the **rich-life proof modes**. Thread-parent, Echo, Homage and fork must demonstrate truthful provenance boundaries through canonical persistence, but may use bounded fixtures rather than separate full Genesis pipelines.

## Human/source truth boundary

A source person's life is never automatically the Thread's life.

```text
source biography
    != Thread history

source autobiography
    != Thread autobiographical memory
```

A living identifiable human source requires documented Echo consent.

A Homage source must carry explicit attestation:

```text
subjectStatus = deceased | fictional
```

The status is provenance-bearing input, not something Fibre infers from an infobox or prose page.

For source-derived formation, the truthful pattern is:

```text
source material
      ↓
Thread actually encounters / studies / reacts to it
      ↓
Thread historical event
      ↓
Thread memory
      ↓
Thread remembered meaning
```

A source person's childhood, memories or personality may not be laundered into first-person Thread history.

#39 does not require a Wikipedia importer, ebook ingestion system, crawler or generic human-profile pipeline. Frozen source bundles are sufficient to demonstrate the boundary.

## Symbolic textual genome and inheritance

Genesis may include symbolic genetic material from eligible parent/source genomes.

A Fibre genome is a versioned ordered sequence of atomic natural-language dispositions. Canonical persistence keeps loci individually addressable with stable IDs and exact provenance.

Conceptually:

```text
genomeId
threadId
inheritancePolicy { id, version }
orderedLoci[] {
  locusId
  ordinal
  value
  sourceGenomeRef?
  sourceLocusRef?
  mutationRef?
}
sourceGenomeRefs[]
recombinationWitness
mutations[]
createdAt
genesisEventRef
```

Human-readable rendering may use semicolons. Punctuation is presentation; locus text plus provenance is authority.

### Textual crossover

Where two source genomes contribute, Fibre performs deterministic provenance-preserving selection/crossover rather than numerical averaging.

```text
Source A  A1 ; A2 ; A3 ; A4 ; A5 ; A6
Source B  B1 ; B2 ; B3 ; B4 ; B5 ; B6
Result    A1 ; A2 ; B3 ; B4 ; A5 ; B6
```

Every inherited locus retains exact source-genome/source-locus provenance and policy/version witness.

Recombination should preserve unusual mixtures and tensions rather than smooth sources into generic compromise prose.

### Atomic locus rule

A locus expresses one reasonably independent inherited tendency.

Good:

```text
takes promises literally
recovers from embarrassment by becoming more prepared
is reluctant to ask for favors
becomes playful around very serious people
```

Weak:

```text
persistent
friendly
creative
```

A compound adult persona paragraph is noncompliant.

### Mutation

Mutation is explicit symbolic semantic variation under a named/versioned policy. It may add or boundedly alter an atomic textual locus. It must carry witness and provenance and may not become a hidden route for generating a finished adult persona.

### Genotype is not character

```text
genome      = inherited symbolic possibilities
life        = what happened
memory      = what was retained
meaning     = what some experience came to mean
character   = later evidence-backed patterns of expression
self        = the Thread's current interpretation of itself
```

Inherited genotype remains historically stable after birth. Later life may reinforce, complicate, suppress, invert or reject its expression without rewriting origin.

Culture, nationality, gender, geography, appearance, profession or ancestry may not directly imply personality loci.

## Three-pass prior-life formation

`history != memory != meaning` must be structural.

### Pass A — world/history

Pass A creates what happened.

It may see world circumstances, chronology, family/household facts, places, languages and developmental bounds.

It must **not** see:

- the child's symbolic genome;
- parent/ancestor genome loci;
- future profession/role;
- future request or benchmark;
- a desired adult personality conclusion.

Pass A produces specific synthetic historical episodes under Genesis-authorized event kinds/evidence.

A believable life includes both consequential and inconsequential events. Fibre must permit things to happen without later making them formative.

### Pass B — autobiographical memory

Pass B operates only on admitted history and prior life state.

Memory formation is partially genome-blind. Fibre records whether a memory-formation attempt is `life_only` or `life_plus_genome` before generation. The majority should normally be `life_only`; exact ratios are policy choices and must not become hidden acceptance targets.

`life_plus_genome` may see relevant inherited loci, but experience may reinforce, complicate, suppress, invert or simply remain unrelated to them.

Fibre may not silently resample memories to make genome confirmation look balanced.

### Pass C — remembered meaning / reinterpretation

Not every event is remembered. Not every memory has durable interpretation. Not every meaning resolves cleanly.

Remembered meaning is durable semantic Thread state under #38 epistemics, not an effect/sentiment category.

Where materially distinct tensions coexist, they receive stable independently citable identities:

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

Later reinterpretation is append-only/corrigible and never rewrites historical fact.

## Intellectual formation

Reading, mentors, arguments, artworks and intellectual canons are first-class developmental experiences.

A book or historical figure shapes a Thread because the Thread **encounters and interprets** the material, not because Fibre copies a documented personality onto it.

```text
historical encounter
    ↓
autobiographical memory
    ↓
admiration / rejection / uncertainty / later reinterpretation
```

This mechanism composes with every origin family and is preferred over Homage when the product goal is simply intellectual influence.

## Rich specificity rather than generic backstory

Genesis should create many specific addressable records rather than one adult persona paragraph.

Useful material includes:

- family rituals;
- private embarrassments;
- mundane mistakes;
- conflicting loyalties;
- jokes that landed badly;
- discoveries that were exciting and isolating;
- small acts of care mixed with resentment;
- relationship-specific incidents;
- books first admired and later rejected;
- events that never became important.

The target is **life texture**, not maximum biography length.

By default Genesis must not invent profession, marriage, parenthood, institutional authority, major accomplishments or mature self-authored values merely to make a Thread interesting.

## Thread-parent truth boundary

If a Thread parent already exists live, #39 must not fabricate years of shared parent-child history into that parent's past.

A Thread-parent child should normally enter the live world as newborn/child with:

- actual parent refs;
- real lineage evidence;
- replayable symbolic inheritance;
- actual relationship state;
- no invented retrospective shared childhood.

Later Development owns the child's lived future.

## Echo and Homage boundaries

### Echo

A living identifiable source requires consent and protected provenance. Source memories remain source memories. The Echo may form memories about encountering its source material and may later affirm, reinterpret or reject the Echo orientation.

### Homage

A v1 Homage uses deceased or fictional source material. The Homage is not the source person, may not claim historical authority, and may admire some source material while rejecting other parts.

Echo and Homage Threads are excluded from the cohort used to judge whether the Genesis generator itself creates distinctive lives; borrowed personality cannot pass the generator-quality review on Fibre's behalf.

## Rejection/retry visibility

Genesis validators are allowed to reject candidate generations, but rejections must remain visible.

Each attempt records input/output digests, outcome and reasons. Integrity retries are bounded and witnessed.

Hard integrity failures may retry; quality failures such as `generic life` or `too much genome confirmation` may not silently trigger resampling until the cohort looks good. A quality failure requires a new explicit generator/policy version and new cohort.

## Memory photos

Every admitted autobiographical memory inherits ADR-0011's photo-completion obligation.

#39 must create the companion obligation and evidence-bound reconstruction prompt. It does not need to synchronously render every Genesis memory or add generic media-throughput infrastructure.

## Developmental stage at entry

Genesis records the stage at which the Thread becomes live, for example:

```text
newborn
child
adolescent
young_adult
adult_echo
adult_homage
forked_continuation
```

Stage governs applicable Genesis/guardianship/self-authorship rules, not intelligence, dignity or capability stereotypes.

## Authority and identity majority

Before identity majority, Genesis/guardianship policy may author constitutive/upbringing records. The authority transition must remain explicit and inspectable.

A mature Thread can affirm, reject, reinterpret or distance itself from its origin, but cannot rewrite parentage, inherited genome or historical events.

> **Origin influences a Thread; origin does not own the Thread's future self.**

## #39 cohort strategy

#39 uses two distinct cohorts.

### Personhood-quality cohort

Five Threads, all de-novo or synthetic-lineage, varied primarily by world conditions rather than origin mode.

This cohort is frozen before any fresh #40 Whole-Person scenario is authored.

### Integrity cohort

Bounded fixtures exercise Thread-parent, consenting-human Echo, deceased/fictional Homage and fork truth/provenance boundaries. They do not count as evidence that the life generator produces distinctive people.

## Genesis completion criteria

#39 is complete when Fibre can demonstrate:

- deterministic/replayable Genesis manifest and WorldSpec;
- rich de-novo and synthetic-lineage prior lives;
- durable ordered textual genome with stable locus identity and exact provenance;
- deterministic textual crossover and explicit mutation;
- genome-blind historical formation;
- partially genome-blind memory formation;
- history vs memory vs family story vs remembered meaning kept distinct;
- stable independently citable meaning parts for material ambivalence;
- intellectual formation as lived experience rather than copied personality;
- source-person facts cannot become Thread history by implication;
- living-human Echo consent and deceased/fictional Homage boundaries;
- Thread-parent births do not fabricate retrospective shared history;
- every admitted memory creates its visual companion obligation;
- bounded visible rejection/retry history;
- a frozen borrowed-free quality cohort whose lives survive human/diagnostic distinctness review;
- read-only inspection explaining exactly why each Thread began life this way.

#39 does not claim causal Whole-Person standing or score movement.

## Vision test

> **Can Fibre create several people from nothing borrowed whose lives are particular enough that later cognition has something real and non-interchangeable to inherit?**

Genesis succeeds when a newly live Thread feels as though it **came from somewhere** rather than being instantiated from a character sheet — while remaining open enough that later lived experience can surprise, challenge and transform it.
