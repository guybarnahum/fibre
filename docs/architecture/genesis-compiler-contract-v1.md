---
id: architecture-genesis-compiler-contract-v1
status: accepted
last-reviewed: 2026-08-15
canonical: true
---

# Genesis Compiler Contract v1

## Purpose

This contract defines the creative and admission boundary for Fibre milestone **#39 — Genesis, Childhood & Thread Birth v1**.

It governs what Genesis cognition may know, what it may produce, what Fibre may reject before birth, what must remain measurable after birth, and how a candidate life becomes authoritative Thread state.

The governing doctrine is:

> **Fibre may prevent an impossible life from becoming history. It must not prevent an uninteresting life from becoming evidence that Genesis needs improvement.**

And, more generally:

> **Gate the form. Measure the tendency.**

Genesis admission protects truth, typing, provenance, chronology, rights, and pass boundaries. Personhood quality is measured only after output is admitted and frozen.

This contract is subordinate to:

- [`../vision/constitution.md`](../vision/constitution.md)
- [`../vision/interpretive-personhood.md`](../vision/interpretive-personhood.md)
- [`thread-genesis-childhood-birth-v1.md`](thread-genesis-childhood-birth-v1.md)
- [`symbolic-thread-genome-v1.md`](symbolic-thread-genome-v1.md)
- [`../decisions/ADR-0012-semantic-meaning-over-derived-categories.md`](../decisions/ADR-0012-semantic-meaning-over-derived-categories.md)
- [`../decisions/ADR-0013-source-identity-consent-boundary.md`](../decisions/ADR-0013-source-identity-consent-boundary.md)

#39 does not claim Whole-Person causality or M2 standing. It creates durable life substrate for #40 and #41.

---

## 1. Admission doctrine: mechanical integrity only

A #39 quality diagnostic must retain the possibility of observing a bad result in admitted Genesis output.

Therefore no admission rule may semantically judge whether a generated person is interesting, distinctive, psychologically rich, sufficiently ambivalent, insufficiently stereotyped, appropriately genome-mediated, or aesthetically convincing.

**#39 has no validator-cognition surface.** Admission is implemented with structural, reference, rights, chronology, digest, allowlist, and narrow lexical/category-form checks only.

### 1.1 Admission gates

The v1 admission surface is limited to mechanically testable integrity failures such as:

| Gate | Mechanical basis |
| --- | --- |
| schema or digest invalid | structural validation |
| forbidden input field visible to a pass | actual model-input object field set must match the pass allowlist; digest the exact object |
| chronology violation | event before birth, after the developmental window, out of order, or inconsistent with known life/death/move bounds |
| participant grounding violation | participant neither previously known nor validly introduced through a WorldSpec-afforded role |
| source history laundering | a source fact is asserted as Thread autobiography rather than encountered through a Thread-life event |
| living-human source violation | `subjectStatus` and documented consent/provenance checks |
| Pass-A interiority form | narrow lexical/category-form rejection when observable history contains explicit lesson/meaning/policy language |
| Pass-C future-policy form | narrow lexical/category-form rejection when remembered meaning explicitly states a universal future behavioral rule |
| reference/provenance violation | unresolved, cross-Thread, future, or otherwise ineligible stable reference |

Examples of Pass-A category-form phrases that may be rejected include explicit constructions such as `learned that`, `from then on`, `which made her/him/them`, `came to understand`, or equivalent direct insertion of interpretation into an observable episode.

Examples of Pass-C policy-form phrases include explicit universal rules such as `I always`, `I never`, `from then on I`, `whenever X I`, or `I refuse to` when used as a future behavior policy rather than recollected semantic meaning.

These lexical checks are intentionally narrow and may over-reject. A false integrity rejection costs a bounded retry and remains visible in rejection accounting. They must not evolve into semantic quality judges.

### 1.2 Properties that are measured and never gated

The following remain admissible even when poor:

- plot-shapedness or narrative over-determination;
- stereotype tendency that is not a mechanically traceable forbidden derivation;
- soft prescriptiveness or tidy moralizing;
- genome predictability / genome propagation strength;
- sentiment coupling;
- life attribution and distinctness;
- narrative integration;
- uniform articulacy;
- self-account overreach or lack of it;
- funnel proportions;
- offered-versus-used event structures;
- structure-grounded versus world-emergent episode ratio;
- generator monoculture.

