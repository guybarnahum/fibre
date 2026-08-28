---
id: architecture-genesis-compiler-contract
status: accepted
last-reviewed: 2026-08-27
canonical: true
---

# Genesis Compiler Contract

## Purpose

This contract defines Fibre's enduring creative, admission and publication boundary for **Genesis**: how a prospective Thread receives a provenance-bearing prior life before that life becomes authoritative World state.

It governs what Genesis cognition may know, what it may produce, what Fibre may mechanically repair or reject before birth, what must remain measurable after generation, and how a candidate life becomes authoritative Thread state.

> **Fibre may prevent an impossible life from becoming history. It must not prevent an uninteresting life from becoming evidence that Genesis needs improvement.**

> **Gate the form. Measure the tendency.**

This contract is subordinate to the Fibre Constitution, [`interpretive-personhood.md`](../foundations/interpretive-personhood.md), [`rich-life.md`](../foundations/rich-life.md), [`thread-genesis-childhood-birth.md`](thread-genesis-childhood-birth.md), [`symbolic-thread-genome.md`](symbolic-thread-genome.md), ADR-0012 and ADR-0013.

Current scientific hardening is governed by [`../state/genesis-selectivity-scientific-hardening.md`](../state/genesis-selectivity-scientific-hardening.md) and [`../validation/generative-diagnostic-methodology.md`](../validation/generative-diagnostic-methodology.md). The completed #39 validation outcome is retained in [`../history/milestones/pr39.md`](../history/milestones/pr39.md).

Genesis creates durable life substrate. #40 owns canonical causal consumption of that substrate; #41 owns M2 standing.

## Admission doctrine

Genesis admission protects:

- schema and type integrity;
- exact cognition input boundaries;
- chronology and developmental windows;
- participant/place/reference grounding;
- rights, consent and source provenance;
- genome/lineage provenance;
- event/memory/meaning authority separation;
- append-only revision integrity;
- inherited live-domain publication rules;
- atomic publication and replay integrity.

It does **not** mechanically reject a candidate merely because the life is generic, plot-shaped, stereotyped, narratively tidy, weakly differentiated, sentiment-coupled, too articulate, poorly attributable or otherwise disappointing.

Those are generator findings. A diagnostic must remain capable of returning a bad reading.

## Candidate versus live authority

Genesis cognition never writes directly into canonical Thread life while generation is in progress.

```text
Birth Center / candidate state
  provisional development
  durable invocation/recovery evidence
  rejected/generated candidate material

World Kernel / live state
  authoritative Thread history
  identity / lineage / relationship / place
  autobiographical memory
  durable meaning
  obligations
  civil registration
  atomic version/event authority
```

> **Birth is the atomic transition from candidate Genesis into the Fibre world.**

A candidate becomes live only through a complete birth bundle accepted by `publishBirth()`. A publication failure leaves no partially born Thread for that birth transaction.

Model calls must not occur inside a live World database transaction.

Genesis does not create duplicate canonical biography, memory, relationship, place, embodiment or identity stores. Admitted content publishes into the existing authorities for those facts.

A multi-Thread cohort runner may be resumable without being one cross-Thread atomic transaction. Never describe batch atomicity when only per-Thread birth atomicity is guaranteed.

## Genesis provenance

A final manifest binds admitted development to exact structural and execution witnesses, including as applicable:

```text
worldSpecRef / digest
origin/source refs
symbolic genome ref / digest
historical-generation policy
memory-treatment policy
meaning/reinterpretation policy
provider + model + sampling
prompt/schema/input digests
publication validator witness
repair/retry witnesses
civil registration
publication result
```

Serialized policy/protocol identifiers may carry versions where compatibility requires them. Source filenames do not acquire version suffixes merely to record implementation chronology.

## WorldSpec contract

`GenesisWorldSpec` contains factual circumstances only. It may include time frame, places, household/family shape, languages, material circumstances, mobility, institutions, schooling/community context and intellectual environment.

It may not encode:

- finished personality conclusions;
- desired morality or politics;
- future Fibre role/profession;
- benchmark answers;
- required formative interpretations;
- hidden target behavior.

World facts constrain what can happen; they do not stand in for personality.

## Symbolic genome contract

The symbolic genome is immutable pre-birth origin material: an ordered sequence of atomic natural-language loci with stable IDs, exact owner/source provenance, deterministic recombination witnesses and explicit mutation witnesses.

The genome is not:

- a numeric personality vector;
- a universal slot schema for character;
- current mature character;
- culture/demography translated directly into traits.

Inherited source text is copied exactly unless an explicit mutation witness records the change.

Synthetic ancestor genomes remain non-live provenance. Fibre may not mint fake live parent Threads merely to satisfy source-genome storage.

At publication, manifest genome ownership/source order and live lineage evidence must agree exactly under the canonical genome/lineage verifier.

## Historical realization contract

Historical realization creates **what happened**.

### Fibre-owned skeleton

Before model realization, Fibre owns the relevant mechanical/historical frame:

