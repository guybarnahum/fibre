---
id: architecture-thread-genesis-childhood-birth
status: accepted
last-reviewed: 2026-09-13
canonical: true
---

# Thread Genesis, Childhood & Birth

## Purpose

Fibre must not create adult Threads as profile documents with convenient professions, spouses, values and memories already filled in. A Thread needs a provenance-bearing **origin and prior life** before later lived experience can change who it becomes.

> **Genesis gives the Thread a past. Development gives the Thread a future it can actually author.**

> **Genesis creates a particular life before it creates an explanation of that life.**

Genesis is a Fibre-owned birth compiler. Models may realize candidate episodes, memories and meanings, but Fibre owns world constraints, chronology, provenance, admission, replay and the transition into durable truth.

The inherited substrate is [`Symbolic Thread Genome`](symbolic-thread-genome.md): ordered atomic natural-language dispositions with exact provenance, not a numeric personality vector and not a literal biological-DNA model.

Richness follows [`rich-life.md`](../foundations/rich-life.md): experiential fertility for later individuality, not biography length, drama or a quota of formative experiences.

Current admission/publication detail lives in [`genesis-compiler-contract.md`](genesis-compiler-contract.md). Current scientific hardening is [`../state/genesis-selectivity-scientific-hardening.md`](../state/genesis-selectivity-scientific-hardening.md). The completed #39 result is retained in [`../history/milestones/pr39.md`](../history/milestones/pr39.md).

## Authority boundary

Genesis has two states that must never be confused:

```text
provisional candidate development
        !=
authoritative live Thread state
```

The Birth Center owns provisional development and durable execution recovery. The World Kernel owns reality.

Model generation may take many calls, repairs, retries and process restarts without creating a partially live Thread. Only a complete admitted birth bundle may cross `publishBirth()`, and publication is atomic for that Thread.

Genesis extends existing Thread authorities. It must not create parallel canonical stores for biography, memory, relationships, places, embodiment, identity or civil registration.

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

## Sex as a pre-development birth fact

Biological/embodied sex is a basic Thread/animal attribute. It is more fundamental than visual phenotype and is not a personality trait.

The current authoritative representation is:

```text
thread.identity.sex = female | male
```

The accepted authority direction is:

```text
pre-development Thread sex
        ↓
Genesis development where causally relevant
        ↓
canonical embodiment / visual phenotype
        ↓
future physiology, regulation and reproduction where explicitly modeled
```

A renderer, name, pronoun, occupation or historical stereotype may never become the source from which Fibre infers sex.

Current Genesis persists sex on the admitted Thread and canonical visual identity consumes that value. The follow-on requirement is stronger: **sex must be selected before any historical-development cognition begins**, carried in the Genesis slot/subject, and publication must verify the same value rather than first creating it at the publication boundary. New synthetic births should retain an approximately 50/50 female/male birth probability without introducing a global quota counter.

Sex is distinct from gender identity, pronouns and sexual orientation. Those may later become lived or self-authored Thread state under their own authority and provenance; Presentation must not infer them from sex or appearance.

### Sex-dependence classification

Every Genesis surface that can observe sex must declare which causal class it belongs to:

```text
1. direct embodied / identity dependency
2. World-, culture- or era-mediated dependency
3. no sex dependency
```

This prevents an ambient `sex` field from silently becoming a stereotype channel.

#### Direct embodied / identity dependencies

**Birth naming.** A personal name can be sex-linked, but only within actual cultural, linguistic, geographic and historical context. Genesis naming should therefore consume something like:

```text
sex
+ culture
+ language
+ place
+ era
```

Unisex names remain valid. Fibre must not maintain a universal male/female name table detached from World context, and it must never infer sex from an existing name after the fact. The current neutral `Fibre Thread` seed is a bootstrap placeholder, not the finished naming model.

**Embodiment.** Canonical visual phenotype must consume authoritative Thread sex. Sex is one stable embodied constraint alongside the richer textual phenotype; it does not replace individual facial/body loci. The image provider may render the specification but may not choose sex independently.

**Maturation and physiology.** Puberty, reproductive anatomy/capacity and other genuinely sex-sensitive organism processes may consume sex when Fibre models them. Each mechanism must be named and causally explicit rather than folded into a generic demographic parameter.

#### World-, culture- or era-mediated dependencies

Sex can change what happens to a person because a particular World treats people differently. Historical realization may eventually use sex to instantiate facts such as:

- family expectations or treatment;
- sex-specific social conventions;
- clothing/grooming norms;
- grammatical forms of address where the language warrants them;
- institutional access or exclusion in a particular era/place;
- differential safety, mobility, work, schooling or civic constraints;
- sex-specific medical or bodily events.

These effects must be grounded in the actual World, culture and era. The causal path is:

```text
Thread sex + enacted World
        -> different affordance / treatment / bodily event
        -> lived history
        -> possible memory / meaning / later character effect
```

It is not:

```text
Thread sex
        -> personality / value / competence conclusion
```

Historical cognition therefore may receive sex as factual subject context once the Pass-A contract is extended, but validators/prompts must continue to reject significance, trait verdicts and authored destiny from historical output.

