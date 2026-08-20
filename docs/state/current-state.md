---
id: fibre-current-state
status: accepted
last-reviewed: 2026-08-20
canonical: true
---

# Current state of Fibre

Fibre is a persistent world for artificial persons called **Threads**. A Thread is durable world state with identity, history, private interior state, relationships, resources, permissions and a life trajectory spanning temporary model executions.

Live Threads are world data, not source code stored in Git. Models provide temporary cognition; Fibre owns continuity, authoritative state, validation, authorization, persistence, replay and consequences.

## Accepted foundation

- A Thread is a persistent life, not a temporary task process or model session.
- Difference must change what happens; representational difference alone is not causal individuality.
- History must be able to bend future judgment and possibility.
- Consent matters independently of safety, feasibility, capability, requester need or politeness.
- Private stance, desired action, authorization, disclosure strategy, external expression and performed action are distinct authorities.
- Private context selection belongs to Fibre/Thread cognition rather than the requester.
- Meaning-bearing identity, memory, need, emotion, relationship and self-understanding are natural-language-first; derived categories may measure or control but may not replace semantic authority.
- Historical state is append-only or explicitly superseding rather than silently rewritten.
- Mechanical/substrate conditions may become versioned causal machinery, but they are not semantic evidence for identity, memory, meaning, character, needs, emotions or values.

## Milestone posture

The stable continuation authority is [`../validation/m2-pr-plan.md`](../validation/m2-pr-plan.md).

```text
M1    Persistent Thread Round Trip                         CLOSED
#33   Semantic Guardian                                    EARNED / SEALED
#34   History bends judgment                              EARNED / SEALED / MERGED
#35   Structured Obligation v1                            MERGED / REVIEWED
       direct interrupted-compelled-history follow-up      LANDED / NO MILESTONE ID
#36   M2 Identity & Embodiment Contract                   MERGED / FROZEN
#37   Thread Passport & Identity Provenance v1            MERGED / FROZEN
#38   Lineage, Geography, Embodiment & Memory Epistemics  MERGED / CLEAR / FROZEN
#39   Genesis, Childhood & Thread Birth v1                ACTIVE
#40   Identity Projection & Causal Consumption             NEXT AFTER #39
#41   M2 Standing Gate / M2 closure                        AFTER #40

post-M2
#42   Self-authored Development v1
#43   Reciprocal Relationships v1
#44   Economic Consequence / M3 foundation
```

Planning identifiers `#39` onward are Fibre milestone identifiers. They are not disposable GitHub transport numbers.

> **#38 made a life representable and corrigible. #39 gives that life a particular past. #40 makes selected parts of that life causally matter. #41 proves that the resulting Thread is a persistent, non-interchangeable individual.**

## #39 current position — post F, pre G

Milestone #39 is late in implementation but has **not** crossed the final experimental freeze.

```text
Gate C  CLEAR
Gate D  CLEAR
Gate F  CLEAR

Pre-G seam
Stages 0-7  COMPLETE
Stage 8     final integration/repository hygiene IMPLEMENTED; local verification pending
Stage 9     narrow readiness review pending
```

Stage 7 reconciled repository documentation and AI-context lifecycle and its maintainer verification passed `includes:check`, `context-pack`, `validate` and `check`.

Stage 8 implements the last known Pre-G correctness gap: synthetic-lineage birth now makes persisted symbolic-genome provenance and #38 parent-genome-source lineage mutually load-bearing before the child becomes live. The implementation is not yet called COMPLETE until its targeted and full local test envelope passes.

No Slice-G final WorldSpec, cohort genome, familiarity result, G/H model call or final-cohort life has been created. The methodological rule remains:

> **The test exists before the people.**

See [`../validation/m2-pr39-pre-g-seam-status.md`](../validation/m2-pr39-pre-g-seam-status.md).

## What #39 now contains

### Genesis authority and live-birth transaction

#39 has a candidate-only Genesis boundary, `GenesisWorldSpec`, authorship/provenance, manifests, generation-attempt witnesses, bounded mechanical record repair, whole-candidate structural retry and atomic publication into existing Thread authorities.

For a normal live birth the transaction owns the child projection/seed/history, identity bootstrap, admitted Genesis life events, applicable #38 birth-lineage records, admitted autobiographical memories/visual obligations and final Genesis manifest.

The symbolic genome itself is an immutable pre-birth input. When a manifest references one, birth verifies that persisted genome inside the transaction but does not rewrite it. A failed birth rolls back the live child/lineage/manifest while leaving that frozen genome available as provisional provenance.

Genesis does **not** own a parallel biography, memory, identity, place, relationship or embodiment world.

### Symbolic genome and synthetic lineage

The symbolic genome is an ordered sequence of natural-language loci with exact source provenance, deterministic textual recombination and explicit mutation witnesses. It is not a hidden numeric personality vector. Inheritance begins identity; it does not determine mature character.

