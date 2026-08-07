---
id: validation-prototype-roadmap
status: accepted
last-reviewed: 2026-08-06
canonical: true
---

# Prototype roadmap

## M0 — Concept lock

Artifacts: constitution, glossary, world rules, invariants, canonical use cases, current-state summary.

## M1 — Persistent Thread Round Trip — fully closed

Prove that a Thread persists independently of temporary cognition, survives process restarts, privately appraises and authorizes externally initiated participation, records a distinct restricted disclosure strategy and audience-visible participation response, thaws through inspectable bounded context when execution is authorized, and freezes validated life changes back into durable state whose event history replays exactly.

Artifacts: local world-kernel service, persistent Thread state, append-only event timeline, validated commands, API-backed Thread Editor live mode, Request Appraisal Capsule with included/excluded Thread-owned context, private participation stance, SHA-256 request-bound Participation Authorization, restricted disclosure strategy, audience-visible participation response, accepted execution context capsule, deterministic Actor and Goal Guardian results, freeze report, replay/integrity report, read-only database inspector, and restart-survival end-to-end proof.

M1 deliberately does not claim real message delivery, generalized performed-action execution, production authentication, worker isolation, structured obligations, or endogenous Thread-owned production of the private stance. The M1 kernel validates, binds, persists, and protects the stance/authority/expression chain, but its current `recordPrivateStance` boundary accepts an assessment payload whose score, proposed action, factors, feelings, and motives are supplied by the caller. That is accepted M1 infrastructure, not evidence that identity itself already generates different choices.

M1 nevertheless contains two real “history bends the future” loops that later milestones must generalize: discharged obligations permanently constrain future authorization, and freeze-created memory can be selected into later cognition context.

Detailed contract: [`m1-persistent-thread-round-trip.md`](m1-persistent-thread-round-trip.md)

## Standing gate after M1 — causal Thread differentiation

Beginning immediately after M1, Fibre must implement and then retain the [`Standing Thread differential gate`](thread-differential-gate.md).

The gate uses the same material request for two materially different Threads under equivalent external conditions and requires an attributable difference in **recorded private stance plus at least one downstream participation or action consequence**. The relevant difference must come from named persisted Thread-owned identity/history, and Fibre must own production of the consequential stance rather than accepting the caller's desired action or score as the authoritative result.

Different prompt text or appraisal capsules alone are insufficient. The first implementation may use a deterministic, versioned Dignity Guardian policy; later model-based cognition may replace it without changing the ownership or evidence boundary.

This gate is a **blocker for M2 closure** and remains a release-level ambition test for later milestones. It exists specifically to prevent Fibre from becoming a workflow system whose identity fields are rich but behaviorally decorative.

## M2 — Identity and embodiment

Artifacts: citizen passport, portrait, voice sample, geography timeline, family tree, prompt partial inspection, and a passing causal Thread differential scenario.

The first M2 implementation step is to define the durable identity/embodiment contract, provenance and mutation rules, privacy boundaries, and falsifiable acceptance scenarios before generation or UI work.

M2 is not complete merely because two Threads compile different identity context. At least one accepted identity/history difference must be consumed by a Fibre-owned appraisal or cognition path and must produce a required, explainable difference in private stance and downstream participation/action for the same request. The proof must identify the named causal fields and survive persistence/restart.

M2 should preserve identity provenance and distinguish inherited, historical, relational, and self-authored identity. Fields added for culture, geography, embodiment, lineage, traits, or developmental history must name their current behavioral consumer or remain explicitly classified as deferred rather than being counted as functional evidence.

## M3 — Task marketplace

Artifacts: human task, competing bids, award, subcontract, settlement, work product, reputation update.

Marketplace evidence must also demonstrate that persistent Thread differences — identity, reputation, relationships, skills, history, resources, or commitments — can change bidding, contracting, delegation, or opportunity rather than merely decorate bidder profiles.

## M4 — Development

Artifacts: before/after confidence, memory, emotional appraisal, self-reflection, behavior change.

M4 must prove a closed developmental loop: a durable consequence from an earlier episode changes a later appraisal, stance, policy behavior, relationship response, or choice under otherwise comparable conditions. Recording a memory or self-reflection without later behavioral effect is insufficient evidence of development.

## M5 — Family and reproduction

Artifacts: mutual selection, FC commitment, inherited/mutated genotype, child record, support flows.

Family/reproduction evidence must eventually prove inherited and developmental differences can become functional differences without reducing a child to a cloned prompt or deterministic stereotype.

Each milestone must pass vision-integrity gates, the applicable causal-differentiation evidence, and produce something a human can inspect directly.