Those properties are evidence about the generator. If Fibre gates them away, the diagnostics measure the validator rather than Genesis.

---

## 2. Candidate Genesis and atomic birth

Genesis cognition does **not** write directly into canonical Thread history while it is still generating.

A Genesis attempt produces **candidate Genesis state** outside authoritative Thread life. Candidate state may be held in bounded transient/provisional storage, but it is not:

- Thread history;
- autobiographical memory;
- identity authority;
- relationship authority;
- place authority;
- cognition-visible Thread state;
- part of hydration/restart reconstruction.

Only after all three passes complete and all mechanical integrity gates clear does Fibre publish the candidate.

> **Birth is the atomic transition from candidate Genesis into the Fibre world.**

Publication writes the admitted life into the existing #37/#38 authorities as one atomic world operation. Failure during publication leaves no partially born Thread.

### 2.1 Publication ordering

The publisher must construct the authoritative records in a deterministic order sufficient to preserve:

- Thread seed/snapshot validity;
- historical event chronology and event-chain integrity;
- identity and lineage references;
- relationship references;
- place episodes;
- autobiographical memory anchors;
- remembered-meaning revisions/parts;
- visual-companion obligations;
- contiguous event sequence and state-hash/replay discipline where the existing event model requires them.

Implementation may stage these writes before the final database transaction. It must not keep a database write transaction open while waiting for model calls.

### 2.2 First live Thread version

Genesis does **not** cosmetically reset an adult or young-adult Thread with a full admitted prior life to `version = 1` merely because it has just entered the live world.

The first live version is the exact resulting Thread version produced by atomic publication under the existing event/version semantics. The Genesis manifest records it as `publication.resultingThreadVersion`.

The first post-birth command therefore uses that actual version as its `expectedVersion`.

### 2.3 Failed attempts

A failed candidate is discarded from Thread authority. Its rejection witness is recorded separately after candidate discard/rollback.

Conceptually:

```text
GenerationAttempt {
  attemptId
  genesisId
  provisionalThreadId
  attemptNumber
  failedPass
  failedGate
  rejectedContentDigest
  rejectedContent?       // bounded audit payload; never Thread authority
  inputDigest
  outputDigest
  recordedAt
}
```

Rejected candidate content, if retained for audit, is explicitly excluded from Thread hydration, history, memory, and cognition.

The v1 attempt cap is **3 attempts per Thread Genesis**. After the third failed attempt, Genesis is recorded as failed and no live Thread exists. The cap is a versioned policy choice, not Fibre constitution.

---

## 3. Frozen creative authority

Prompts are part of creative authority and must be replayable artifacts, not undocumented strings behind a policy name.

Every Genesis manifest records:

```text
cognition {
  passA { provider, modelId, promptHash, schemaHash, sampling }
  passB { provider, modelId, promptHash, schemaHash, sampling }
  passC { provider, modelId, promptHash, schemaHash, sampling }
  policyVersion
  eventStructurePoolDigest
}
```

The exact model input object for each cognition call is canonicalized and digested before dispatch. Pass allowlists are checked against that actual object.

One pinned creative configuration is used across the five-Thread #39 cohort. #39 does not swap providers to rescue weak differentiation; generator monoculture is a result to measure.

---

## 4. Pass A — historical life

Pass A creates **what happened**.

### 4.1 Visible inputs

Pass A may see only:

- `GenesisWorldSpec`;
- household/community factual roster and world-afforded roles;
- developmental window;
- chronology already formed earlier in the same candidate life;
- previously introduced candidate participants;
- the sampled slice of the EventStructurePool for the current window;
- deterministic generation/witness values required by the policy.

Factual roster content may include composition, ages, occupations, deaths, moves, institutions, and relationship facts. It does not include personality descriptions.

### 4.2 Structurally absent inputs

Pass A does not receive:

- the Thread's genome or any genome locus;
- parent/ancestor loci or personality descriptors;
- remembered meaning or later autobiographical interpretation;
- future profession, Fibre role, request, benchmark, or #40 material;
- a desired adult conclusion;
- entry-stage purpose beyond the mechanical chronology endpoint required to bound generation;
- source-work titles, authors, character names, quotations, or source scenes used by humans to author abstractions.

