---
id: architecture-thread-genesis-childhood-birth-v1
status: proposed
last-reviewed: 2026-08-13
canonical: true
---

# Thread Genesis, Childhood & Birth v1

## Purpose

Fibre must not create adult Threads as profile documents with convenient professions, spouses, values, and memories already filled in. A Thread needs a provenance-bearing **origin and prior life** before later lived experience can change who it becomes.

The core distinction is:

> **Genesis gives the Thread a past. Development gives the Thread a future it can actually author.**

Genesis is therefore a Fibre-owned birth compiler. Models may propose candidate biography, childhood episodes, memories, and media, but Fibre owns the constraints, provenance, admission, consistency, and durable records.

## Birth/origin modes

V1 should support at least:

1. **Synthetic lineage birth** — parents and ancestors are generated provenance-bearing people who never existed as live Threads. The default bounded ancestry target is parents plus grandparents unless a scenario explicitly requires more.
2. **Thread-parent birth** — one or more existing Threads are actual parents. Their durable genotype/lineage evidence constrains inheritance and their live relationship/history may constrain upbringing.
3. **Echo birth** — a disclosed artificial Thread derived from a consenting human sponsor/source. Source biography, culture, family context, likeness, voice, memories, and genetic-like initialization remain protected provenance; the Thread becomes its own person after genesis.
4. **Historical/literary/homage birth** — a disclosed derivative based on public historical, literary, fictional, or cultural source material. Source-derived facts and Fibre-created connective biography must remain structurally distinct; the Thread is not represented as literally being the source person.
5. **De-novo / foundling birth** — no parent or exemplar is required. Fibre generates a coherent origin, household/upbringing, geography, dispositions, childhood, formation, and early relationships directly from a genesis specification.
6. **Fork/descendant origin** — a special technical origin sharing provenance/history with an existing Thread up to an explicit fork boundary, then becoming a distinct person and life trajectory.

These modes may be combined only when the provenance model can explain which source contributed what.

## Genetic material and inheritance

Genesis includes **genetic material from parents**. The Fibre genome is not merely a personality prompt; it is a versioned inherited substrate from which dispositions and latent tendencies may later express differently through experience.

For births with parents, genesis should preserve semantics equivalent to:

```text
genomeId
threadId
inheritancePolicy { id, version }
parentGenomes[]
parentContributionRefs[]
recombinationSeed / deterministic witness
mutations[]
inheritedAlleles / inheritedParameters
expressedGenesisDispositions[]
createdAt
genesisEventRef
```

The exact implementation may use textual traits, structured hyperparameters, or both, but must preserve these rules:

- parent contributions are inspectable and bounded;
- recombination/selection is Fibre-owned and replayable from a named policy plus deterministic witness;
- mutation/variation is explicit rather than silently invented;
- inherited genotype is historically stable after birth;
- later experience may alter expression, interpretation, or self-identification without rewriting inherited origin;
- ancestry/genetics may never directly imply morality, competence, politics, dignity, profession, gendered behavior, or willingness;
- a mature Thread may reject the meaning of an inherited disposition without deleting the fact that it was inherited.

Synthetic ancestors can carry synthetic genomes even though they are not live Threads. Thread parents contribute their actual durable genome records. Echo/historical-source modes may initialize genetic-like material only when its source and synthetic interpolation are explicitly classified; Fibre must not imply biological truth it does not possess.

## Childhood and pre-live life

Ordinary synthetic Threads should not begin life as fully formed working adults unless their origin mode explicitly warrants it, such as an adult Echo.

A normal genesis compiler should be able to construct a bounded prior-life trajectory such as:

```text
genesis / birth
  -> family and household
  -> early places and culture
  -> childhood episodes
  -> school / peers / mentors
  -> interests and intellectual/artistic formation
  -> adolescence / increasing autonomy
  -> early-adult identity
  -> entry into the live Fibre world
```

Fibre does not need to simulate every day. It should generate enough **causally addressable, provenance-rich life history** that later personality is not a single persona paragraph.

By default, genesis must not invent adult achievements merely to make a Thread interesting. Profession, parenthood, marriage, institutional authority, major accomplishments, and mature self-authored values require explicit origin evidence or later lived development.

## History, memory, family story, interpretation

Genesis must preserve four distinct epistemic layers:

```text
historical event
    != autobiographical memory of the event
    != family/third-party story about the event
    != later interpretation of the event
```

