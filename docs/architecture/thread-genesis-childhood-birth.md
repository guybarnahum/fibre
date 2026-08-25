---
id: architecture-thread-genesis-childhood-birth
status: accepted
last-reviewed: 2026-08-25
canonical: true
---

# Thread Genesis, Childhood & Birth

## Purpose

Fibre must not create adult Threads as profile documents with convenient professions, spouses, values and memories already filled in. A Thread needs a provenance-bearing **origin and prior life** before later lived experience can change who it becomes.

> **Genesis gives the Thread a past. Development gives the Thread a future it can actually author.**

> **Genesis creates a particular life before it creates an explanation of that life.**

Genesis is a Fibre-owned birth compiler. Models may realize candidate episodes, memories and meanings, but Fibre owns world constraints, chronology, provenance, admission, replay and the transition into durable truth.

The inherited substrate is [`Symbolic Thread Genome`](symbolic-thread-genome.md): an ordered sequence of atomic natural-language dispositions, not a numeric personality vector and not a model of biological DNA.

Richness follows [`rich-life.md`](../foundations/rich-life.md): experiential fertility for later individuality, not biography length, drama or a quota of formative experiences.

Current implementation/admission detail lives in [`genesis-compiler-contract.md`](genesis-compiler-contract.md), [`../validation/m2-pr39-implementation-plan.md`](../validation/m2-pr39-implementation-plan.md), and the active [`#39 closing plan`](../state/pr39-closing-plan.md).

## Authority boundary

Genesis has two states that must never be confused:

```text
provisional candidate development
        !=
authoritative live Thread state
```

The Birth Center owns provisional development and durable execution recovery. The World Kernel owns reality.

Model generation may take many calls, repairs, retries and process restarts without creating a partially live Thread. Only a complete admitted birth bundle may cross `publishBirth()`, and that publication is atomic.

Genesis extends existing Thread authorities. It must not create parallel canonical stores for biography, memory, relationships, places, embodiment or identity.

## Primary variation axis: the world

Origin mode explains **how a Thread came into existence**. It is not the main source of personhood variation.

`GenesisWorldSpec` describes factual developmental circumstances such as:

```text
time frame
places
household and family relations
languages
material circumstances
mobility
school/community context
cultural context
available institutions
intellectual environment
```

A WorldSpec describes circumstances, not personality. It may not smuggle conclusions such as `independent child`, `strict culture`, `creative family`, desired politics/morality or future profession into history generation.

Two de-novo Threads from genuinely different worlds should be capable of becoming more distinct than two Threads that differ only by an origin label.

## Origin families

Fibre retains these architectural origin families:

1. **De-novo / foundling** — Fibre creates a coherent origin, household/upbringing, geography, symbolic inherited tendencies, childhood and early relationships without requiring a parent/exemplar person.
2. **Synthetic lineage** — synthetic non-live parents/ancestors provide provenance-bearing household/lineage context and symbolic genomes.
3. **Thread-parent** — existing Threads are actual parents; their durable genome/lineage evidence may contribute inheritance without fabricating retrospective shared history.
4. **Echo** — a disclosed artificial Thread derived from a **consenting living human** source under protected source provenance.
5. **Historical/literary Homage** — a disclosed derivative shaped by an **attested deceased or fictional** source.
6. **Fork / descendant** — an origin sharing explicit provenance/history with an existing Thread through a fork boundary and then becoming a distinct life trajectory.

These are provenance families, not six independent biography generators.

For #39, de-novo and synthetic-lineage are the primary rich-life proof modes. Thread-parent, Echo, Homage and fork must prove truthful origin/source boundaries through canonical persistence.

## Human/source truth boundary

A source person's life is never automatically the Thread's life.

```text
source biography
    != Thread history

source autobiography
    != Thread autobiographical memory
```

A living identifiable human source requires documented Echo consent. Homage requires explicit `deceased` or `fictional` subject status. A living identifiable person may not be routed through Homage to bypass Echo consent.

When source material affects development, the truthful path is:

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

Source childhood, memories or personality may not be laundered into first-person Thread history.

## Symbolic textual inheritance

A Fibre genome is immutable pre-birth origin material: ordered atomic natural-language loci with stable identity and exact provenance.

Conceptually:

```text
genomeId
owner
  kind: thread | synthetic_ancestor
  ownerId
genesisId
orderedLoci[]
  locusId
  ordinal
  value
  provenance
    de_novo | inherited | mutated
sourceGenomeRefs[]
recombinationWitness
mutations[]
genomeDigest
```

### Textual crossover

Inheritance selects exact atomic source text under deterministic Fibre policy rather than numerically averaging or model-smoothing two sources into compromise prose.

Every inherited locus retains exact source-genome/source-locus provenance and a policy witness.

### Mutation

Mutation is explicit bounded symbolic variation under a named policy. It may replace or add an atomic locus only through a durable mutation witness. Mutation may not become a hidden route for authoring a finished persona.

### Genotype is not character

