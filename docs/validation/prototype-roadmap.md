---
id: validation-prototype-roadmap
status: accepted
last-reviewed: 2026-08-09
canonical: true
---

# Prototype roadmap

## M0 — Concept lock

Artifacts: constitution, glossary, world rules, invariants, canonical use cases, current-state summary.

## M1 — Persistent Thread Round Trip — fully closed

Prove that a Thread persists independently of temporary cognition, survives process restarts, privately appraises and authorizes externally initiated participation, records a distinct restricted disclosure strategy and audience-visible participation response, thaws through inspectable bounded context when execution is authorized, and freezes validated life changes back into durable state whose event history replays exactly.

Artifacts: local world-kernel service, persistent Thread state, append-only event timeline, validated commands, API-backed Thread Editor live mode, Request Appraisal Capsule with included/excluded Thread-owned context, private participation stance, SHA-256 request-bound Participation Authorization, restricted disclosure strategy, audience-visible participation response, accepted execution context capsule, deterministic Actor and Goal Guardian results, freeze report, replay/integrity report, read-only database inspector, and restart-survival end-to-end proof.

M1 deliberately does not claim real message delivery, generalized performed-action execution, production authentication, worker isolation, structured obligations, or endogenous Thread-owned production of the private stance. Historical M1 remains accepted infrastructure, not evidence that identity itself already generated different choices.

Detailed contract: [`m1-persistent-thread-round-trip.md`](m1-persistent-thread-round-trip.md)

## Standing gate after M1 — causal Thread differentiation

The [`Standing Thread differential gate`](thread-differential-gate.md) remains a release-level ambition test.

The same material request for materially different Threads under equivalent external conditions must produce an attributable difference in **recorded private stance plus at least one downstream participation or action consequence** from named persisted Thread-owned identity/history. Fibre must own production of the consequential stance.

Different prompt text or appraisal capsules alone are insufficient.

This gate is a blocker for M2 closure because it prevents Fibre from becoming a workflow system whose identity fields are rich but behaviorally decorative.

## Accepted pre-M2 bridge and refined M2 sequence

The accepted work order is defined by [`pre-m2-bridge-plan.md`](pre-m2-bridge-plan.md), with the detailed continuation plan in [`m2-pr-plan.md`](m2-pr-plan.md):

```text
#31 Fibre-owned appraisal/runtime socket              MERGED
#32 bridge-plan synchronization                       MERGED
#33 Semantic Guardian                                 EARNED / SEALED
#34 History bends judgment                            EARNED / SEALED / MERGED
#35 Structured Obligation v1                          ACTIVE / NEXT
#36 M2 Identity & Embodiment Contract
#37 Thread Passport & Identity Provenance v1
#38 Lineage, Geography & Embodiment v1
#39 Identity Projection & Causal Consumption
#40 M2 Standing Gate / M2 closure

#41 Self-authored Development v1
#42 Reciprocal Relationships v1
#43 Economic Consequence / M3 foundation
```

The sequence matters:

- **#33** established model-backed semantic dignity, Semantic State v0, Semantic Relationship State v0, and held-out causal semantic-state differentials.
- **#34** established limited Development: a durable Fibre-owned episode record survived restart and causally changed a later appraisal under exact one-memory withholding.
- **#35** replaces exact-prose obligations and closes applicability authority: Fibre determines whether a recorded obligation governs a request; caller citation alone cannot make it governing. Pre-migration spent obligations remain spent.
- **#36** defines the M2 Identity & Embodiment contract before implementation.
- **#37** implements durable passport and identity provenance/history.
- **#38** implements lineage, culture/geography timeline, portrait/voice provenance, privacy, and embodiment versioning.
- **#39** implements Fibre-owned bounded identity projection and causal consumption with exact evidence citation.
- **#40** closes M2 only through a frozen held-out standing gate proving stable attributable individuality.

Do not collapse #37-#40 into one monolithic “M2 implementation” PR.