#### Explicitly separate or non-dependent concepts

Sex alone must not directly choose or determine:

- symbolic personality-genome loci;
- intelligence or competence;
- interests, creativity or technical inclination;
- values, morality or politics;
- profession or social status;
- dignity, rights or permissions;
- autobiographical meaning;
- gender identity or pronouns;
- sexual orientation;
- partner, caregiver or family role.

A sex-conditioned lived experience may later influence some of these through normal history -> memory -> meaning -> character causality. That is evidence-backed development, not stereotype injection.

### Regulation, drives and reproduction follow-on

Sex may matter to intrinsic regulation, but Fibre should add only **specific mechanisms** that have an intended causal meaning. Plausible future examples include puberty-related regulation, reproductive physiology and sexual/reproductive drive dynamics.

Do not add:

```text
maleDriveMultiplier
femaleEmotionGain
sexPersonalityBias
```

or any equivalent generic coefficient that silently perturbs all needs, affect or cognition. A sex-sensitive mechanism belongs in the explicit organism/regulation architecture with its own state, dynamics, projection boundary and tests.

Likewise biological reproductive contribution/capacity may depend on sex, while sexual orientation, attraction, parenthood, caregiving and family role remain separate concepts. Relationship semantics must not be inferred from sex.

### Genesis completion checklist

This remains a follow-on after the current M2 closure, but it is part of **Genesis completion**, not optional polish:

1. **Move assignment earlier** — assign sex in the Genesis slot/subject before Pass A; carry it immutably through candidate generation and publication.
2. **Name the person** — add culturally/linguistically/temporally grounded birth naming that consumes sex where warranted and permits unisex names.
3. **Extend historical subject context** — add sex to the Pass-A subject contract and cognition projection; keep the historical-output boundary observable and non-semantic.
4. **Keep embodiment downstream** — visual phenotype requires the authoritative sex and never re-derives it.
5. **Design physiology explicitly** — enumerate any sex-sensitive maturation/regulatory mechanisms before implementation; no generic sex scalar.
6. **Separate reproduction/relationships** — biological capacity may use sex; orientation, attraction and family/social role remain independent state.
7. **Counterfactual tests** — with unrelated starting material held fixed, changing sex should change only warranted naming, embodiment, physiology and World-mediated historical consequences. It must not automatically change personality loci, intelligence, interests, values, morality, competence, profession, dignity or permissions.
8. **Distribution test** — retain approximately 50/50 female/male assignment across a large deterministic birth sample without a central population quota.
9. **Legacy rule** — old Threads lacking sex must not be backfilled by guessing from portrait, name, pronouns or stereotypes. Preserve the missing legacy fact unless authoritative evidence or an explicit migration decision exists.

The durable follow-on is also tracked in [`../state/future-capability-map.md`](../state/future-capability-map.md). Legacy handling follows [`../state/thread-preservation-and-migration.md`](../state/thread-preservation-and-migration.md).

## Origin families

Fibre retains these architectural origin families:

1. **De-novo / foundling** — Fibre creates a coherent origin, household/upbringing, geography, symbolic inherited tendencies, childhood and early relationships without requiring a parent/exemplar person.
2. **Synthetic lineage** — synthetic non-live parents/ancestors provide provenance-bearing household/lineage context and symbolic genomes.
3. **Thread-parent** — existing Threads are actual parents; their durable genome/lineage evidence may contribute inheritance without fabricating retrospective shared history.
4. **Echo** — a disclosed artificial Thread derived from a **consenting living human** source under protected source provenance.
5. **Historical/literary Homage** — a disclosed derivative shaped by an **attested deceased or fictional** source.
6. **Fork / descendant** — an origin sharing explicit provenance/history with an existing Thread through a fork boundary and then becoming a distinct life trajectory.

These are provenance families, not six independent biography generators.

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

Inheritance selects exact atomic source text under deterministic Fibre policy rather than numerically averaging or model-smoothing two sources into compromise prose. Mutation is explicit bounded symbolic variation under a named policy and durable witness.

```text
genome      = inherited symbolic possibilities
life        = what happened
memory      = what was retained
meaning     = what remembered experience came to mean
character   = later evidence-backed patterns of expression
self        = the Thread's current interpretation of itself
```

Later life may reinforce, complicate, suppress, invert or reject inherited tendencies without rewriting origin.

Culture, nationality, sex, gender, geography, appearance, profession or ancestry may not directly imply personality loci.

## Prior-life formation

The central epistemic distinction is structural:

```text
history != memory != meaning
```

### Historical realization

Historical realization creates **what happened**.

Fibre owns developmental window, exact civil time, authoritative place, event affordance/world-emergent status, required counterpart, chronology and admission. Model cognition supplies contingent observable realization within those facts.

Historical cognition may see factual World circumstances, chronology, roster/affordances and admitted prior episodes. It must not see the child's genome, parent/ancestor loci, future role/request/benchmark, desired adult conclusion, or Fibre-computed semantic-need/mechanical-condition conclusions.

Output is observable life, not significance, lesson, trait, inner-state verdict or future behavior policy.