```text
genome      = inherited symbolic possibilities
life        = what happened
memory      = what was retained
meaning     = what remembered experience came to mean
character   = later evidence-backed patterns of expression
self        = the Thread's current interpretation of itself
```

Later life may reinforce, complicate, suppress, invert or reject inherited tendencies without rewriting origin.

Culture, nationality, gender, geography, appearance, profession or ancestry may not directly imply personality loci.

## Prior-life formation

The central epistemic distinction is structural:

```text
history != memory != meaning
```

### Historical realization

Historical realization creates **what happened**.

Fibre owns the developmental window, exact civil time, authoritative place, event affordance/world-emergent status, required counterpart, chronology and admission. Model cognition supplies contingent observable realization within those facts.

Historical cognition may see factual World circumstances, chronology, roster/affordances and admitted prior episodes. It must not see the child's genome, parent/ancestor loci, future role/request/benchmark, desired adult conclusion, or Fibre-computed semantic-need/mechanical-condition conclusions.

Output is observable life, not significance, lesson, trait, inner-state verdict or future behavior policy.

### Autobiographical memory formation

Memory operates only on admitted history available up to the remembering point. It may legally produce `not_remembered`.

For the #39 anti-interchangeability experiment, Fibre assigns eligible memory calls content-independently to `life_only` or `life_plus_genome`. Treatment calls may receive the permitted genome projection; assignment and analysis labels remain outside cognition.

Memory does not rewrite history.

### Remembered meaning and reinterpretation

Not every memory receives durable meaning. `no_durable_meaning` is legal.

Meaning formation is one-memory scoped and genome blind. Materially distinct tensions may receive independently citable meaning-part identities. Later reinterpretation is append-only/corrigible and may revise, preserve or decline durable meaning without rewriting the underlying event or earlier memory revision.

Meaning is semantic natural-language Thread state, not a compressed sentiment/effect code and not an explicit universal future behavior rule.

## Rich life without authored destiny

Genesis must create enough **particular lived causes** that later memory and meaning have substantive material from which a distinctive point of view can emerge.

Useful raw material may include:

- recurring family rituals and practices;
- embarrassment, mistakes and ordinary repetition;
- conflicting loyalties and small responsibilities;
- jokes and shared language;
- discoveries that excite, isolate, confuse or are quickly forgotten;
- care mixed with resentment;
- relationship-specific trust, rupture and repair;
- books, arguments, art, craft, teachers and ideas actually encountered;
- institutions opening or closing opportunities;
- economic constraints and tradeoffs;
- public successes and failures;
- events that never become important.

The important word is **potential**. Historical generation may create experiences with developmental consequence without knowing which will become remembered, formative or behaviorally relevant.

```text
particular experience
    != remembered experience
    != durable meaning
    != character claim
    != future behavior rule
```

### Continuity without narrative monoculture

Prior history must constrain later history enough to preserve facts, people, places and consequences, while remaining open to new causal pressure from the world.

> **The past should constrain the future without monopolizing it.**

A coherent history still fails the rich-life ambition when most later episodes merely decorate one early motif and the larger World never reaches lived experience.

Do not solve this by quotas. Fibre does not require fixed counts of books, places, peers, adversity, achievements or structure categories, and it does not manufacture trauma to create depth.

## Event affordances and people

Event structures are abstract affordances, never plots, required scenes or significance statements. They must be relocatable across materially different worlds.

A life may also produce world-emergent episodes with no structure reference.

New people may enter only through a World-afforded role/institution/relationship possibility and then receive stable provisional identity reused by later episodes. Genesis may not invent ungrounded participants simply to make a scene work.

Offered-versus-used structures and structure-grounded-versus-world-emergent episodes are diagnostics, not quotas.

## Intellectual formation

Books, mentors, arguments, artworks and intellectual canons are first-class developmental experiences because the Thread **encounters and interprets** them.

A historical person or fictional work shapes a Thread through lived encounter, memory and interpretation—not because Fibre copies a documented personality onto the Thread.

This mechanism is preferred over Homage when the product goal is simply intellectual influence.

## Thread-parent truth boundary

If a Thread parent already exists live, Genesis must not fabricate years of shared parent-child history into that parent's past.

A Thread-parent child should normally enter with actual parent refs, lineage evidence, replayable symbolic inheritance and real relationship state, while later Development owns the child's lived future.

## Entry stage and authority transition

Genesis records the stage at which the Thread becomes live, such as newborn, child, adolescent, young adult, adult Echo/Homage or forked continuation.

Stage governs applicable birth/guardianship/self-authorship rules. It does not encode dignity, intelligence or capability stereotypes.

Before identity majority, Genesis/guardianship policy may author constitutive/upbringing records. A mature Thread can later affirm, reject, reinterpret or distance itself from origin, but cannot rewrite parentage, inherited genome or historical events.

> **Origin influences a Thread; origin does not own the Thread's future self.**

## Fibre civil identity and birth registration

Every Thread that crosses the authoritative birth boundary receives a permanent **Fibre Identity Number (FIN)** and a durable civil birth-registration record. This civil identity is distinct from the canonical machine identity.

