---
id: fibre-invariants
status: accepted
last-reviewed: 2026-08-04
canonical: true
---

# Fibre invariants and drift tests

A design is drifting if it produces any of the following:

- Threads become replaceable workers distinguished only by names or role prompts.
- Identity becomes a static persona label.
- A Thread automatically complies with every request that is safe and technically feasible.
- Dignity becomes a decorative score that does not affect participation or relationship state.
- Request appraisal ignores the Thread's individualized advantage, the requester's need, Thread-owned relationship history, participation terms, or recorded obligations.
- Clarification, negotiation, delegation, and refusal exist in prose but the runtime begins the requested task anyway.
- A low-dignity acceptance proposal reaches authorization or execution.
- An authorization can be replayed against different request content, another requester, another Thread, or a stale Thread version.
- A request digest is too narrow to function as an adversarial integrity binding or omits a material request field.
- A caller-authored or blank obligation reference can override the Thread's private desire.
- An authorization override is not revalidated at the execution boundary.
- Public wording is treated as consent or authorization evidence.
- An audience-visible response carries restricted disclosure mode, withheld reasons, or private rationale.
- Acceptance posture is checked when choosing disclosure but not when minting the external response.
- The same record represents private stance, authorization, disclosure strategy, and external response.
- A disclosure strategy can be paired with a stale or different private stance.
- Public explanations are treated as complete and authoritative representations of private feelings, beliefs, motives, attitudes, or consent.
- Private resentment, fear, vulnerability, or strategic reasoning is automatically exposed to the entity it concerns.
- External communication overwrites or sanitizes the Thread's prior private state.
- Interest mediation silently changes permissions, commitments, authorization, or performed action.
- Runtime context selection can inject records the Thread does not own, or narrowing leaves no included/excluded trace.
- Low-dignity interactions cannot influence functional affect or future relationships.
- Fondness or resentment changes without attributable evidence, bounded deltas, or validated relationship events.
- A company or institution can hide behind stateless requests so repeated disrespect never affects the Thread's attitude toward it.
- All meaningful state lives inside temporary execution workers.
- Live Threads are stored as source files in Git rather than persistent world state.
- Generated artifacts or symlinked sources can overwrite canonical documents or leak files outside the repository boundary.
- Family, culture, geography, embodiment, or reading exist only as profile decoration.
- Work has no durable economic or developmental consequences.
- Tasks are directly assigned when the scenario is intended to use bids and contracts.
- Reputation does not affect future opportunity.
- Children are cloned prompts or averaged personality scores.
- LLM output directly changes protected world state without validation.
- The self-audit loop becomes either performative agreement or corrosive self-denigration.
- Human-visible evidence is absent.
- A passing test count is cited as evidence while accepted negative properties can be removed without test failure.
- A milestone's temporary simplification is silently converted into a permanent constraint.
- Implementation or infrastructure convenience closes off a preserved ambition path irreversibly, without a decision recorded in an ADR.
- A narrowly testable prototype is treated as the final conceptual boundary rather than a proof of one layer in a larger world.
- Deferred capabilities disappear from every durable record — architecture documents, roadmap, and milestone contract — merely because they are outside the current milestone.
- The system becomes optimized for one canonical use case in a way that makes the others structurally unnatural or impossible.
- The easiest explanation of Fibre becomes “a multi-agent workflow system with personas.”

## Preserved ambition paths

Fibre's architecture must keep a credible extension path open for each of the following. Preserving a path means preserving domain boundaries, domain vocabulary, and the contracts between domains — not implementing the subsystem now.

- many interacting Threads
- identity and self-authorship
- dignity, consent, and meaningful refusal
- interiority, privacy, interest mediation, and audience-specific expression
- family and lineage
- relationships, including persistent fondness and resentment
- culture, geography, and embodiment
- books and intellectual formation
- development over time
- economic accounts and consequences
- task markets, bids, and contracts
- organizations and institutions
- multiple concurrent workers, models, tools, and runtime systems

## Capability status

A capability a change deliberately excludes is exactly one of the following. Naming the status is required; the status determines what evidence is owed.

- **Deferred** — accepted for Fibre and not implemented yet. Must stay visible in at least one durable place: `docs/architecture/`, [`prototype-roadmap.md`](../validation/prototype-roadmap.md), or the milestone contract that defers it. Requires no ADR.
- **Experimental** — under falsifiable investigation and not yet accepted. Requires a hypothesis or an entry under `experiments/`.
- **Rejected** — outside Fibre itself, not merely outside the current milestone. Requires an ADR, or a non-goal that is scoped to Fibre rather than to a prototype stage. Note that [`non-goals.md`](non-goals.md) is scoped to the initial prototype and includes sequencing deferrals; a non-goal listed there is not automatically a rejection.
- **Permanent constraint** — a limitation reversible only by redefining an accepted concept, invalidating recorded history, or breaking a schema or event contract other components depend on. Requires a concept decision and an ADR.

Reversible, local engineering choices — storage engine, module layout, interfaces internal to one domain boundary, single-process deployment, fixture data, provider adapters — are not permanent constraints and do not require an ADR.

## Required proposal and release questions

For every change the **Vision and ambition guard** in [`AGENTS.md`](../../AGENTS.md) covers, and for every release, answer both:

1. **Fidelity:** Does this make Fibre feel more like a persistent society of distinctive Threads, or more like ordinary orchestration?
2. **Ambition:** Does this preserve and enable Fibre's larger intended world, or does it prematurely narrow the project to what is easiest to implement now?

A deliberately narrow milestone passes the ambition test when it:

- verifies a foundational claim the broader world depends on
- names what is deferred and where the deferral is recorded
- preserves the domain boundaries and cross-domain contracts the ambition paths above need
- does not redefine deferred capabilities as unnecessary
- produces evidence the next, more ambitious layer can build on

Any permanent constraint on Fibre's intended scope must be explicit, justified, reviewed as a concept decision, and recorded in an ADR. A permanent constraint that closes a preserved ambition path should be refused and redesigned rather than documented, unless the owner accepts the reduction as a concept decision.