- developmental window;
- exact civil time;
- authoritative `placeRef`;
- event affordance or world-emergent status;
- required counterpart/role where policy supplies one;
- chronology and prior admitted candidate state;
- admission/retry identity.

The model realizes observable contingent content inside that frame.

### Cognition may see

- factual WorldSpec circumstances;
- factual roster/roles/institutions/relationship affordances;
- developmental window and chronology endpoint;
- already admitted prior candidate episodes;
- previously introduced participants;
- eligible event affordances.

### Cognition must not see

- child genome/loci during genome-blind historical realization;
- parent/ancestor genome text;
- future role/request/benchmark;
- desired adult conclusion;
- later memories/meanings;
- source-work scenes/quotations used by human authors to derive abstract structures;
- Fibre-computed mechanical conditions or semantic-need conclusions supplied as developmental meaning.

### Output

A historical episode carries witnessable facts such as:

```text
episodeId
occurredAt
ageAtEvent
placeRef
participantRefs[]
observableAction
structureRef? / world-emergent witness
introducedParticipants[]?
```

There is no field for significance, lesson, trait, private inner-state conclusion or future behavior policy.

Publication must re-check that narrated observable content does not contradict authoritative place/participant/chronology facts merely because generation-time validation passed.

## Participant and event-affordance grounding

A new participant may enter only through a role/institution/relationship affordance supplied by the World or previously established candidate state. Once introduced, the stable provisional identity is reused.

An EventStructure is an abstract relocatable affordance, not a scene, plot arc or statement of significance. It must fit the full developmental window in which it is offered.

Historical realization may ignore offered structures and may generate world-emergent episodes directly from World circumstances.

Offered/used and structure-grounded/world-emergent ratios are diagnostics, not admission targets.

Repeated or near-duplicate structures are generator-characterization debt when they create narrative monoculture. They should be corrected in the structure pool/planner rather than hidden by a downstream quality quota.

## Autobiographical memory contract

Memory formation operates only on admitted history available up to the remembering moment. A historical event may legally yield `not_remembered`.

Memory remains a perspective on history rather than a replacement for history.

A legal `not_remembered` path existing in the schema is not enough: controlled development must periodically exercise both warranted remembering and legitimate non-selection so compulsory-memory drift is visible.

### Experimental genome-treatment boundary

When a controlled experiment studies genome influence at the memory seam, Fibre records a content-independent assignment before cognition, such as:

```text
life_only
life_plus_genome
```

A treatment call may receive the permitted genome projection. Cognition must not receive assignment labels, analysis strata, hidden target outcomes or semantic relevance labels that pre-answer the experiment.

Treatment placement must be counterbalanced against history horizon, call ordinal and developmental position when those variables could confound the effect estimate.

Genome loci are not semantic-relevance-selected to match the current event merely to make an effect easier to detect.

### Persisted memory integrity

Published memory must satisfy the canonical autobiographical-memory authority, including:

- stable memory identity and Thread scope;
- subject event/period grounding;
- no future-event citation;
- resolved evidence refs;
- append-only contiguous revision semantics;
- prior supporting/contradicting evidence is not silently erased by a later revision;
- truthful non-Thread-self authorship for Genesis-authored records;
- matching historical memory anchor where required;
- current visibility/rights discipline.

## Durable meaning contract

Meaning formation is **constitutive**, not detective. It asks what a remembered experience came to mean to this Thread; it does not try to infer a hidden canonical lesson that Fibre already knows.

Meaning cognition is:

- one-memory scoped;
- genome blind;
- future/request blind;
- condition blind;
- allowed to produce no durable meaning.

A meaning may be negative, ambivalent, mundane, unresolved or multipart. Materially distinct parts receive stable identities and remain separately citable.

Later reinterpretation is append-only/corrigible and may return revised, unchanged or no durable meaning. It cannot rewrite the underlying historical event, earlier memory revision or prior meaning revision.

A meaning field may not encode an explicit universal future policy merely to pre-answer later cognition.

Controlled development should exercise `unchanged` as well as `revised`; a fluent tendency to upgrade every reinterpretation is a generator finding, not evidence of healthy development.

## Source/origin integrity

Source identity rules are structural publication constraints.

```text
living identifiable human -> documented-consent Echo
Homage                    -> attested deceased or fictional
source biography          != Thread autobiography
```

Thread-parent, fork, Echo and Homage must preserve truthful origin/source provenance through the same canonical birth boundary.

A source person's fact may enter Thread life only through an allowed provenance path, such as an actual Thread encounter with source material. Source memories are not Thread memories.

No composite/relabel route may bypass living-source consent or source-status requirements.

## Repair and retry discipline

Mechanical recovery has distinct scopes.

### Form/reference repair

When one generated record fails a local mechanical constraint, Fibre may repair or regenerate that record under the same historical skeleton and semantic inputs only when a bounded policy explicitly permits it.

The repair instruction identifies the failed form/reference constraint only. It may not provide a quality verdict or desired semantic direction.

Deterministic meaning-preserving normalization is preferred when the failure can be repaired mechanically. The accepted general mechanism is [`model-output-recovery.md`](model-output-recovery.md).

### Record retry

