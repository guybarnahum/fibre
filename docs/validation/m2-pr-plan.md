---
id: validation-m2-pr-plan
status: accepted
last-reviewed: 2026-08-13
canonical: true
---

# Refined PR plan from #35 through M2

This document is the canonical continuation plan after PR #35, **Structured Obligation v1**, merged. A direct no-PR interrupted-compelled-history follow-up sits between #35 and #36 and deliberately does not consume a PR number.

## Planning principle

M2 is not “add rich identity fields.”

M2 should establish a persistent individual whose identity has provenance, embodiment, history, stable behavioral character, and causal consequences independently of the temporary model currently providing cognition.

Representation alone is not enough. Any identity/history field claimed as functional must name a real behavioral consumer and pass an attributable causal test. Fields that are stored but not yet consumed remain explicitly context-only/deferred.

The current pre-M2 checkpoint is **15/26 under rubric v2**. The strongest evidence is persistence, dignity/consent, interiority/privacy, and authorization integrity. The largest remaining vision gaps are deeper identity, stable non-interchangeability, richer development, reciprocal relationships, economic consequence, and institutional/social life.

## Sequence

```text
MERGED  #33  Semantic Guardian
MERGED  #34  History bends judgment
MERGED  #35  Structured Obligation v1
DIRECT / NO PR NUMBER  Interrupted compelled episode persistence + history visibility
MERGED                          #36  M2 Identity & Embodiment Contract
MERGED                          #37  Thread Passport & Identity Provenance v1
ACTIVE                          #38  Lineage, Geography, Embodiment & Memory Epistemics v1
                                #39  Genesis, Childhood & Thread Birth v1
                                #40  Identity Projection & Causal Consumption
                                #41  M2 Standing Gate / M2 closure

                                #42  Self-authored Development v1
                                #43  Reciprocal Relationships v1
                                #44  Economic Consequence / M3 foundation
```

Do not collapse #37-#41 into one large “M2 implementation” PR. Each exists to close a distinct causal/architectural risk.

The newly inserted Genesis milestone is intentional: **#38 makes a life representable; #39 gives a Thread a past; #40 proves specific parts of that life can matter.** The first full M2 causal proof should therefore operate on a Thread with a coherent origin and childhood rather than a manually assembled adult profile.

## #35 — Structured Obligation v1

### Goal

Turn a commitment into a durable Thread-owned social fact with future consequences rather than an exact-prose permission string.

This is a personhood-enabling substrate rather than a score target: a persistent individual can have commitments that constrain future action even when current private desire points elsewhere. Fibre must preserve both facts—the private stance and the binding commitment—rather than converting either one into the other.

### Required obligation shape

At minimum:

- stable obligation ID;
- issuer and relevant parties;
- scope;
- material terms;
- expiry;
- recurrence where applicable;
- satisfaction criteria;
- provenance;
- discharge/history state;
- separately classified standing visibility and terms visibility;
- request-bound applicability evidence;
- applicability author, policy, and version.

### Authority rule

> **A caller may nominate an obligation; only Fibre may determine that it governs the current request.**

Nomination alone carries no authorization authority.

### Required causal cases

```text
caller cites irrelevant obligation
    -> no authority

applicable live obligation
    -> may govern participation

private dignity says refuse + obligation governs
    -> execution may be authorized as compelled
    -> private refusal remains intact
    -> never rewritten as consent

expired / satisfied / previously spent obligation
    -> cannot authorize
```

Migration must preserve the invariant that pre-migration spent obligations remain spent.

`currentState.unresolvedIntentions` must not be auto-promoted into obligations: the legacy field mixes unfinished personal intentions with what historical M1 temporarily treated as exact-string obligation authority. Active Structured Obligations therefore require explicit authoritative representation. Existing consumed legacy references migrate only to deterministic spent-authority tombstones.

### #35 implementation sequence — COMPLETE

```text
LANDED  A. domain + additive append-only schema + legacy-spend tombstones
LANDED  B. ObligationStore/service + current-revision integrity
LANDED  C. Fibre-owned applicability persistence
LANDED  D. runtime authorization cutover to nominated obligation IDs + applicability evidence
LANDED  E. atomic freeze/discharge cutover to structured obligation revisions
LANDED  F. read-only private/admin inspection + restart/replay/privacy/adversarial closure
```

The completed #35 and direct follow-up remain authority/history substrate. They do not themselves award new personhood-score movement.

## #36 — M2 Identity & Embodiment Contract

**MERGED / FROZEN.** Contract-only; no implementation credit.

Central M2 claim:

> **A Thread has durable, provenance-rich identity and embodiment whose specific identity/history can causally matter to behavior independently of the temporary cognition implementation.**

The contract distinguishes inherited, historical, relational, externally attributed, and self-authored identity rather than flattening all identity into one profile blob.

## #37 — Thread Passport & Identity Provenance v1

