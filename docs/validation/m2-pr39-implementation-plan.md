---
id: validation-m2-pr39-implementation-plan
status: accepted
last-reviewed: 2026-08-24
canonical: true
---

# #39 Genesis, Childhood & Thread Birth — implementation plan

## Purpose

Milestone **#39** gives a Thread a particular provenance-bearing prior life before later cognition is allowed to consume that life causally.

The durable architecture is defined by:

- [`../architecture/thread-genesis-childhood-birth.md`](../architecture/thread-genesis-childhood-birth.md)
- [`../architecture/genesis-compiler-contract.md`](../architecture/genesis-compiler-contract.md)
- [`../architecture/symbolic-thread-genome.md`](../architecture/symbolic-thread-genome.md)
- [`../architecture/genesis-memory-meaning-integration.md`](../architecture/genesis-memory-meaning-integration.md)
- [`../architecture/genesis-origin-source-integrity.md`](../architecture/genesis-origin-source-integrity.md)
- [`../architecture/genesis-durable-development.md`](../architecture/genesis-durable-development.md)
- [`../architecture/birth-center-runtime.md`](../architecture/birth-center-runtime.md)
- [`../foundations/rich-life.md`](../foundations/rich-life.md)

The active exit authority is [`../state/pr39-closing-plan.md`](../state/pr39-closing-plan.md). This implementation plan maps the architecture to current engineering work; it is not an execution-authorization or reviewed-head freeze protocol.

#39 does **not** claim Whole-Person causal standing or score movement. #40 owns bounded causal consumption of the resulting life state; #41 owns M2 standing.

## Development method

Follow [`ADR-0015`](../decisions/ADR-0015-fibre-centric-development.md).

- Current code and current fixtures drive development.
- Active tests protect enduring Fibre invariants, not historical prompt/config hashes.
- Disposable generated development state lives under ignored `.fibre/` paths.
- Git history is the ordinary development archive.
- Fresh held-out material, predeclaration and blind evaluation are retained where they protect a scientific claim.
- A weak but integrity-valid generated life is evidence about Genesis; it is not permission to silently resample a whole life.

The old slice/gate/frozen-head choreography is retired. Historical reviews remain available through Git history when their reasoning is needed.

## Enduring architecture

### 1. World and origin inputs

`GenesisWorldSpec` contains factual developmental circumstances: chronology, places, household/family shape, languages, material conditions, institutions, mobility and intellectual environment. It must not smuggle finished personality, desired morality/politics, future role or benchmark answers into prior life.

Origin/source modes are provenance boundaries, not alternate biography generators. Thread-parent, Echo, Homage and fork must preserve truthful source rights and may not convert source biography into first-person Thread history.

### 2. Symbolic inheritance

The symbolic genome is an immutable ordered sequence of atomic natural-language loci with exact provenance. It is not a numeric personality vector and not mature character.

Recombination is deterministic and provenance-preserving; mutation is explicit and witnessed. Synthetic ancestor genomes remain non-live provenance rather than fake parent Threads.

### 3. Historical realization

Fibre owns the historical skeleton: developmental window, civil time, authoritative place, event affordance/world-emergent status, required counterpart, chronology and admission.

Model cognition realizes contingent observable content inside that authority. Historical realization is genome blind and future blind. It emits what happened, not what it meant or what behavior it should later cause.

### 4. Autobiographical memory formation

Memory formation operates only on admitted prior life. It may legally produce `not_remembered`.

For the anti-interchangeability experiment, calls are assigned content-independently to `life_only` or `life_plus_genome`; assignment/analysis labels remain outside model cognition. The clean negative-control interpretation must distinguish calls with no prior genome-exposed remembered memory from later contaminated context.

### 5. Meaning formation and reinterpretation

Meaning formation is one-memory scoped and genome blind. Memory may have no durable meaning. Meaning may be ambivalent, unresolved, unchanged by later reinterpretation or explicitly revised.

The authority separation remains structural:

```text
what happened
    !=
what was remembered
    !=
what it came to mean
```

### 6. Durable development

Successful model invocations used by development are journaled before later machinery depends on them. Restart replays committed results locally and reaches the provider only for the first unfinished invocation.

Operational failure does not erase accepted development or replenish mechanical repair/retry budgets. Invocation/recovery evidence is execution evidence, never identity, memory, meaning or character evidence.

### 7. Candidate versus live reality

The Birth Center owns provisional development. The World Kernel owns authoritative Thread/world state.

