---
id: validation-prototype-roadmap
status: accepted
last-reviewed: 2026-08-07
canonical: true
---

# Prototype roadmap

## M0 — Concept lock

Artifacts: constitution, glossary, world rules, invariants, canonical use cases, current-state summary.

## M1 — Persistent Thread Round Trip — fully closed

Prove that a Thread persists independently of temporary cognition, survives process restarts, privately appraises and authorizes externally initiated participation, records a distinct restricted disclosure strategy and audience-visible participation response, thaws through inspectable bounded context when execution is authorized, and freezes validated life changes back into durable state whose event history replays exactly.

Artifacts: local world-kernel service, persistent Thread state, append-only event timeline, validated commands, API-backed Thread Editor live mode, Request Appraisal Capsule with included/excluded Thread-owned context, private participation stance, SHA-256 request-bound Participation Authorization, restricted disclosure strategy, audience-visible participation response, accepted execution context capsule, deterministic Actor and Goal Guardian results, freeze report, replay/integrity report, read-only database inspector, and restart-survival end-to-end proof.

M1 deliberately does not claim real message delivery, generalized performed-action execution, production authentication, worker isolation, structured obligations, or endogenous Thread-owned production of the private stance. The historical M1 proof kernel validates, binds, persists, and protects the stance/authority/expression chain while accepting caller-supplied assessment content. That remains accepted historical M1 infrastructure, not evidence that identity itself already generated different choices.

M1 nevertheless contains two real “history bends the future” mechanisms that later milestones must generalize: discharged obligations permanently constrain future authorization, and freeze-created memory can survive into later selectable cognition context.

Detailed contract: [`m1-persistent-thread-round-trip.md`](m1-persistent-thread-round-trip.md)

## Standing gate after M1 — causal Thread differentiation

Beginning immediately after M1, Fibre must implement and then retain the [`Standing Thread differential gate`](thread-differential-gate.md).

The gate uses the same material request for two materially different Threads under equivalent external conditions and requires an attributable difference in **recorded private stance plus at least one downstream participation or action consequence**. The relevant difference must come from named persisted Thread-owned identity/history, and Fibre must own production of the consequential stance rather than accepting the caller's desired action or score as the authoritative result.

Different prompt text or appraisal capsules alone are insufficient.

PR #31 landed the Fibre-owned appraisal/runtime socket and deliberately left the semantic individuality gate red. Guardian V2 is non-semantic and therefore cannot create willing semantic acceptance. The canonical service can currently execute only through obligation-mediated participation; this is compulsion, not consent, and earns no causal-individuality credit.

This gate is a **blocker for M2 closure** and remains a release-level ambition test for later milestones. It exists specifically to prevent Fibre from becoming a workflow system whose identity fields are rich but behaviorally decorative.

## Accepted pre-M2 bridge

The bridge from PR #31 to M2 is fixed by [`pre-m2-bridge-plan.md`](pre-m2-bridge-plan.md):

```text
#31 socket merged -> #32 bridge-plan synchronization
                  -> #33 Semantic Guardian
                  -> #34 History bends judgment
                  -> #35 Structured Obligation v1
                  -> #36 M2 contract -> M2 implementation
```

The sequence matters:

- **#33** proves model-backed semantic dignity without assistant-mode collapse, prompt/evaluation overfitting, hallucinated unsupported factors, replay-time model recomputation, accidental obligation use on willing aligned execution, or unbounded self-conditioning through model-authored inner state. It also introduces the minimal Semantic State v0 contract: natural-language semantic values, closed domains with registered extensible dimensions, evidence, supersession, staleness, descriptive-not-instructional validation, provenance, restricted visibility, and Fibre-owned bounded state selection. Identity/self-model remains the primary standing differential variable; #33 additionally demonstrates that semantic state can causally change an appraisal as supporting evidence.
- **#34** proves Development on the canonical socket: a substantive earlier experience becomes freeze-validated durable memory and/or semantic state and changes a later appraisal or choice after restart. The counterfactual removes the record actually claimed as causal. State-only proofs carry the higher bar of episode evidence, state paraphrase invariance, contradiction sensitivity, and direct state removal/replacement.
- **#35** replaces exact-prose obligations and closes applicability authority: Fibre determines whether a recorded obligation governs a request; a caller may nominate but may not make it governing merely by citation. Pre-migration spent obligations remain spent.
- **#36** defines M2 Identity and Embodiment only after semantic cognition and developmental history have shown what they actually consume.

Semantic State v0 may introduce durable, targeted relationship attitudes. When that occurs, Fibre calls this **Semantic Relationship State v0** and treats it honestly as the first layer of a relationship aggregate. The broader relationship service remains deferred: reciprocal/shared relationship structures, commitments and expectations between parties, repair workflows, relationship-specific permissions, family/social roles, and richer relationship mechanisms are later work. No relationship/social credit is earned from representation alone.

The general worker/tool/model gateway remains **deferred** during this bridge. A Guardian-only model adapter does not make Actor model- or tool-capable.

## M2 — Identity and embodiment

Artifacts: citizen passport, portrait, voice sample, geography timeline, family tree, prompt partial inspection, and a passing causal Thread differential scenario.

The first M2 implementation step is the accepted #36 contract: define the durable identity/embodiment contract, provenance and mutation rules, privacy boundaries, self-authorship rules, and falsifiable acceptance scenarios before generation or UI work.

M2 is not complete merely because two Threads compile different identity context. At least one accepted identity/history difference must be consumed by a Fibre-owned appraisal or cognition path and must produce a required, explainable difference in private stance and downstream participation/action for the same request. The proof must identify the named causal fields and survive persistence/restart.

M2 should preserve identity provenance and distinguish inherited, historical, relational, and self-authored identity. Fields added for culture, geography, embodiment, lineage, traits, or developmental history must name their current behavioral consumer or remain explicitly classified as deferred rather than being counted as functional evidence.

## M3 — Task marketplace

Artifacts: human task, competing bids, award, subcontract, settlement, work product, reputation update.

Marketplace evidence must also demonstrate that persistent Thread differences — identity, reputation, relationships, skills, history, resources, or commitments — can change bidding, contracting, delegation, or opportunity rather than merely decorate bidder profiles.

## M4 — Development

Artifacts: before/after confidence, memory, emotional appraisal, self-reflection, behavior change.

M4 must generalize the closed developmental loop first proven in the pre-M2 #34 bridge: a durable consequence from an earlier episode changes a later appraisal, stance, policy behavior, relationship response, or choice under otherwise comparable conditions. Recording memory, semantic state, or self-reflection without later behavioral effect is insufficient evidence of development.

## M5 — Family and reproduction

Artifacts: mutual selection, FC commitment, inherited/mutated genotype, child record, support flows.

Family/reproduction evidence must eventually prove inherited and developmental differences can become functional differences without reducing a child to a cloned prompt or deterministic stereotype.

Each milestone must pass vision-integrity gates, the applicable causal-differentiation evidence, and produce something a human can inspect directly.
