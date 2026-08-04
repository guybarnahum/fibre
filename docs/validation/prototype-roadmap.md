---
id: validation-prototype-roadmap
status: accepted
last-reviewed: 2026-08-04
canonical: true
---

# Prototype roadmap

## M0 — Concept lock

Artifacts: constitution, glossary, world rules, invariants, canonical use cases, current-state summary.

## M1 — Persistent Thread Round Trip

Prove that a Thread persists independently of temporary cognition, survives process restarts, privately appraises and authorizes externally initiated participation, thaws through inspectable bounded context, and freezes validated life changes back into durable state whose event history replays exactly.

Artifacts: local world-kernel service, persistent Thread state, append-only event timeline, validated commands, API-backed Thread Editor live mode, Request Appraisal Capsule with included/excluded Thread-owned context, private participation stance, SHA-256 request-bound Participation Authorization, restricted disclosure strategy, audience-visible external response, accepted execution context capsule, deterministic Actor and Goal Guardian results, freeze report, replay/integrity report, and restart-survival end-to-end test.

Deferred infrastructure choices include production cloud deployment, high-availability, and multi-region operation.

Detailed contract: [`m1-persistent-thread-round-trip.md`](m1-persistent-thread-round-trip.md)

## M2 — Identity and embodiment

Artifacts: citizen passport, portrait, voice sample, geography timeline, family tree, prompt partial inspection.

## M3 — Task marketplace

Artifacts: human task, competing bids, award, subcontract, settlement, work product, reputation update.

## M4 — Development

Artifacts: before/after confidence, memory, emotional appraisal, self-reflection, behavior change.

## M5 — Family and reproduction

Artifacts: mutual selection, FC commitment, inherited/mutated genotype, child record, support flows.

Each milestone must pass vision-integrity gates and produce something a human can inspect directly.