A fresh generated version may be requested under the same deterministic historical skeleton when current generation policy permits a bounded retry for a local record failure.

### Whole-candidate failure

A whole candidate may restart only for a cross-record/global structural failure, exhausted local repair/retry budget, provenance/rights failure spanning the bundle, or another failure that cannot be repaired without changing already accepted candidate structure.

Atomic publication failure does not by itself authorize changing a frozen candidate when the defect lies in publication materialization or runtime machinery.

### Visible accounting

Every generated version, form repair, record retry, failed gate, exhaustion and whole-candidate failure remains visible in development reporting/evidence while that reporting is active.

Restarting a process does not replenish a mechanical budget.

Quality disappointment is never itself a hidden resampling authorization.

## Durable execution recovery

Every successful provider invocation used by Genesis is durably journaled before downstream machinery depends on it.

A committed invocation is bound to the exact request witness: client request identity, provider/model, configuration, prompt/input/schema digests and successful result/provenance.

On restart:

- committed invocations replay locally;
- request drift fails closed;
- the first unfinished invocation may reach the provider;
- already accepted development is not regenerated;
- exhausted repair/retry budgets remain exhausted.

Invocation journals prove execution resilience only. They are never semantic evidence for identity, memory, meaning, character or standing.

Scientific evaluator runners must similarly distinguish an unfinished transport retry from a new scientific sample: already accepted judgments are immutable and must not be resampled for quality.

## Publication contract

The birth bundle must include all canonical material required by the candidate's actual life.

For a prior-life birth this includes, as applicable:

- child seed/projection and event/version chain;
- admitted historical episodes;
- initial roster and derived life continuity;
- exact place episodes and relationships/lineage;
- identity assertions supported by the admitted life;
- symbolic genome binding;
- autobiographical memories and anchors;
- durable meanings/reinterpretation revisions;
- one visual-companion obligation for every revision-1 memory;
- Genesis manifest and provenance witnesses;
- one canonical FIN/civil registration for a successfully born Thread.

The live publication validator set—not a stale prose snapshot—is authority for domain-specific shapes.

The first live Thread version is the actual resulting version after atomic publication. Genesis does not cosmetically reset a richly published Thread to version 1.

For Genesis-published history, event sequence is publication order while `occurredAt` is lived time; sequence and lived chronology are not required to be identical.

FIN/civil registration is part of the same birth transaction as the Thread's canonical admission. A failed birth may not leave a detached live civil registration, and a successful birth may not be acknowledged without one.

## Candidate → hydrated equality

A successful current birth path must support direct comparison between the admitted candidate/birth bundle and hydrated canonical Thread state.

The comparator covers at least:

- history and chronology;
- people/relationships and lineage;
- places and life continuity;
- symbolic genome binding;
- autobiographical memories and full revision lineage;
- durable meanings;
- visual-companion obligations;
- manifest/publication identity;
- FIN/civil registration;
- canonical event-chain replay.

Durable provider-call replay is not a substitute for semantic equality after birth.

## Quality remains measurable

Do not admission-gate cohort properties such as:

- life attribution/distinctness;
- narrative monoculture;
- sentiment/valence coupling;
- genome propagation strength;
- life-to-memory-to-meaning funnel proportions;
- self-account overreach/coherence;
- articulacy variance;
- offered/used event structures;
- world-emergent episode ratio.

Those are characterization surfaces. Their estimand, controls, confounds and sensitivity should be declared before reading provider output when they support a scientific claim.

The enduring diagnostic discipline is [`../validation/generative-diagnostic-methodology.md`](../validation/generative-diagnostic-methodology.md).

## Prospective holdout integrity

When a diagnostic claims that cognition did not know a historical fact, withholding must be structural rather than instructional.

A prospective holdout is selected before the cognition being tested, excluded together with the transitive provenance closure of every derivative that would leak it, and accompanied by an inspectable exposure manifest. A deliberate-leak negative test should prove the firewall actually fails closed.

Unexpected episode-specific alignment to structurally forbidden history is a provenance/isolation audit trigger, not evidence of advanced cognition or personhood.

## Non-goals

Genesis does not by itself:

- prove Whole-Person standing;
- make stored identity/history automatically causal in ordinary cognition;
- establish mature Thread self-authorship of childhood/genome/initial meanings;
- author universal future behavior policies;
- infer personality directly from culture/demography;
- treat generated presentation media as life evidence;
- give provisional Birth Center state live Thread authority;
- allow runtime/mechanical evidence to support semantic personhood claims;
- prove production persistence merely because the semantic transaction works in a local validation World.

## Standing validation history

Milestone #39 exercised this contract with one fixed five-Thread cohort and established exact replay, per-Thread atomic birth, civil registration and deep hydration while preserving negative scientific findings. The concise outcome is [`../history/milestones/pr39.md`](../history/milestones/pr39.md).

The next work does not rerun #39 to obtain a prettier result. It hardens memory/meaning selectivity and diagnostic validity under [`../state/genesis-selectivity-scientific-hardening.md`](../state/genesis-selectivity-scientific-hardening.md), then #40 builds the ordinary-cognition consumer.