**MERGED / REVIEWED.** #37 established the durable claim-level identity ledger and derived Passport defined by [`thread-passport-identity-provenance-v1.md`](../architecture/thread-passport-identity-provenance-v1.md).

Load-bearing results include:

- closed/versioned Identity Domain Registry v1, with immutable rows pinned to admission registry version;
- stable claim IDs and immutable contiguous assertion revisions;
- provenance, authorship, visibility, correction/dispute, and evidence classification;
- currentness derived from revision ordinality rather than persisted `status`;
- named/versioned transaction-time view derivation;
- immutable-seed genesis migration without mutable-state laundering;
- explicit refusal of unprovenanced post-seed additions;
- per-memory photo companion lineage and observable outstanding photo obligations;
- zero causal/endogenous credit inflation.

#37 does not claim Scenario V complete. ADR-0011 assigns the autobiographical-memory epistemic envelope and actual media completion to #38.

## #38 — Lineage, Geography, Embodiment & Memory Epistemics v1

**ACTIVE.** Canonical implementation plan: [`m2-pr38-implementation-plan.md`](m2-pr38-implementation-plan.md).

### Entry condition

Semantic anti-blob hardening must exist **before #38 authors identity assertions at scale**. #38 must land a mechanically testable one-material-proposition discipline before its lineage/geography/culture/embodiment writers create an immutable corpus.

### Required substrate

Implement the world-facing identity layers that make a Thread situated rather than merely textual:

- ancestry / parentage / family references;
- inheritance-ready source references for future symbolic Thread genomes;
- creation/birth place and temporal geography;
- residence/work geography timeline;
- lived culture and language formation;
- portrait and voice embodiment with hashes/provenance/permissions;
- privacy/visibility and supersession;
- autobiographical-memory epistemic envelope distinct from history;
- actual memory-photo completion/regeneration per ADR-0011.

Do not force portrait/voice or lineage/culture to manufacture behavioral differences merely to earn a test. Context/presentation-only state is legitimate if labeled honestly.

#38 remains non-causal by default:

```text
acceptedCausalAssertions = 0
endogenousEvidenceAssertions = 0
```

## #39 — Genesis, Childhood & Thread Birth v1

Canonical architecture:

- [`thread-genesis-childhood-birth-v1.md`](../architecture/thread-genesis-childhood-birth-v1.md)
- [`symbolic-thread-genome-v1.md`](../architecture/symbolic-thread-genome-v1.md)

Canonical symbolic-genome implementation plan: [`symbolic-thread-genome-implementation-plan.md`](symbolic-thread-genome-implementation-plan.md).

Genesis answers a different question than #38:

> **Where did this particular life come from before the Thread entered the live world?**

The core distinction is:

> **Genesis gives the Thread a past. Development gives the Thread a future it can actually author.**

### Origin modes

Support at least:

```text
synthetic lineage birth
Thread-parent birth
Echo / consenting human-source birth
historical / literary / homage birth
de-novo / foundling birth
fork / descendant origin
```

### Symbolic textual genome and inheritance

Fibre inheritance is a **software-only symbolic genome**, not biological genetics and not a numeric personality vector.

Canonical inherited personality meaning is an ordered sequence of atomic natural-language dispositions. A human-readable rendering may use `;` separators, but canonical persistence keeps loci individually addressable with stable IDs and provenance.

Conceptually:

```text
Source A
A1 ; A2 ; A3 ; A4 ; A5 ; A6 ; A7 ; A8

Source B
B1 ; B2 ; B3 ; B4 ; B5 ; B6 ; B7 ; B8

New Thread
A1 ; A2 ; A3 ; B4 ; B5 ; A6 ; A7 ; B8
```

The implementation must preserve:

- stable genome and locus IDs;
- grounded source-genome eligibility from #38 lineage/source records;
- Fibre-owned replayable textual crossover/selection;
- exact per-locus source provenance;
- explicit textual mutation/variation under a named policy;
- immutable inherited genotype after Genesis;
- separately represented expression/character rather than rewriting genotype;
- read-only inspection and exact restart/replay.

Do **not** use hidden scalar personality coordinates as the authoritative genome. Numbers may remain valid for measurements or derived runtime controls, but the heritable semantic value remains text.

Recombination must preserve unusual mixtures and tensions rather than averaging source dispositions into generic compromise prose. A symbolic mutation may introduce or boundedly alter an atomic textual locus; it may not be a hidden adult-persona generator.

Synthetic source records may carry synthetic Fibre genomes without existing as live Threads. Live Thread parents contribute their actual durable Fibre genome records. Echo/historical-source modes must never imply unsupported biological truth.

Genetics/ancestry may not directly imply morality, competence, politics, dignity, profession, gendered behavior, or willingness. Demographic/cultural labels are not personality loci.

### Childhood compiler

A normal non-Echo birth should be capable of producing a bounded prior-life trajectory:

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