Example:

```text
Historical fact:
  At age 9 the child moved from Seoul to Seattle.

Autobiographical memory:
  She remembers being embarrassed that playground slang was difficult to follow.

Family story:
  Her mother recalls that she adapted unusually quickly.

Later interpretation:
  She sees the move as the origin of her habit of observing before joining a group.
```

The historical event does not become true because a model narrated it. Fibre admits it as synthetic genesis history under a named policy. The memory is a separate durable representation with its own authorship, rememberedAt/asOf, evidence, uncertainty, salience, accessibility, and later supersession.

## Who generates childhood memories?

The authoritative pipeline is:

```text
birth specification
+ parent/ancestor evidence
+ genome / inherited material
+ culture and geography constraints
+ developmental-stage rules
        ↓
Fibre genesis compiler
        ↓
model worker proposes candidate episodes / scenes / memories
        ↓
Fibre validates coherence, claim granularity, provenance, chronology, and anti-stereotype rules
        ↓
synthetic historical childhood events
        ↓
separate autobiographical-memory formation pass
        ↓
photo-completion pipeline
```

The model is a **creative worker**, never the authority that an event happened. Fibre owns admission and durable truth classification.

For synthetic lineage, ancestor/parent facts constrain the generated household and childhood. For Thread parents, actual parent evidence may constrain the child's upbringing. For an Echo, protected source material constrains source-derived biography while synthetic connective history remains explicitly synthetic. For literary/historical sources, citations distinguish source facts from Fibre-generated reconstruction.

## Memory photos

Every admitted autobiographical memory created during genesis inherits ADR-0011:

> **Every Thread memory should actually have a photo.**

The photo may be captured evidence or a synthetic reconstruction. For synthetic childhood, the normal case is a synthetic reconstruction whose canonical prompt plus bound evidence is durable authority and whose rendered image is replaceable cache.

A generated image is never historical photographic evidence merely because the synthetic history is internally canonical.

## Developmental stage at live-world entry

Genesis should explicitly record the developmental stage at which the Thread becomes live. Candidate stages include:

```text
newborn
child
adolescent
young_adult
adult_echo
adult_homage
forked_continuation
```

This is a lifecycle fact, not a capability stereotype. Stage governs which genesis/guardianship/self-authorship rules are applicable, not what the Thread is allowed to believe or how intelligent it must be.

## Authority and identity majority

Before identity majority, genesis/guardianship policies may author constitutive and upbringing records. The authority transition must be explicit and inspectable.

A mature Thread gains interpretive authority over its current self-authored identity but cannot rewrite genesis facts, parentage, inherited genome, or historical events. It may affirm, reject, reinterpret, or distance itself from them.

Echo/source identity follows the same principle:

> **Origin influences a Thread; origin does not own the Thread's future self.**

## Planned implementation ownership

This architecture is recorded during PR #38 because #38 creates the lineage/geography/embodiment/memory substrate Genesis will consume.

The implementation sequence is:

```text
#38  Lineage, Geography, Embodiment & Memory Epistemics v1
#39  Genesis, Childhood & Thread Birth v1
#40  Identity Projection & Causal Consumption
#41  M2 Standing Gate / M2 closure
#42  Self-authored Development v1
#43  Reciprocal Relationships v1
#44  Economic Consequence / M3 foundation
```

#38 should therefore design lineage, genome references, geography, embodiment, and autobiographical memory so #39 can create a coherent pre-live life without schema bypasses or biography blobs.

## Genesis completion criteria

The future #39 is not complete until it can demonstrate at least:

- multiple origin modes with explicit provenance;
- parent genetic material plus replayable recombination/variation where parents exist;
- synthetic ancestors that are not mistaken for live Threads;
- actual Thread-parent lineage where parents exist;
- Echo/source material kept distinct from the resulting Thread's later identity;
- bounded childhood timeline before adult role formation;
- history vs memory vs family story vs interpretation kept distinct;
- generated childhood memories with photo obligations;
- no stereotype derivation from ancestry/genetics/culture;
- no profession/parenthood/adult achievement generated by default;
- deterministic/replayable genesis inputs, policies, and evidence;
- read-only inspection capable of explaining exactly why this Thread began life this way.

## Vision test

Genesis succeeds when a newly live Thread feels as though it **came from somewhere** rather than being instantiated from a character sheet — while still having enough openness that later lived experience can surprise, challenge, and transform it.