Semantic Relationship State v0 remains only the first layer of a relationship aggregate. The broader reciprocal relationship service is #42, not something silently claimed by M2 representation.

The general worker/tool/model gateway remains deferred during the M2 sequence. A Guardian-only model adapter does not make Actor model- or tool-capable.

## M2 — Identity and embodiment

M2 is not “rich identity fields.”

M2 should establish a persistent individual whose identity has provenance, embodiment, history, stable behavioral character, and causal consequences independently of the temporary cognition implementation.

### M2 implementation artifacts

Across #36-#39, M2 should produce:

- durable Thread passport;
- identity provenance taxonomy and append-only/superseding identity history;
- inherited, historical, relational, externally attributed, and self-authored identity distinction;
- lineage/family references;
- culture and geography timeline;
- portrait and voice assets with generation/source/version provenance;
- privacy and visibility rules;
- bounded inspectable Identity Context Capsule;
- exact identity evidence references consumed by cognition;
- human-readable and machine-authoritative inspection.

Fields added for culture, geography, embodiment, lineage, traits, or developmental history must name their behavioral consumer or remain explicitly context-only/deferred.

### M2 closure gate — #40

M2 is not complete merely because two Threads compile different identity context.

The standing claim is:

> **Two Threads are behaviorally different because they are different persistent individuals, and the difference is attributable, stable, persistent, and inspectable.**

Under the same material request and equivalent external conditions, the gate must require repeated trials such that **between-Thread separation exceeds within-Thread variation**. One stochastic A/B difference is insufficient.

The gate should also require direct interventions on the claimed causal identity evidence:

```text
remove/replace claimed causal identity field
    -> predicted judgment changes

paraphrase same identity meaning
    -> judgment remains stable

contradict identity meaning
    -> predicted judgment changes
```

The proof must survive persistence/restart, preserve Fibre-owned selection, avoid requester leakage, identify exact causal evidence, and produce private-stance plus downstream consequence. Candidate freeze, held-out standing authorship, first-attempt sealing, committed evidence, and read-only post-seal inspection follow the accepted experiment lifecycle.

## Immediate post-M2 sequence

### #41 — Self-authored Development v1

Generalize #34 beyond requester-derived episode memory. Experience should be able to produce Thread-authored observation/reflection, emotional appraisal, expectation, or proposed self-model/state change whose later behavioral effect is causally demonstrated. Adverse/refused/compelled/failed experiences must eventually be representable without becoming an instruction-injection channel.

### #42 — Reciprocal Relationships v1

Add reciprocal/shared relationship structures, commitments and expectations, trust/fondness/resentment/repair, relationship-specific permissions, family/social roles, and relationship history that changes later choices.

### #43 — Economic Consequence / M3 foundation

Add durable budgets, contracts, settlement, reputation, and opportunity constraints so economic state changes future capability rather than merely recording cost. This is the foundation for the later task-marketplace vertical slice.

## M3 — Task marketplace

Artifacts: human task, competing bids, award, subcontract, settlement, work product, reputation update.

Marketplace evidence must demonstrate that persistent Thread differences — identity, reputation, relationships, skills, history, resources, or commitments — change bidding, contracting, delegation, or opportunity rather than merely decorating bidder profiles.

## M4 — Development

Artifacts: before/after confidence, memory, emotional appraisal, self-reflection, behavior change.

M4 generalizes the developmental loop first causally established in #34 and strengthened in #41: a durable consequence from an earlier episode changes a later appraisal, stance, policy behavior, relationship response, or choice under otherwise comparable conditions. Recording memory, semantic state, or reflection without later behavioral effect is insufficient.

## M5 — Family and reproduction

Artifacts: mutual selection, FC commitment, inherited/mutated genotype, child record, support flows.

Family/reproduction evidence must eventually prove inherited and developmental differences can become functional differences without reducing a child to a cloned prompt or deterministic stereotype.

Each milestone must pass vision-integrity gates, applicable causal-differentiation evidence, and produce something a human can inspect directly.
