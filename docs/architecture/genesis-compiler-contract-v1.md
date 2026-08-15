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

> **Fibre may prevent an impossible life from becoming history. It must not prevent an uninteresting life from becoming evidence that Genesis needs improvement.**

And:

> **Gate the form. Measure the tendency.**

Genesis admission protects truth, typing, provenance, chronology, rights, and pass boundaries. Personhood quality is measured only after output is admitted and frozen.

This contract is subordinate to the Fibre Constitution, [`../vision/interpretive-personhood.md`](../vision/interpretive-personhood.md), [`thread-genesis-childhood-birth-v1.md`](thread-genesis-childhood-birth-v1.md), [`symbolic-thread-genome-v1.md`](symbolic-thread-genome-v1.md), ADR-0012, and ADR-0013.

#39 does not claim Whole-Person causality or M2 standing. It creates durable life substrate for #40 and #41.

---

## 1. Admission doctrine: mechanical integrity only

A #39 quality diagnostic must retain the possibility of observing bad quality in admitted Genesis output.

Therefore **#39 has no validator-cognition surface**. Admission uses only structural, reference, rights, chronology, digest, allowlist, and narrow lexical/category-form checks.

### Admission gates

| Gate | Mechanical basis |
| --- | --- |
| schema/digest invalid | structural validation |
| forbidden pass input | actual model-input object must match the frozen field allowlist; digest exact input |
| chronology invalid | outside developmental window, impossible ordering, life/death/move conflict |
| participant ungrounded | neither pre-existing nor validly introduced through a WorldSpec affordance |
| source history laundering | source fact asserted as Thread autobiography rather than a Thread encounter |
| living-human rights violation | explicit `subjectStatus` + consent/provenance check |
| Pass-A interiority form | narrow lexical/category check for explicit lesson/meaning/policy text in observable history |
| Pass-C future-policy form | narrow lexical/category check for explicit universal behavioral policy in meaning |
| reference/provenance invalid | unresolved, cross-Thread, future, or otherwise ineligible ref |

Examples of Pass-A category-form phrases include explicit constructions such as `learned that`, `from then on`, `which made her/him/them`, or `came to understand` when they insert interpretation into an observable episode.

Examples of Pass-C policy-form phrases include `I always`, `I never`, `from then on I`, `whenever X I`, or `I refuse to` when used as a universal future behavior rule.

These lexical checks may over-reject. That cost is bounded and visible. They must not evolve into semantic quality judges.

### Measured, never gated

Never reject a candidate merely for:

- plot-shapedness;
- stereotype tendency not mechanically traceable to a forbidden derivation;
- soft prescriptiveness / tidy moralizing;
- genome propagation strength;
- sentiment coupling;
- weak attribution/distinctness;
- excessive or insufficient narrative integration;
- uniform articulacy;
- perfect self-account coherence;
- funnel proportions;
- offered-versus-used structure ratio;
- structure-grounded versus world-emergent ratio;
- generator monoculture.

Those are generator findings. Gating them would make the diagnostics measure the gate rather than Genesis.

---

## 2. Candidate Genesis and atomic birth

Genesis cognition does **not** write directly into canonical Thread life while generation is in progress.

A Genesis attempt produces **candidate Genesis state** outside authoritative Thread state. Candidate state is not history, memory, identity, relationship, place, or cognition authority and is not returned by normal hydration/restart.

Only after all passes complete and all mechanical gates clear does Fibre publish the candidate.

> **Birth is the atomic transition from candidate Genesis into the Fibre world.**

Publication writes the admitted life into the existing #37/#38 authorities as one atomic world operation. A failure during publication leaves no partially born Thread.

Implementation may stage the complete publication bundle before the final database transaction. It must **not** hold a database write transaction open while model calls run.

### Publication must preserve