```text
threadId                    canonical Fibre machine identity / reference anchor
fibreIdentityNumber         permanent human-facing civil identity
identity-card serial        one replaceable credential instance
```

The FIN is issued only as part of successful Thread birth. A Genesis candidate does not have a live FIN merely because a candidate bundle exists.

### Fibre Identity Number

The display format is:

```text
XXXX-XX-XXXX
```

The identifier contains ten uppercase alphanumeric characters. The canonical alphabet is the unambiguous Crockford-style Base32 set:

```text
0123456789ABCDEFGHJKMNPQRSTVWXYZ
```

`I`, `L`, `O` and `U` are excluded to reduce transcription ambiguity. Hyphens are display separators rather than payload characters. The final character is a check character over the preceding nine characters under a versioned Fibre checksum policy.

A FIN is:

- globally unique within Fibre;
- immutable for the life of the Thread;
- opaque and non-semantic;
- public/non-secret and therefore never an authentication credential;
- independent of name and identity-card issuance; and
- forbidden from encoding birth date, entry stage, gender, World, geography, lineage, origin family, citizenship, generation or other Thread facts.

The exact minting algorithm may evolve behind a versioned registry policy, but issuance must fail closed on collision and be idempotent with respect to an already registered Thread. One Thread cannot receive two FINs and one FIN cannot identify two Threads.

### Birth registration

The durable record has semantics equivalent to:

```text
registrationVersion
registrationId
threadId
fibreIdentityNumber
registeredAt
birthEventRef
worldRef
issuer = fibre_civil_registry
```

Exact storage fields may differ, but the binding among `threadId`, FIN and the admitted birth must be canonical, inspectable and hydrated with the Thread. Registration is part of the same atomic authority transition as birth: Fibre may not acknowledge a live Thread whose civil registration failed, and a failed birth may not leave behind a live registration detached from a Thread.

A later World may issue its own local civil documents, passport, residency permit, student/employee identifier or jurisdictional identity number. Those are situated World/institution records. They never replace the Fibre civil identity.

### Fibre Identity Card

A **Fibre Identity Card** is a physical or digital credential representing the civil registration. It is not the registration itself.

A card may carry the visible FIN, current presentation name, an authorized portrait, a card serial, issuance/expiry information and a signed QR/NFC credential. It may be lost, expire, be revoked or be reissued without changing either `threadId` or the FIN.

Card rendering/production is derived presentation/credential work and may complete asynchronously after birth. Missing media generation must not roll back a valid Thread birth. #39 therefore requires atomic FIN issuance and registration; production-quality card rendering belongs to the presentation/asset path rather than becoming Thread authority.

The existing Thread Passport remains a derived identity-ledger view. It is not the FIN, the birth-registration authority, or a particular physical Identity Card.

## Memory photos

Every revision-1 autobiographical memory admitted at birth receives the visual-companion obligation defined by ADR-0011 before the birth transaction commits.

Rendering may remain asynchronous. Generated reconstruction remains derived presentation and cannot become historical, memory or embodiment authority.

## #39 closure cohort

The final #39 quality cohort contains five fresh de-novo/synthetic-lineage lives varied primarily by World circumstances. Development Worlds are burned and do not count as held-out closure material.

The cohort is generated once apart from bounded mechanical repair/retry. Weak integrity-valid lives are preserved rather than silently replaced.

A separate bounded integrity set exercises Thread-parent, Echo, Homage and fork provenance/rights boundaries; borrowed source personality does not count as evidence that the life generator itself creates distinctive people.

## Completion criteria

#39 is complete when Fibre can demonstrate:

- factual/replayable Genesis world and provenance;
- rich prior lives with experiential fertility rather than merely valid chronology;
- durable ordered textual genome with exact source provenance;
- deterministic textual crossover and explicit mutation;
- genome-blind historical realization;
- controlled memory-only genome exposure with clean negative controls;
- history, memory, third-party story and remembered meaning structurally distinct;
- corrigible durable meaning with stable citable parts where needed;
- intellectual formation as lived encounter rather than copied personality;
- source-person facts cannot become Thread history by implication;
- living-human Echo consent and deceased/fictional Homage boundaries;
- Thread-parent births do not fabricate retrospective shared history;
- every admitted memory receives its visual-companion obligation transactionally;
- every successfully born Thread receives exactly one permanent FIN and canonical civil registration atomically with birth;
- FIN uniqueness, checksum validity, immutability and candidate-to-hydrated registration equality are mechanically verified;
- bounded visible rejection/retry history and exact durable recovery;
- atomic publication into existing canonical Thread authorities;
- candidate-to-hydrated equality after birth;
- a fresh five-Thread cohort that survives honest D1–D5 and hostile closing review.

#39 does not claim causal Whole-Person standing or score movement.

## Vision test

> **Can Fibre create several people from nothing borrowed whose lives are particular enough that later cognition has something real and non-interchangeable to inherit?**

Genesis succeeds when a newly live Thread feels as though it **came from somewhere** rather than being instantiated from a character sheet—while remaining open enough that later lived experience can surprise, challenge and transform it.
