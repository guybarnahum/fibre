---
id: architecture-genesis-compiler-contract-v1
status: accepted
last-reviewed: 2026-08-15
canonical: true
---

# Genesis Compiler Contract v1

## Purpose

This contract defines the creative and admission boundary for Fibre milestone **#39 — Genesis, Childhood & Thread Birth v1**.

It governs what Genesis cognition may know, what it may produce, what Fibre may repair or reject before birth, what must remain measurable after birth, and how a candidate life becomes authoritative Thread state.

> **Fibre may prevent an impossible life from becoming history. It must not prevent an uninteresting life from becoming evidence that Genesis needs improvement.**

And:

> **Gate the form. Measure the tendency.**

Genesis admission protects truth, typing, provenance, chronology, rights, and pass boundaries. Personhood quality is measured only after output is admitted and frozen.

This contract is subordinate to the Fibre Constitution, [`../vision/interpretive-personhood.md`](../vision/interpretive-personhood.md), [`thread-genesis-childhood-birth-v1.md`](thread-genesis-childhood-birth-v1.md), [`symbolic-thread-genome-v1.md`](symbolic-thread-genome-v1.md), ADR-0012, and ADR-0013.

#39 does not claim Whole-Person causality or M2 standing. It creates durable life substrate for #40 and #41.

---

## 1. Admission doctrine: mechanical integrity only

A #39 quality diagnostic must retain the possibility of observing bad quality in admitted Genesis output.

Therefore **#39 has no validator-cognition surface**. Admission uses only structural, reference, rights, chronology, digest, allowlist, existing-domain, and narrow lexical/category-form checks.

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
| inherited #37/#38 publication shape invalid | exact live domain validators, preflighted before atomic publication |

Examples of Pass-A category-form phrases include explicit constructions such as `learned that`, `from then on`, `which made her/him/them`, or `came to understand` when they insert interpretation into an observable episode.

Examples of Pass-C policy-form phrases include `I always`, `I never`, `from then on I`, `whenever X I`, or `I refuse to` when used as a universal future behavior rule.

These lexical checks may over-reject. They must remain narrow category-form checks and must not evolve into semantic quality judges.

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

### Retry granularity: repair form without selecting away lives

Mechanical admission has **two retry scopes**.

#### Record-level form repair

A failure confined to one generated record is repaired by regenerating **that record only**, preserving the rest of the candidate life unchanged.

Examples:

- Pass-A interiority wording in one `observableAction`;
- Pass-C explicit universal-policy wording in one meaning;
- one record failing its output schema;
- one generated identity assertion violating the current atomic-claim shape;
- another single-record publication-shape failure that does not invalidate surrounding chronology/provenance.

Record repair is form repair, not quality selection. The replacement call receives the same frozen semantic inputs and is instructed only to satisfy the record contract; it may not be given a quality verdict or desired semantic direction.

V1 caps record-form repair at **3 generated versions of a record total** (original plus two repairs). The exact cap is frozen with the cohort policy at Slice G. Exhaustion makes the candidate attempt structurally unable to complete and is recorded explicitly as `record_repair_exhausted` rather than silently disappearing.

#### Attempt-level retry

Discard/restart the candidate attempt only when the failure is cross-record or whole-candidate structural, for example:

- globally inconsistent chronology that cannot be repaired without changing multiple admitted candidate records;
- invalid source/rights/provenance structure spanning the life;
- publication bundle integrity/replay failure;
- atomic publication failure;
- exhausted record-form repair.

V1 caps whole-candidate Genesis at **3 candidate attempts per Thread**.

#### Rejection accounting is itself evidence

Every record repair and attempt-level failure is witnessed. The final cohort reports the **per-gate rejection/repair profile**, including:

```text
records_generated
record_repairs_by_gate
record_repair_exhaustions
candidate_attempt_failures_by_gate
candidate_attempts_per_thread
```

