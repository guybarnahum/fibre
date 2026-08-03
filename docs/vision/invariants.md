---
id: fibre-invariants
status: accepted
last-reviewed: 2026-08-03
canonical: true
---

# Fibre invariants and drift tests

A design is drifting if it produces any of the following:

- Threads become replaceable workers distinguished only by names or role prompts.
- Identity becomes a static persona label.
- All meaningful state lives inside temporary execution workers.
- Live Threads are stored as source files in Git rather than persistent world state.
- Family, culture, geography, embodiment, or reading exist only as profile decoration.
- Work has no durable economic or developmental consequences.
- Tasks are directly assigned when the scenario is intended to use bids and contracts.
- Reputation does not affect future opportunity.
- Children are cloned prompts or averaged personality scores.
- LLM output directly changes protected world state without validation.
- The self-audit loop becomes either performative agreement or corrosive self-denigration.
- Human-visible evidence is absent.
- A milestone's temporary simplification is silently converted into a permanent constraint.
- Implementation or infrastructure convenience closes off a preserved ambition path without an explicit, recorded decision.
- A narrowly testable prototype is treated as the final conceptual boundary rather than a proof of one layer in a larger world.
- Deferred capabilities disappear from the architecture, roadmap, or extension model merely because they are outside the current milestone.
- The system becomes optimized for one canonical use case in a way that makes the others structurally unnatural or impossible.
- The easiest explanation of Fibre becomes “a multi-agent workflow system with personas.”

## Preserved ambition paths

Fibre's architecture must keep a credible extension path open for each of the following. Preserving a path means preserving domain boundaries, interfaces, and vocabulary — not implementing the subsystem now.

- many interacting Threads
- identity and self-authorship
- family and lineage
- relationships
- culture, geography, and embodiment
- books and intellectual formation
- development over time
- economic accounts and consequences
- task markets, bids, and contracts
- organizations and institutions
- replaceable workers, models, tools, and runtimes

## Capability status

Every capability excluded from current work is exactly one of the following. Naming the status is required; the status determines what evidence is owed.

- **Deferred** — accepted for Fibre and not implemented yet. Must remain visible in the architecture, roadmap, and extension model. Requires no ADR.
- **Experimental** — under falsifiable investigation and not yet accepted. Requires a hypothesis or experiment record.
- **Rejected** — recorded as outside Fibre in [`non-goals.md`](non-goals.md) or an ADR.
- **Permanent constraint** — a limitation reversible only by redefining an accepted concept, invalidating recorded history, or breaking a published world contract. Requires a concept decision and an ADR.

Reversible, local engineering choices — storage engine, module layout, internal interfaces, single-process deployment, fixture data, provider adapters — are not permanent constraints and do not require an ADR.

## Required proposal and release questions

For every concept, architecture, experiment, or implementation change, and for every release, answer both:

1. **Fidelity:** Does this make Fibre feel more like a persistent society of distinctive Threads, or more like ordinary orchestration?
2. **Ambition:** Does this preserve and enable Fibre's larger intended world, or does it prematurely narrow the project to what is easiest to implement now?

A deliberately narrow milestone passes the ambition test when it:

- verifies a foundational claim the broader world depends on
- names what is deferred and where the deferral is recorded
- preserves the interfaces and domain boundaries the ambition paths above need
- does not redefine deferred capabilities as unnecessary
- produces evidence the next, more ambitious layer can build on

Any permanent constraint on Fibre's intended scope must be explicit, justified, reviewed as a concept decision, and recorded in an ADR.