- Thread seed/snapshot validity;
- deterministic historical chronology;
- identity/lineage/relationship/place refs;
- autobiographical-memory anchors;
- remembered-meaning revisions and stable meaning parts;
- visual-companion obligations;
- event sequence, state-hash, and replay discipline wherever the current event model requires them.

### First live version

Genesis does not cosmetically reset a Thread with an admitted prior life to `version = 1`.

The first live version is the exact resulting version produced by atomic publication under current Fibre event/version semantics. Record it as:

```text
publication.resultingThreadVersion
```

The first post-birth command uses that actual value as `expectedVersion`.

### Failed attempts

Failed candidate state is discarded from Thread authority. Its rejection witness is recorded separately and may retain a bounded rejected payload for audit, but that payload is excluded from hydration, history, memory, and cognition.

V1 caps Genesis at **3 candidate attempts per Thread**. After the third failure, Genesis is recorded failed and no live Thread exists. This is a versioned #39 policy, not constitution.

---

## 3. Frozen creative authority

Prompts are part of the creative authority.

Every manifest records:

```text
cognition {
  passA { provider, modelId, promptHash, schemaHash, sampling }
  passB { provider, modelId, promptHash, schemaHash, sampling }
  passC { provider, modelId, promptHash, schemaHash, sampling }
  policyVersion
  eventStructurePoolDigest
}
```

Before dispatch, canonicalize and digest the exact model input object. Check its field set against the pass allowlist.

One pinned creative configuration is used across the final five-Thread cohort. #39 does not swap providers to rescue weak differentiation; generator monoculture is a result to measure.

---

## 4. Pass A — historical life

Pass A creates **what happened**.

### Visible

- `GenesisWorldSpec`;
- factual household/community roster;
- WorldSpec-afforded roles/institutions/relationship possibilities;
- developmental window and chronology endpoint;
- already-admitted candidate episodes;
- previously introduced candidate participants;
- sampled EventStructurePool affordances;
- deterministic witness values required by policy.

Factual roster content may include ages, occupations, deaths, moves, institutions, and relationship facts. It does not include personality descriptions.

### Structurally absent

- Thread genome/loci;
- parent/ancestor loci or personality descriptors;
- remembered meanings;
- future profession/Fibre role/request/benchmark/#40 material;
- desired adult conclusions;
- source-work titles, authors, characters, quotations, or source scenes used by human authors.

### Output

```text
Episode {
  episodeId
  occurredAt
  ageAtEvent
  placeRef
  participantRefs[]
  observableAction
  structureRef?
  introducedParticipants[]?
}
```

No field exists for significance, lesson, trait, impact, inner state, remembered meaning, or future policy.

`observableAction` is bounded prose: enough for concrete witnessable detail, not an interpretive essay. The exact byte/character ceiling is a versioned schema value.

### Participant introduction

A life may meet people not pre-authored in the initial roster.

A new participant may enter only through a role the WorldSpec actually affords.

```text
NewParticipant {
  provisionalPersonId
  roleRef
  introducedAt
}
```

Mechanical validity requires:

1. the role resolves to a WorldSpec affordance;
2. a participant used in an episode is either in the initial roster, was introduced earlier, **or is explicitly introduced in that same episode** through a valid affordance;
3. after introduction, the same stable provisional ID is reused.

Examples: a `school_teacher` needs schooling; a `shopkeeper` needs commerce; a `cousin` needs an extended-family affordance.

---

## 5. EventStructurePool

An EventStructure is an **affordance**, never a plot, required event, or statement of significance.

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

`formative_capable` means only that such an event could matter.

### Specificity ceiling

A structure enters the pool only if its human author can produce at least **three** one-line instantiations in materially different worlds, differing in era, economy, and culture.

Those witnesses prove relocation/generalization and are **never shown to Pass A**.

```text
admissible:
  an adult resolves a young person's difficulty without consulting them

scene-shaped:
  the aunt finishes the dead brother's model ship
```

### Sampling