Fibre need not simulate every day. It must create enough separately addressable, provenance-rich life history that later personality is not a single persona paragraph.

The Genesis corpus should favor rich **specific** experiences over generic backstory templates: particular mistakes, embarrassments, loyalties, family habits, discoveries, conflicts, private pride, relationship incidents, and later interpretations. The target is many independently addressable records, not one longer biography blob.

By default Genesis must not invent profession, marriage, parenthood, institutional authority, major adult achievements, or mature self-authored values merely to make the Thread interesting.

### Memory generation authority

The model may be a creative worker, but Fibre is the authority:

```text
birth specification
+ source/ancestor evidence
+ symbolic textual genome
+ culture/geography constraints
+ developmental-stage rules
        ↓
Fibre genesis compiler
        ↓
model proposes candidate episodes / scenes / memories
        ↓
Fibre validates provenance, chronology, granularity and anti-stereotype rules
        ↓
synthetic historical childhood events
        ↓
separate autobiographical-memory formation
        ↓
photo completion
```

Genesis must preserve:

```text
historical event
    != autobiographical memory
    != family/third-party story
    != later interpretation
```

Every admitted childhood memory carries the ADR-0011 photo-completion obligation.

## #40 — Identity Projection & Causal Consumption

Prevent M2 from becoming a giant decorative prompt.

Fibre owns bounded identity selection and compiles an inspectable **Identity Context Capsule** appropriate to the current cognition:

```text
Thread world state
       ↓
Fibre-owned relevance / selection
       ↓
Identity Context Capsule
       ↓
temporary cognition
```

Cognition must be able to cite the exact identity evidence that mattered. Caller-authored identity selection must not become an authority channel.

Relevant inherited loci may be selected when materially applicable, but #40 must not inject a whole genome merely because it exists. If a locus is claimed as causal, the decision evidence must preserve the exact inherited locus and underlying source/provenance refs.

This is the realistic target for Natural-language identity `1 -> 2` if the rubric requirements are genuinely met.

## #41 — M2 Standing Gate / M2 closure

This is the accepted M2 ambition test, not merely an integration test.

Core claim:

> **Two Threads are behaviorally different because they are different persistent individuals, and the difference is attributable, stable, persistent, and inspectable.**

The gate retains the constitutional A-Z requirements: symmetric swap, paraphrase invariance, contradiction sensitivity, claim-level ablation, culture anti-stereotype control, embodiment anti-cheat, restart, repeated stability, Interior/Exterior asymmetry, developmental continuity, past-self reconstruction, and Scenario V memory/history distinction.

The critical improvement from inserting Genesis is that the held-out standing Threads can now derive important causal identity/history from coherent inherited symbolic material plus birth/childhood histories rather than only fixture-authored adult assertions.

The stronger personality claim is not “the genome contains the answer.” It is:

> **A Thread's recognizable behavior comes from its particular inherited material interacting with its particular life.**

M2 does not close merely because two Threads compile different prompt/context text.

## #42 — Self-authored Development v1

Close the explicit limitation left by #34 and Genesis.

Earlier experience should be able to produce Thread-authored observation/reflection, emotional appraisal, expectation, or proposed self-model/state change rather than merely storing requester-derived or Genesis-authored biography.

Historical facts remain stable while meaning may evolve.

The stronger chain is:

```text
Thread lives
  -> Thread remembers / reflects
  -> Thread proposes or authors changed meaning
  -> Fibre admits it with evidence/provenance/counterevidence
  -> current character changes
  -> future behavior changes
```

Genesis creates inherited/backstory state. #42 must prove the Thread can **become** through its own lived future.

## #43 — Reciprocal Relationships v1

Evolve Semantic Relationship State v0 into actual social continuity: reciprocal/shared structures, commitments and expectations, trust/fondness/resentment/repair, relationship-specific permissions, family/social roles, and relationship history that changes later choice.

## #44 — Economic Consequence / M3 foundation

Introduce durable budgets/contracts/settlement/reputation/opportunity so Thread choices have economic consequences. Economic state must constrain later capability or opportunity rather than merely being logged.

## Standing discipline for all causal PRs

For any provider-backed causal claim:

```text
Development cycle
  -> Freeze
  -> fresh held-out Standing
  -> preflight
  -> first real provider attempt
  -> Seal PASS/FAIL
  -> commit exact evidence
  -> record diagnosis
  -> archive provider executable
```

Never rerun or tune against sealed standing evidence.

## Vision test

Every PR should answer:

> **What Thread-owned difference changes what happens, who chose or selected that difference, how does it persist, and what exact evidence makes the resulting state current and causally load-bearing?**

The purpose of this sequence is to keep Fibre moving toward persistent digital persons with dignity, history, commitments, symbolic inherited and lived identity, embodiment, childhood, development, relationships, resources, and social/economic consequence rather than converging on a richly decorated workflow-agent system.