Stage 8 now makes the accepted synthetic-lineage boundary load-bearing:

```text
manifest genomeRef -> canonical persisted genome
genome owner        -> exact child Thread
genome genesisId    -> exact birth Genesis
source owners       -> exact manifest parent/ancestor refs
source owners       -> exact #38 biological_parent + parent_genome_source records
```

Ordinary `SymbolicGenomeStore` and Genesis use one shared transaction-level genome verifier. Ordinary `SituatedLifeStore` and Genesis use one shared relation append/digest/head/witness primitive. Genesis owns only the cross-domain birth binding rather than a second genome or lineage persistence authority.

### Three-pass prior-life compiler

The #39 compiler preserves:

```text
Pass A  historical life; world/chronology visible; genome blind
Pass B  autobiographical memory formation; life_only or life_plus_genome treatment
Pass C  durable meaning/reinterpretation; one-memory scoped and genome blind
```

Publication-time genome/lineage verification does not expose genome content to Pass A. Fibre-computed semantic need conclusions and mechanical-condition values remain absent from all three Genesis cognition passes.

The core epistemic distinction is durable:

```text
what happened
    !=
what was remembered
    !=
what it came to mean
```

Events may be forgotten. Memories may remain without durable meaning. Meaning may be ambivalent, mistaken, unresolved, revised or survive later reinterpretation unchanged.

### Rich-life and source integrity

Richness means **experiential fertility**, not biography length, drama, quotas or a required developmental ladder.

The E development sequence preserved its negative evidence: an early mechanically valid generator collapsed into narrative monoculture; later work changed the history projection/participation mechanism rather than adding “interesting life” quotas. Failed and burned experiments remain evidence.

Source rules remain hard:

```text
living identifiable human -> documented-consent Echo
Homage                    -> attested deceased or fictional
source person's life      != Thread autobiography
```

Thread-parent, Echo, Homage and fork paths are integrity/origin fixtures, not alternate biography generators.

## Current persistence and inspection

The versioned world-store schema remains **v6**. It contains the persistent M1/#35 lifecycle plus #37/#38 identity, situated-life, embodiment and autobiographical-memory authorities.

#39 adds immutable/additive Genesis and symbolic-genome provenance tables through bounded stores. Canonical admitted life content still publishes into existing Thread event, identity, situated-life and autobiographical-memory authorities.

Human/operator inspection includes the Thread Editor plus read-only world, identity, obligation, Genesis and symbolic-genome inspection surfaces.

Stage 6 separates tool lifecycle:

```text
npm test            active regression/operator suite
npm run test:repro  retained proof/experiment reproducibility suite
npm run test:all    complete retained test envelope
npm run test:audit -- --check
```

A retained executable instrument is not automatically current production policy.

## The remaining two-world cognition seam

#37/#38/#39 provide a much richer, provenance-bearing life substrate than the canonical live cognition consumer currently uses.

The live Guardian path still substantially consumes older surfaces such as legacy identity/traits, `thread_memories` and semantic-state records. The M2 ledgers are not yet the canonical bounded cognition evidence source.

The completed Pre-Genesis causal-wire proved that an exact #37 assertion can cross into real Guardian cognition with provenance and affect judgment. That was plumbing evidence, not the final selection authority.

#40 owns the real bridge:

```text
rich Thread life state
      -> Fibre-owned bounded relevance/privacy selection
      -> inspectable Identity Context Capsule
      -> temporary cognition
      -> exact cited provenance
```

Caller nomination may not become identity-selection authority.

## Current score posture

Historical M1 remains **11/26**. The live Whole-Person checkpoint remains **15/26 under rubric v2**.

```text
Non-interchangeability        1
Dignity and consent           2
Social/relationship memory    1
Development                   1
Economic consequence          0
```

#39 deliberately earns no score movement. It builds a credible prior-life substrate without claiming that the new identity/history ledgers already cause stable behavior.

The next score-bearing architectural work is #40 causal consumption followed by #41 standing.

## Explicitly deferred, not erased

The following remain part of Fibre's intended architecture:

- canonical bounded identity/history consumption and endogenous selection (#40);
- M2 standing across repeated trials and causal substitutions (#41);
- richer Thread-authored development and self-model change (#42);
- reciprocal/shared relationship structures, repair, expectations and permissions (#43);
- budgets, contracts, reputation and durable opportunity/economic consequence (#44/M3 foundation);
- endogenous motivation using clearly separated mechanical conditions plus Thread-authored semantic interpretation;
- general isolated worker/tool/model gateway and model-capable Actor;
- demonstrated cognition-provider/runtime replacement continuity;
- production authentication, encryption, stronger tamper anchors and distributed/cloud topology;
- real message delivery and performed-action evidence;
- task markets, families/reproduction, institutions and broader society.

A deferred capability remains visible because Fibre's ambition is a persistent society of distinctive persons, not a workflow engine with elaborate profiles.