Development default per developmental window: approximately **8–10** offered structures, weighted for developmental-range eligibility, with at least **40% `low` consequenceClass** in the offered input distribution.

That 40% constrains what Fibre offers, not what the generated life must use.

Pass A is told the structures are possibilities, not a checklist.

### Offered, used, and world-emergent

Record:

```text
structures offered
structures instantiated
episodes structure-grounded
episodes world-emergent
```

World-emergent episodes have no `structureRef` and are grounded directly in WorldSpec + chronology.

There is **no floor or target** for world-emergent output. A life that is 95% structure-grounded is a quality finding, not an admission failure.

---

## 6. Pass B — autobiographical memory formation

Pass B determines what the Thread **retains autobiographically**.

### Visible

- candidate history available up to the remembering moment;
- age/time of remembering;
- prior candidate memories;
- relevant factual world/relationship context;
- for `life_plus_genome` only, bounded relevant genome loci.

It never sees later events or later meanings.

### Treatment assignment

Before each eligible Pass-B call, the policy records exactly one mode:

```text
life_only
life_plus_genome
```

For the final cohort, Slice G freezes `life_plus_genome` in the **30–40%** range.

Assignment must be **content-independent**: chosen by a frozen deterministic/randomized policy (for example stable hashing/stratification over eligible attempt IDs), not by semantic inspection of which memories look likely to benefit from genome visibility.

Because A and C are genome-blind:

- `life_only` is the negative control;
- `life_plus_genome` is the only legitimate direct genome-visibility path, where inheritance may shape attention/retention.

### Output

```text
MemoryFormation {
  outcome: remembered | not_remembered
  episodeRefs[]?
  rememberedContent?
  uncertainty[]?
  formationMode
}
```

There is no meaning field.

`not_remembered` is a first-class legal outcome. **Admission does not require any minimum amount of forgetting.** If every event becomes remembered, the funnel diagnostic is allowed to expose that failure.

---

## 7. Pass C — remembered meaning and reinterpretation

Pass C creates **what a remembered experience durably came to mean**.

### Always genome-blind in v1

Pass C never receives the Thread genome, parent/ancestor loci, or a derived genome verdict.

The only legitimate direct path for genome signal is:

```text
genome
  -> Pass-B attention/retention on life_plus_genome calls
  -> remembered content
  -> genome-blind Pass-C meaning
```

### Initial meaning output

```text
MeaningFormation {
  outcome: durable_meaning | no_durable_meaning
  summary?
  parts[]? { meaningPartId, meaning }
}
```

`no_durable_meaning` is first-class and never quality-gated away. Meaning parts have stable independent citation identities.

### Reinterpretation eligibility

A later episode may create a reinterpretation opportunity when it occurs at least the policy-defined time after the earlier meaning and shares one of:

- same structure / explicit structure family;
- same concrete person/relationship;
- same intellectual/source subject actually encountered by the Thread.

V1 defaults: **5 years** minimum distance; at most **3 reinterpretation opportunities per Thread**. These are versioned policy values.

The trigger creates eligibility, not mandatory revision.

```text
revised
  new meaning supersedes prior meaning

unchanged
  a genuine later echo occurred, but the prior meaning survived

none
  no new durable meaning formed from the eligible echo
```

`unchanged` is distinct from `none`. Revised/unchanged/none proportions are measured, not gated.

---

## 8. Entry stage and developmental boundary

Entry stage is policy-owned, not chosen by creative cognition.

```text
entry {
  stage: newborn | child | adolescent | young_adult | adult
  ageAtEntry
  chronologyEndsAt
  justification
  policyRef
}
```

`chronologyEndsAt` mechanically bounds Pass A.

For the five-Thread quality cohort, entry age/stage is held approximately common so life duration does not become an attribution shortcut. Other origin modes may use different policy-owned entry semantics.

---

## 9. World authorship and control validity

World/source philosophy is defined by Fibre canon. Source works inform human abstraction; the compiler receives the resulting WorldSpec, not the work that inspired it.