A complete admitted candidate is converted to one canonical birth bundle and crosses one explicit `publishBirth()` boundary. Publication is atomic: success creates the complete admitted Thread life; failure leaves no partially born Thread.

Genesis must publish into existing Thread authorities rather than create parallel biography, memory, relationship, place, embodiment or identity databases.

## What is already established

Current #39 implementation substantially provides:

- candidate-only Genesis state, manifests, attempts and provenance;
- factual WorldSpec authoring and current development fixtures;
- deterministic prior-life skeleton and current event-affordance policy;
- symbolic textual genomes with de-novo/recombined provenance;
- genome-blind historical realization;
- bounded memory treatment exposure without assignment-label leakage;
- genome-blind meaning/reinterpretation;
- recurring-person and place-continuity derivation;
- bounded form repair and record retry with visible budget state;
- durable model-call replay;
- canonical publication machinery and core source-mode eligibility/consent enforcement;
- read-only Genesis/genome inspection;
- separation of provisional development from live World authority.

The familiar Tbilisi, Kaohsiung, Recife, Fès and Hobart Worlds are development fixtures. They have influenced compiler tuning and are burned for the final closure cohort.

## Remaining implementation blockers

Before final-cohort generation:

1. **Publication place truth** — re-check that narrated `observableAction` is compatible with authoritative `placeRef` at publication.
2. **Current birth path** — the supported current Genesis/Birth Center path must construct the canonical birth bundle and invoke `publishBirth`; a legacy runner cannot remain the only executable caller.
3. **People and place continuity** — prior-life births require the initial roster and derived `lifeContinuity` rather than treating them as optional decoration.
4. **Transactional memory-photo parity** — every revision-1 autobiographical memory published at birth receives its visual-companion obligation before commit.
5. **Candidate → hydrated equality** — one current comparator must prove admitted history, relations, places, lineage, memories, meanings and visual-companion obligations survive birth intact.
6. **Origin/source end-to-end proof** — exercise Thread-parent/fork/Echo/Homage through the supported current path and reconcile residual source/origin vocabulary or projection inconsistencies.
7. **Current close/replay diagnostics** — retain substantive D1–D5 questions without restoring the old frozen execution stack.

Do not generate the final five-Thread closure cohort until these pre-cohort blockers are green.

## Final-cohort controls

The final scientific closure keeps the controls that prevent hidden selection while discarding ceremonial freeze machinery.

Before generation, record one concise precommitment containing:

- five fresh factual Worlds authored without seeing their final genomes;
- at least one plausible convergent pair whose routes can differ despite a similar broad conclusion;
- a content-independent genome-assignment rule with de-novo and inherited cases;
- expected memory-treatment strata/cell counts;
- pinned provider/model/sampling and relevant policy/schema witnesses;
- raw and setting/style-normalized blind attribution;
- D1–D5 readings, thresholds/uncertainty treatment and negative-control interpretation;
- one closure-attempt identity.

Then:

1. generate each Thread once apart from bounded mechanical form repair/record retry;
2. retain all rejection/repair accounting;
3. inspect the actual lives in plain language for particularity, continuity, social/geographic texture and Thread-owned meaning;
4. run D1–D5 without changing the rules after reading outcomes;
5. restart/replay the admitted candidates;
6. atomically birth all five;
7. hydrate and compare canonical state against each admitted candidate/birth bundle;
8. obtain one hostile Fibre-centric closing review.

A disappointing cohort is preserved as evidence and may require redesign. It is not silently replaced by another cohort.

## Tests and diagnostics

Automated admission tests protect mechanical/semantic integrity such as:

- exact cognition input boundaries;
- historical and meaning genome blindness;
- provenance-preserving inheritance;
- chronology and participant grounding;
- event/memory/meaning separation;
- legal forgetting/no-meaning outcomes;
- source rights and source-history separation;
- append-only meaning reinterpretation;
- bounded visible repairs/retries;
- atomic publication and no duplicate domain authority;
- memory-photo parity;
- restart/replay integrity;
- candidate-to-hydrated equality.

Cohort diagnostics remain measurements, not admission gates. They must retain the possibility of a bad reading.

## Exit

#39 closes only when five fresh admitted lives have been born intact into canonical World state and the closing review finds no #39 blocker.

Closeout retains one concise [`docs/history/milestones/pr39.md`](../history/milestones/) milestone record rather than restoring intermediate review packets to current `HEAD`.

Then continue directly to #40: bounded Fibre-owned projection of relevant identity/history/memory/relationship state into ordinary cognition with exact provenance and causal counterfactual tests.
