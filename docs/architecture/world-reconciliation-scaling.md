---
id: architecture-world-reconciliation-scaling
status: proposed
last-reviewed: 2026-10-08
canonical: true
---

# World reconciliation scaling — proposed plan

## Problem and invariant

Fibre currently has a **single World state/scheduler scope** backed by one named Cloudflare Durable Object, with an event-driven reconciliation pass that processes bounded work for lived boundaries, environmental opportunities, delayed consolidation and contact. This keeps World authority coherent and resource use sparse, but the pass awaits model-backed operations in sequence. A growing population can accumulate overdue work faster than one serial worker can clear it.

A *capacity illustration*, not a measurement: ten model calls per Thread per day at five seconds of waiting each would demand about 1.4, 13.9 and 139 hours of serial model-wait time per day for 100, 1,000 and 10,000 active Threads respectively. Actual calls/latency/overlap must be measured before choosing a new runtime shape.

**Invariant:** a Thread's LivedNow remains a World-authored fact, not a process-local simulation; one genuine physical happening retains a single objective authority even when observed by many Threads. Freeze, recall, consent, attention and event-time history must not depend on which provider or partition handled a wake.

## Capacity plan

1. **Measure the existing queue first.** Use [World cost accounting](world-cost-accounting.md) to observe indexed due-frontier depth, due-to-start lag, per-pass processing duration, inference wait, actual wake throughput, failures, retries, and how many distinct Threads/venues earn work. Avoid predicting bottlenecks from population size alone.
2. **Define a useful trigger for action.** A sustained increase in due-to-start lag, missed meaningful boundaries or failure to drain admitted work is the reason to partition. Quiet populations with low earned work must remain cheap. Record a target freshness/latency appropriate to lived-time semantics before implementation.
3. **Keep one authority contract, permit independent execution.** Sketch provider-neutral ownership for per-Thread next-life and private-attention frontiers, while separately serializing truly shared-place objective occurrences under an authoritative venue/event key. Partition only *independent earned work*; keep a single event identity and immutable participant-specific observation links.
4. **Preserve cross-partition causality.** A moved Thread cannot leave two authoritative CurrentSituations, shared-place occurrence must not duplicate across simultaneous producers, a witness must have a real situated perception opportunity, and a replay must not reissue experience, memory, settlement or action. Work transfer follows authoritative CAS/claim semantics, not duplicated clock ownership or an eventually reconciled pair of competing Worlds.
5. **Implement the minimum needed at the measured limit.** Retain `InfraDriver` state/scheduler capabilities for local/cloud portability; allow batched indexed wake dispatch or partitioned actors only if evidence requires it. Favor sparse next-deadline work, bounded in-flight cognition and no population scan. Do not create one permanently running worker per Thread/site, a periodic global tick, an event bus or a generic distributed workflow engine merely to look scalable.

## Acceptance

- Under a reproducible bounded workload of independent due Threads, overdue lag stays within the declared lived-time objective without one slow model call holding unrelated lives indefinitely.
- Concurrent witnesses can still cite **one** admitted shared World occurrence; their individual `noticed | not_noticed` outcomes and consolidation remain separately owned and exactly once.
- Reconciliation survives a worker interruption/replay and preserves a single objective plan/situation history per Thread. Comparatively quiet Threads/sites cause no wake storm.
- Resource use is proportional to **earned** life/World/social work, not the total population or number of logical places; report actual throughput and marginal provider usage.

**Timing:** architectural option is recorded now, but **implementation is conditional on measured backlog pressure**, after the current scheduled E7.5 alarm is observed and the first cost/latency baseline exists. See [World compute optimization](world-compute-optimization.md); avoid scaling waste before removing it.