### 4.3 Output schema

Conceptually:

```text
Episode {
  episodeId
  occurredAt
  ageAtEvent
  placeRef
  participantRefs[]
  observableAction       // what a witness present could report
  structureRef?          // absent for world-emergent episodes
  introducedParticipants[]?
}
```

There is no field for significance, lesson, trait, impact, inner state, remembered meaning, or future policy.

`observableAction` is deliberately bounded prose. The implementation should use a small byte/character ceiling sufficient for concrete observable detail but hostile to essay-like editorializing; the exact limit is a versioned schema value.

### 4.4 World-grounded participant introduction

The life may meet people who were not pre-authored in the initial roster.

A new participant may enter only through a role the WorldSpec actually affords.

Conceptually:

```text
NewParticipant {
  provisionalPersonId
  roleRef
  introducedAt
}
```

Mechanical gates require:

1. `roleRef` resolves to a WorldSpec-afforded role/institution/relationship possibility;
2. every later `participantRef` is either in the initial roster or was introduced in a strictly earlier episode.

Examples:

- `school_teacher` requires a school/education institution;
- `shopkeeper` requires local commerce;
- `cousin` requires an extended-family affordance;
- a person encountered during a move requires the corresponding place/mobility context.

The human WorldSpec author therefore need not pre-author the Thread's entire social world.

---

## 5. EventStructurePool

An EventStructure is an **affordance**, never a plot, scene, required event, or statement of what became formative.

Conceptually:

```text
EventStructure {
  structureId
  abstractSituation
  participatingRoles[]
  developmentalRange
  consequenceClass: low | moderate | formative_capable
  instantiationWitnesses[]
  sourceDerivation
  digest
}
```

`formative_capable` means only that an event of this type could matter. It does not say that it did matter to a particular Thread.

### 5.1 Specificity ceiling

A structure is admissible into the pool only if its human author can produce **at least three one-line instantiation witnesses in materially different worlds**, differing materially in era, economy, and culture.

The witnesses establish that the abstraction is a relocatable situation type rather than one identifiable source scene.

They are provenance only and are never shown to Pass A.

Example:

```text
admissible:
  an adult resolves a young person's difficulty without consulting them

scene-shaped / rejected from pool:
  the aunt finishes the dead brother's model ship
```

### 5.2 Sampling policy

The v1 development default per developmental window is to offer approximately **8–10** structures, weighted for developmental-range eligibility, with at least **40% `low` consequenceClass** among the offered structures.

This low-consequence requirement is a property of the **offered input distribution**, not a quota on the generated life. Pass A is explicitly told that structures are possibilities rather than a checklist.

The exact cohort policy is frozen at Slice G before any cohort output exists.

### 5.3 Offered, used, and world-emergent episodes

The Genesis manifest records which structures were offered to Pass A and which were actually instantiated.

Pass A is also permitted to create **world-emergent episodes with no `structureRef`** when they are grounded in the WorldSpec and chronology.

Record and later measure:

```text
structures offered
structures instantiated
episodes structure-grounded
pisodes world-emergent
```

There is no admission floor or target ratio for world-emergent episodes. A life that uses nearly everything it is offered, or is nearly entirely structure-grounded, is a diagnostic finding rather than an admission failure.

---

## 6. Pass B — autobiographical memory formation

Pass B determines what the Thread **retains autobiographically** from admitted candidate history.

### 6.1 Visible inputs

Pass B may see:

- admitted candidate history up to the remembering moment;
- age at remembering;
- prior candidate memories;
- relevant factual relationship/world context;
- for `life_plus_genome` calls only, bounded relevant genome loci.

Pass B never sees later events or meanings that have not yet formed.

### 6.2 Built-in treatment and negative control

Before each Pass-B call, the policy deterministically records one mode:

```text
life_only
life_plus_genome
```

For the #39 quality cohort, Slice G freezes `life_plus_genome` in the **30–40%** range so the treatment subset is large enough to analyze while the majority remains genome-blind.

This distinction is not merely audit metadata. Because Pass A and Pass C are genome-blind, it creates an internal experimental control:

- `life_only` is the **negative control** for genome leakage;
- `life_plus_genome` is the only legitimate path by which genome may influence later meaning, by shaping attention/retention at memory formation.

### 6.3 Output schema