Every world records:

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

A knowledgeable reviewer should not be able to identify a specific source work merely from the WorldSpec.

### Cohort genome/world independence

For the final quality cohort, the negative-control interpretation requires avoiding upstream human-authored genome/world correlation.

Therefore:

1. cohort WorldSpecs are authored and frozen **without access to the cohort genomes**;
2. symbolic genomes / synthetic parent genomes are assigned or frozen only after the WorldSpecs are frozen;
3. WorldSpec factual parent/household content must not be backfilled from those loci;
4. Pass-B `life_only` / `life_plus_genome` assignment is content-independent.

This is an experimental-control rule for #39, not a claim that real family environments are genetically independent.

Without this control, above-chance `life_only` discrimination could reflect an upstream world/genome correlation rather than a pass leak.

---

## 10. Persistence delta: no second life authority

#39 may introduce durable authority only for genuinely new Genesis/provenance state, for example:

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

Everything else publishes into existing Fibre authorities:

```text
identity assertions
lineage / life relations
place episodes
Thread history/events
embodiment
autobiographical memory
memory visual-companion obligation
```

Hard rule:

> **No new Genesis table may become authoritative for biography, memory, relationship, place, embodiment, or identity content already owned by #37/#38.**

`genesis_biography`, `genesis_memories`, or equivalent parallel life models are design failures.

Rejected `GenerationAttempt` audit payloads remain explicitly non-authoritative.

---

## 11. Genome discrimination semantics

Slice B and Slice H measure different things.

### Slice B — locus-capability positive control

Controlled content written with intentionally different genomes visible tests whether loci are specific enough **in principle** to support distinguishable output. This is a ceiling/instrument check.

If B is near chance, H is uninterpretable because the loci themselves are too generic.

### Slice H — achieved propagation

Actual Pass-C meanings are genome-blind. Analyze the H meanings by their Pass-B formation mode.

| H pattern | Reading |
| --- | --- |
| `life_plus_genome` above chance; `life_only` at chance | intended mechanism: inheritance propagated through attention and nowhere else |
| both at chance | genome inert even when visible at B; real result if B positive control was strong |
| `life_only` above chance | **negative-control failure**; investigate pass leakage and first verify no upstream genome/world control was violated |
| both near ceiling | over-determination; lived meaning is effectively demonstrating genome |

Healthy is not “higher is better.” Slice G freezes numerical thresholds and uncertainty treatment before H.

If the cohort control-validity rules above hold, reproducible above-chance `life_only` discrimination is evidence of an unexplained genome path and blocks closure until understood.

---

## 12. Replay and inspection

A reviewer must be able to inspect:

- WorldSpec + authorship provenance;
- entry policy / chronology endpoint;
- cognition provider/model/prompt/schema/sampling digests;
- EventStructurePool digest and offered structures;
- structures used vs ignored;
- world-emergent episodes;
- participant introductions and their WorldSpec affordances;
- every Pass-B treatment assignment;
- remembered/not-remembered outcomes;
- durable/no-durable meaning outcomes;
- reinterpretation eligibility and revised/unchanged/none outcomes;
- rejected attempts and mechanical reasons;
- admitted record refs;
- atomic publication witness and first live Thread version;
- outstanding memory-photo obligations.

Restart must reconstruct exactly the same admitted Thread state and Genesis provenance.

---

## 13. Non-goals

This contract does not implement or authorize:

- semantic validator cognition at admission;
- quality resampling;
- provider swapping to rescue cohort distinctness;
- #40 relevance/projection;
- Guardian tuning;
- Whole-Person standing;
- #42 post-live development;
- generic source ingestion;
- a Genesis-owned biography/memory authority;
- synchronous rendering of all memory images.

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

It may not curate away evidence that its own creative system produced a dull, over-integrated, stereotyped, genome-inert, genome-dominated, plot-shaped, or otherwise weak person.