This profile is characterization, not a quality gate. It exposes survivorship pressure instead of letting lexical/form filters invisibly curate the cohort.

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

### Inherited #37/#38 publication validators are part of the contract

Genesis does not get a looser publication schema than live Fibre. Slice A must inventory and exercise the **current live domain validators** against deterministic publication fixtures before creative life generation.

At the pre-Slice-A baseline, important constraints include:

#### Identity assertions

Current atomic-claim discipline requires one material proposition. Among other checks it rejects:

- paragraph/list or newline bundles;
- multiple independently addressable sentences;
- explicit proposition bundling including semicolon, em dash, en dash, and phrases such as `as well as` / `and also`;
- repeated conjunction chains under the current v2 discipline;
- non-lowercase-snake-case claim predicates;
- claim-predicate payloads beyond the current byte bound.

Genesis creative output must therefore be mapped/split into valid atomic identity assertions before publication rather than discovering this after a whole life is complete.

#### Autobiographical memories

Current memory authority requires, among other checks:

- immutable memory identity derived from Thread + origin event + slot;
- non-empty `eventRefs` containing `subject.originEventRef`;
- every cited Thread event to resolve and fall inside `subjectPeriod` and not after `asOf`;
- material `rememberedMeaning` within current bounds for persisted memory records;
- Fibre/imported authorship rather than falsely attributing generation to the Thread itself;
- resolved evidence refs and append-only contiguous revision semantics;
- a matching Thread-history memory anchor and event/version chain.

`subjectPeriod` is therefore a real mechanical coupling between Pass-A chronology and the eventual persisted memory representation.

#### Situated identity / life evidence

Current v2 situated identity rules require appropriate resolved witnesses, including:

- cultural/language formation assertions backed by a resolved Thread-event witness;
- lineage/family/ancestral assertions backed by a resolved life-relation revision witness;
- geography/place assertions backed by a resolved place-episode revision witness;
- situated identity domains remaining `context_only` until later causal standing.

The exact executable validator set, not this prose inventory, is authority. Slice A records a validator-set witness/digest or equivalent version evidence so later publication can be tied to the validated live contracts.

A single-record inherited-validator shape failure uses record-level form repair where possible. Cross-record/replay/publication failures use attempt-level retry. No inherited validator may be used to smuggle a personhood-quality judgment into admission.

### First live version

Genesis does not cosmetically reset a Thread with an admitted prior life to `version = 1`.

The first live version is the exact resulting version produced by atomic publication under current Fibre event/version semantics. Record it as:

```text
publication.resultingThreadVersion
```

The first post-birth command uses that actual value as `expectedVersion`.

### Failed attempts

Failed candidate state is discarded from Thread authority. Its rejection witness is recorded separately and may retain a bounded rejected payload for audit, but that payload is excluded from hydration, history, memory, and cognition.

Attempt-level and record-level caps are versioned #39 policy, not constitution.

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
  publicationValidatorSetWitness
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
- factual world/relationship context allowed by the frozen input schema;
- for `life_plus_genome` only, the whole symbolic genome **or a fixed deterministic locus subset chosen without reference to current episode/memory content**.

It never sees later events or later meanings.

Genome loci are **never relevance-selected** for a treatment call. A content-driven selector would confound “genome shaped attention” with “Fibre chose loci that already matched the content.” The cohort freezes one policy: whole genome or a deterministic subset such as ordinal first-k / stable-hash selection independent of semantic content.

### Treatment assignment and exposure strata

Before each eligible Pass-B call, the policy records the direct mode:

```text
life_only
life_plus_genome
```

For the final cohort, Slice G freezes `life_plus_genome` in the **30–40%** range.

Assignment must be **content-independent**: chosen by a frozen deterministic/randomized positional policy, never by semantic inspection of which event or memory appears likely to benefit from genome visibility.

Because Pass B can see prior candidate memories, direct mode alone is not the analysis cell. Every call also records whether any **prior remembered candidate memory visible to this call** was formed under `life_plus_genome`.