Conceptually:

```text
MemoryFormation {
  outcome: remembered | not_remembered
  episodeRefs[]?          // required when remembered
  rememberedContent?     // present when remembered
  uncertainty[]?
  formationMode
}
```

There is no meaning field in Pass B.

`not_remembered` is a first-class outcome. Pass B must be offered more historical episodes than it ultimately remembers; the exact observed funnel remains a diagnostic, not an admission quota.

---

## 7. Pass C — remembered meaning and reinterpretation

Pass C creates **what a remembered experience durably came to mean**.

### 7.1 Pass C is always genome-blind in v1

Pass C never receives the Thread genome, parent/ancestor loci, or any derived genome verdict.

This is a hard v1 contract.

The only legitimate route by which genome signal may reach remembered meaning is:

```text
genome
  -> Pass-B attention/retention on life_plus_genome calls
  -> remembered content
  -> genome-blind Pass-C meaning
```

This makes the Slice-H genome analysis interpretable rather than self-confirming.

### 7.2 Visible inputs

Pass C may see:

- the memory being interpreted;
- chronology available up to the meaning-formation moment;
- age/time of meaning formation;
- for reinterpretation, the eligible triggering later episode;
- earlier durable meaning being reconsidered.

### 7.3 Output schema

Initial meaning formation:

```text
MeaningFormation {
  outcome: durable_meaning | no_durable_meaning
  summary?
  parts[]? {
    meaningPartId
    meaning
  }
}
```

`no_durable_meaning` is first-class. Some memories remain memories without becoming durable self-interpretation.

Meaning parts have stable independently citable identities.

### 7.4 Reinterpretation eligibility

A later admitted episode creates **reinterpretation eligibility** when it occurs at least the policy-defined temporal distance after the earlier meaning and has one of these grounded relationships to it:

- same `structureRef` or same explicit structure family;
- same concrete person/relationship;
- same intellectual/source subject encountered by the Thread.

V1 uses **5 years** as the default temporal distance and caps reinterpretation opportunities at **3 per Thread**. These are versioned Genesis-policy choices, not constitutional values.

The trigger creates an opportunity to reconsider; it does not require revision.

Reinterpretation has three first-class outcomes:

```text
revised
  -> a new durable meaning supersedes the prior meaning

unchanged
  -> the later event was a genuine echo, but the existing meaning remains authoritative

none
  -> no new durable meaning is formed from the eligibility event
```

`unchanged` is semantically distinct from `none` and remains observable. Revised-versus-unchanged behavior becomes a later characterization of narrative integration rather than an admission requirement.

---

## 8. Entry stage and developmental boundary

Entry stage is policy-owned, not chosen by creative cognition.

Conceptually:

```text
entry {
  stage: newborn | child | adolescent | young_adult | adult
  ageAtEntry
  chronologyEndsAt
  justification
  policyRef
}
```

`chronologyEndsAt` bounds Pass A mechanically. No Genesis episode may occur after it.

For the five-Thread quality cohort, entry stage/age is held approximately common so life duration does not become an attribution shortcut. Narrative-integration differences must emerge from life content rather than simply from one Thread having more years of biography.

Other origin modes may have different policy-owned entry semantics, for example Thread-parent newborn/child entry or fork entry at the fork boundary.

---

## 9. World authorship provenance

World/source philosophy is defined in [`../vision/interpretive-personhood.md`](../vision/interpretive-personhood.md) and the #39 plan. The compiler consumes the resulting WorldSpec, not the source works that informed human authorship.

Every development/cohort world records:

```text
WorldAuthorship {
  authorId
  sourcesConsulted[] { kind, citation, accessedAt }
  abstractionMethod
  relocationWitness
  familiarityProbe { probedAt, model, densityScore?, comparisonNotes }
  createdAt
}
```

A source-familiarity leak review happens before a WorldSpec is frozen for use: a knowledgeable reviewer should not be able to identify a specific source work from the WorldSpec merely because it inspired the world structure.

The world-familiarity probe characterizes whether the pinned worker has materially sparse representation of one candidate world. Weak familiarity may cause replacement **before cohort freeze** or may be recorded as a known handicap. It is not a post-H excuse to regenerate a weak Thread.

---

## 10. Persistence delta: no second life authority