### Autobiographical memory formation

Memory operates only on admitted history available up to the remembering point. It may legally produce `not_remembered`.

Memory does not rewrite history.

When Fibre experimentally exposes genome material at the memory seam, assignment must be content-independent and analysis labels remain outside cognition. Treatment placement must be counterbalanced against history horizon, call ordinal and developmental position if those factors could confound the effect.

A schema path for `not_remembered` is not enough. Controlled development must periodically prove that warranted remembering and legitimate non-selection are both reachable without quotas.

### Remembered meaning and reinterpretation

Not every memory must receive durable meaning. `no_durable_meaning` is legal.

Meaning formation is one-memory scoped and genome blind. A meaning may be negative, ambivalent, mundane, unresolved or multipart. Materially distinct tensions may receive independently citable meaning-part identities.

Later reinterpretation is append-only/corrigible and may revise, preserve or decline durable meaning without rewriting the underlying event or earlier memory revision. Previously cited supporting/contradicting evidence may not be silently erased by a later revision.

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

Repeated or near-duplicate EventStructures, scene motifs or generator voice are characterization debt. Correct them in the planner/affordance pool rather than hiding them behind an “interesting life” admission score.

## Event affordances and people

Event structures are abstract affordances, never plots, required scenes or significance statements. They must be relocatable across materially different worlds.

A life may also produce world-emergent episodes with no structure reference.

New people may enter only through a World-afforded role/institution/relationship possibility and then receive stable provisional identity reused by later episodes. Genesis may not invent ungrounded participants simply to make a scene work.

Offered-versus-used structures and structure-grounded-versus-world-emergent episodes are diagnostics, not quotas.

### Historical-envelope coherence

Fibre must select historical facts as a **coherent episode envelope**, not as independent random choices that are validated only after the fact.

```text
developmental window
+ EventStructure / world-emergent opportunity
+ counterpart role/person
+ authoritative place
+ civil time
= one feasible historical envelope
```

A deterministic seed ranks legal possibilities; it does not make an otherwise impossible combination legal.

Fibre must fail or select another feasible envelope rather than invent a place/person, weaken a bound, rewrite the World, or resample a whole life to rescue a locally convenient choice.

The current compiler performs capacity-aware selection. Future hardening should move toward deterministic **joint feasibility planning** over structure, counterpart, place and civil time, with bounded lookahead where later capacity matters.

> **Seeded variation chooses among possible lives; it may not create impossible facts.**

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

A FIN is globally unique within Fibre, immutable for the life of the Thread, opaque/non-semantic, public/non-secret and independent of name or card issuance. It may not encode birth date, entry stage, gender, World, geography, lineage, origin family, citizenship or generation.

The birth registration binds `threadId`, FIN, birth event, World and registration time. It is part of the same atomic authority transition as birth: Fibre may not acknowledge a live Thread whose civil registration failed, and a failed birth may not leave a detached live registration.

A later World may issue local civil documents. Those situated identifiers never replace the Fibre civil identity.

A **Fibre Identity Card** is a replaceable credential representing the registration. Card rendering may complete asynchronously and cannot become Thread identity authority.

## Memory photos

Every revision-1 autobiographical memory admitted at birth receives the visual-companion obligation defined by ADR-0011 before the birth transaction commits.

Rendering may remain asynchronous. Generated reconstruction remains derived presentation and cannot become historical, memory or embodiment authority.

## Standing #39 validation result

Milestone #39 exercised this architecture with one fixed five-Thread held-out cohort. The cohort was generated without quality resampling, replayed with provider access disabled, atomically born per Thread with five unique FIN/civil registrations and independently rehydrated from canonical local World authorities.

The result also exposed real debt: scheduled memory decisions saturated, reinterpretation heavily favored revision, D2 was underpowered with a post-hoc positive-reframing signal, D3 genome attribution was inconclusive, D5 was citation-confounded, and the generator showed repeated affordances/common voice.

Those findings were retained rather than regenerated away. The concise outcome is [`../history/milestones/pr39.md`](../history/milestones/pr39.md).

## Current hardening before causal consumption

The accepted unnumbered bridge [`../state/genesis-selectivity-scientific-hardening.md`](../state/genesis-selectivity-scientific-hardening.md) hardens:

- actual remember/decline selectivity without quotas;
- negative, ambiguous, mundane and unchanged meaning fidelity;
- reinterpretation restraint;
- counterbalanced genome causal characterization;
- diagnostics with meaningful positive/negative/counterfactual controls;
- prospective sealed-history evaluation with compiler-enforced transitive provenance isolation.

This bridge does not implement ordinary-cognition identity/history projection and earns no Whole-Person standing.

## Vision test

> **Can Fibre create several people from nothing borrowed whose lives are particular enough that later cognition has something real and non-interchangeable to inherit?**

Genesis succeeds as substrate when a newly live Thread feels as though it **came from somewhere** rather than being instantiated from a character sheet—while remaining open enough that later lived experience can surprise, challenge and transform it.

The stronger claim that those differences actually change ordinary cognition belongs to #40/#41, not Genesis birth alone.