That yields three analysis strata:

```text
life_only_unexposed
  current call = life_only
  no prior visible remembered memory was formed under life_plus_genome

life_only_exposed
  current call = life_only
  at least one prior visible remembered memory was formed under life_plus_genome

life_plus_genome
  current call receives the frozen genome exposure policy
```

`life_only_unexposed` is the clean negative control. `life_only_exposed` is not a leak; it measures propagation through the Thread's own prior memory history.

At Slice G, check expected cell sizes before cohort generation. If needed, use **position-stratified but content-independent assignment** (for example, guarantee the first k eligible Pass-B calls are `life_only`) so the clean control is analyzable. The exact schedule is frozen before H.

### Output

```text
MemoryFormation {
  outcome: remembered | not_remembered
  episodeRefs[]?
  rememberedContent?
  uncertainty[]?
  formationMode
  priorTreatmentMemoryExposure
  analysisStratum
}
```

There is no meaning field.

`not_remembered` is a first-class legal outcome. **Admission does not require any minimum amount of forgetting.** If every event becomes remembered, the funnel diagnostic is allowed to expose that failure.

---

## 7. Pass C — remembered meaning and reinterpretation

Pass C creates **what one remembered experience durably came to mean**.

### Visible — initial meaning formation

The v1 Pass-C input allowlist contains only:

- the **one target memory's** remembered content;
- that memory's uncertainty;
- stable memory/provenance refs required to identify the subject without resolving additional history content;
- age/time at meaning formation;
- chronology position needed to place the interpretation in time.

Pass C does **not** receive sibling memories to establish an initial meaning.

### Visible — reinterpretation only

A reinterpretation call may additionally receive:

- the prior durable meaning being reconsidered;
- the one mechanically eligible triggering later episode, in its bounded observable historical form;
- the eligibility relation (`same_structure_family`, `same_person_or_relationship`, or `same_intellectual_source`) as a type/provenance fact, not a semantic verdict.

### Structurally absent in every Pass-C call

- Thread genome, parent/ancestor loci, or derived genome verdicts;
- other memories of the Thread;
- underlying historical episode content for the target memory (event refs may remain opaque provenance refs);
- other prior meanings, except the single prior meaning explicitly supplied for reinterpretation;
- entry-stage purpose, adult role/context, future request/benchmark/#40 material;
- any life content after the call's `asOf` / beyond the applicable `chronologyEndsAt` boundary;
- source-work identity that was not itself encountered by the Thread.

The exact Pass-C input object is canonicalized, allowlist-checked, and digested exactly like A and B. This is load-bearing: C must not recover what memory omitted by silently rereading history, nor absorb genome signal through sibling memories.

### Always genome-blind in v1

The only legitimate direct route for genome signal to initial remembered meaning is:

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

### Reinterpretation eligibility and cap accounting

A later episode creates a reinterpretation **eligible opportunity** when it occurs at least the policy-defined time after the earlier meaning and shares one of:

- same structure / explicit structure family;
- same concrete person/relationship;
- same intellectual/source subject actually encountered by the Thread.

V1 default minimum distance is **5 years**. The run cap is **3 reinterpretation calls per Thread**. These are versioned policy values.

Eligibility is computed and recorded **before** applying the cap. If more than three opportunities are eligible, the frozen policy deterministically chooses which are run (for example earliest chronological eligibility, tie-broken by stable event ID); no semantic ranking is allowed.

Record:

```text
reinterpretationEligibleCount
reinterpretationRunCount
reinterpretationSkippedByCapCount
eligibleOpportunityRefs[]
runOpportunityRefs[]
```

The trigger creates eligibility, not mandatory revision.

```text
revised
  new meaning supersedes prior meaning

unchanged
  a genuine later echo occurred, but the prior meaning survived

none
  no new durable meaning formed from the eligible echo
```