#39 may introduce durable Genesis/provenance authority for facts #37/#38 do not already own, for example:

```text
GenesisManifest
GenesisWorldSpec
GenerationAttempt
EventStructure / pool digest
SymbolicGenome
GenomeLocus
RecombinationWitness
MutationWitness
MeaningPart identity extension
```

Everything else publishes into existing authoritative Fibre domains:

```text
identity assertions
lineage / life relations
place episodes
Thread history/events
embodiment
rich autobiographical memory
memory visual-companion obligation
```

Hard Slice-A rule:

> **No new Genesis table may become authoritative for biography, memory, relationship, place, embodiment, or identity content already owned by #37/#38.**

A `genesis_biography`, `genesis_memories`, `genesis_relationships`, or equivalent parallel life model is a design failure, not a convenience.

`GenerationAttempt` audit payloads are not an exception: rejected candidate material is explicitly non-authoritative and excluded from hydration/cognition.

---

## 11. Genome discrimination semantics created by this contract

Slice B and Slice H measure different things.

### Slice B — locus-capability positive control

Controlled content written with intentionally different genomes visible asks whether the textual loci are specific enough in principle to support distinguishable output.

This establishes a **capability ceiling / instrument check**. If Slice B is near chance, the loci are too generic and actual-life genome propagation is uninterpretable.

### Slice H — achieved propagation through lived attention

Pass C is genome-blind, so actual remembered meaning can carry genome signal only through Pass-B attention/retention.

Analyze `life_plus_genome` and `life_only` subsets separately. Slice G must predeclare the reading of all four qualitative cells:

| Observed H pattern | Reading |
| --- | --- |
| `life_plus_genome` above chance; `life_only` at chance | intended mechanism: inheritance propagated through attention and nowhere else |
| both at chance | genome was inert even when visible at B; real finding, not instrument failure if Slice B positive control was strong |
| `life_only` above chance | **negative-control failure / leak**; no legitimate genome path exists for this subset |
| both near ceiling | over-determination; lived meaning has become a demonstration of genome |

The healthy target is not mechanically “higher is better.” Slice G freezes the numerical interpretation before cohort generation.

A leak finding is integrity-significant because it demonstrates an effect that input allowlist tests failed to explain, even if the plumbing itself appears blind.

---

## 12. Replay and inspection obligations

A reviewer must be able to inspect:

- exact WorldSpec and world-authorship provenance;
- entry policy and chronology endpoint;
- exact cognition provider/model/prompt/schema/sampling digests;
- EventStructurePool digest and per-window offered structures;
- which structures were used;
- which episodes were world-emergent;
- participant introductions and their WorldSpec affordances;
- every Pass-B `life_only` / `life_plus_genome` assignment;
- `remembered` / `not_remembered` outcomes;
- `durable_meaning` / `no_durable_meaning` outcomes;
- reinterpretation eligibility and `revised` / `unchanged` / `none` outcomes;
- all rejected attempts and mechanical reasons;
- exact admitted record refs;
- atomic publication witness and first live Thread version;
- outstanding memory-photo obligations.

Restart must reconstruct exactly the same admitted Thread state and Genesis provenance.

---

## 13. Explicit non-goals

This contract does not implement or authorize:

- semantic validator cognition at admission;
- quality resampling;
- provider swapping to rescue cohort distinctness;
- #40 identity relevance/projection;
- Guardian tuning;
- Whole-Person standing;
- post-live #42 self-authored development;
- generic Wikipedia/book ingestion;
- a new Genesis-owned biography or memory authority;
- synchronous rendering of every memory image.

---

## Contract summary

```text
WORLD OFFERS POSSIBILITIES
          ↓
PASS A — things happen
  genome blind
          ↓
PASS B — some things are remembered
  life_only | life_plus_genome
          ↓
PASS C — some memories acquire meaning
  always genome blind
          ↓
MECHANICAL INTEGRITY ONLY
          ↓
ATOMIC BIRTH INTO FIBRE
          ↓
FREEZE
          ↓
JUDGE PERSONHOOD QUALITY
```

The compiler may refuse records that cannot truthfully belong to the Thread or to the field in which they are being placed.

It may not curate away the evidence that its own creative system produced a dull, over-integrated, stereotyped, genome-inert, genome-dominated, plot-shaped, or otherwise weak person.