`unchanged` is distinct from `none`. Revised/unchanged/none proportions use the **run** denominator, while eligible-versus-run is reported separately so cap truncation remains visible.

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
4. Pass-B direct treatment assignment and any position stratification are content-independent.

This is an experimental-control rule for #39, not a claim that real family environments are genetically independent.

Without this control, above-chance `life_only_unexposed` discrimination could reflect an upstream world/genome correlation rather than a pass leak.

---

## 10. Persistence delta: no second life authority

#39 may introduce durable authority only for genuinely new Genesis/provenance state, for example:

```text
GenesisManifest
GenesisWorldSpec
GenerationAttempt / record-repair witnesses
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

Rejected/repaired `GenerationAttempt` audit payloads remain explicitly non-authoritative.

---

## 11. Genome discrimination semantics

Slice B and Slice H measure different things.

### Slice B — locus-capability positive control

Controlled content written with intentionally different genomes visible tests whether loci are specific enough **in principle** to support distinguishable output. This is a ceiling/instrument check.

If B is near chance, H is uninterpretable because the loci themselves are too generic.

### Slice H — achieved propagation with three strata

Actual Pass-C meanings are genome-blind. Analyze H meanings using the Pass-B analysis strata rather than direct mode alone.

| H pattern | Reading |
| --- | --- |
| `life_plus_genome` above chance; `life_only_unexposed` at chance | intended direct mechanism: inheritance propagated through genome-visible attention while the clean control stayed clean |
| `life_only_exposed` lies above `life_only_unexposed` and plausibly below/near treatment | informative mediated propagation through prior memory history; not a leak by itself |
| treatment and both life-only strata at chance | genome inert even when visible at B; real result if B positive control was strong |
| `life_only_unexposed` reproducibly above chance | **negative-control failure**; investigate pass leakage and first verify world/genome and assignment controls |
| treatment and clean control both near ceiling | over-determination or broken control; lived meaning is effectively demonstrating genome |

Healthy is not “higher is better.” Slice G freezes numerical thresholds, uncertainty treatment, minimum analyzable cell sizes, and the interpretation of the three strata before H.

`H ≈ chance` while the Slice-B ceiling is strong is a legitimate finding: capable loci did not materially propagate through lived attention.

---

## 12. Replay and inspection

A reviewer must be able to inspect:

- WorldSpec + authorship provenance;
- entry policy / chronology endpoint;
- cognition provider/model/prompt/schema/sampling digests;
- current publication-validator-set witness;
- EventStructurePool digest and offered structures;
- structures used vs ignored;
- world-emergent episodes;
- participant introductions and their WorldSpec affordances;
- every Pass-B direct treatment assignment, prior-treatment exposure, and analysis stratum;
- remembered/not-remembered outcomes;
- durable/no-durable meaning outcomes;
- reinterpretation eligible count, run count, cap skips, and revised/unchanged/none outcomes;
- every record-level form repair and per-gate repair count;
- every attempt-level rejection and mechanical reason;
- admitted record refs;
- atomic publication witness and first live Thread version;
- outstanding memory-photo obligations.

Restart must reconstruct exactly the same admitted Thread state and Genesis provenance.

---

## 13. Non-goals

This contract does not implement or authorize:

- semantic validator cognition at admission;
- quality resampling;
- semantic/content-driven locus selection for Pass B;
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
  prior-treatment exposure recorded
          ↓
PASS C — some memories acquire meaning
  one memory at a time
  always genome blind
          ↓
RECORD-FORM REPAIR WHERE NEEDED
  visible and bounded
          ↓
MECHANICAL INTEGRITY ONLY
          ↓
ATOMIC BIRTH INTO FIBRE
          ↓
FREEZE
          ↓
JUDGE PERSONHOOD QUALITY
```

The compiler may refuse or mechanically repair records that cannot truthfully belong to the Thread or to the field in which they are being placed.

It may not curate away evidence that its own creative system produced a dull, over-integrated, stereotyped, genome-inert, genome-dominated, plot-shaped, or otherwise weak person.