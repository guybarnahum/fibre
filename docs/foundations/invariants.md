---
id: fibre-invariants
status: accepted
last-reviewed: 2026-08-18
canonical: true
---

# Fibre invariants and drift tests

A design is drifting if it produces any of the following:

- Threads become replaceable workers distinguished only by names or role prompts.
- Identity becomes a static persona label.
- Thread-owned identity, genome, history, relationships, needs, culture, geography, embodiment, or development are persisted and inspectable but have no causal path to a different appraisal, stance, term, authorization, action, relationship state, opportunity, or resource consequence.
- A caller, fixture, or test authors the consequential private judgment — score, desired action, factors, feelings, or outcome — while Fibre only validates and stores it, but the result is described as Thread-owned agency.
- A Fibre-computed mechanical condition, runtime parameter, or substrate mechanism is rendered to cognition as a semantic need, emotion, value, meaning, explanation, or self-knowledge and then described as Thread-owned interiority.
- A hidden mechanical/substrate mechanism causally affects cognition or episode initiation without a versioned/replayable computation, durable input/causation witness, bounded policy, inspectable effect, and falsifiable ablation path.
- A mechanical/substrate mechanism is cited as evidence for an identity, memory, meaning, character, need, emotion, or value claim, or is used to promote a field/domain's causal-status classification.
- Two materially different Threads can receive the same material request under the same external conditions and Fibre has no mechanism by which those Thread-owned differences can make them choose differently when the accepted concepts say they should.
- A milestone treats different prompt or capsule contents as sufficient proof of non-interchangeability without requiring any attributable behavioral or future-state consequence.
- History is remembered but cannot bend a later appraisal, authority decision, relationship, opportunity, resource state, or action.
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
- **endogenous motivation: mechanical conditions, bounded modulation, and Thread-authored interpretation of lived effects**
- economic accounts and consequences
- task markets, bids, and contracts
- organizations and institutions
- multiple concurrent workers, models, tools, and runtime systems

## Vision-effectiveness adversarial review

Unless a review is explicitly scoped as a security, abuse, threat-model, or red-team exercise, **adversarial review in Fibre means trying to falsify the effectiveness of the implementation in advancing the Thread vision**.

The reviewer should not stop at “is the record durable?”, “is the schema validated?”, “is the route protected?”, or “does the prompt contain identity?”. Those questions matter, but they can all pass while Fibre remains ordinary orchestration with elaborate persona metadata.

The primary review question is:

> **What difference does this Thread-owned difference make?**

A strong Fibre mechanism creates or strengthens a causal chain such as:

```text
Thread-owned identity / history / relationship / need / obligation
  -> selected evidence or context
  -> Thread-owned appraisal or choice
  -> authorization / terms / expression / action
  -> durable consequence
  -> changed future possibility
```

Not every pull request must span that entire chain. A foundational PR may legitimately build one socket or invariant. But a milestone must not claim that identity, dignity, relationship, development, or personhood has become functional merely because a new record can be stored, hashed, injected into a prompt, or displayed in the editor.

Mechanical/substrate causality is a different evidence discipline: it may be externally attributable through exact computation witnesses and ablation while remaining structurally unavailable as Thread semantic evidence. Its effect cannot substitute for the Thread-owned causal chain above and cannot by itself earn identity, interiority, or personhood standing.

Security review remains important where the threat model calls for it. It is a separate lens, not the default meaning of “adversarial” for Fibre development.

## Standing Thread differential gate

Fibre must maintain a falsifiable differential scenario that proves **causal non-interchangeability**, not just representational difference. The accepted contract is [`thread-differential-gate.md`](../validation/thread-differential-gate.md).

The gate becomes mandatory before M2 can close and remains a standing ambition gate thereafter. At minimum it must prove:

1. the **same material external request** is presented under equivalent external conditions to two Threads;
2. the Threads differ materially in named, persisted, Thread-owned identity and/or history fields relevant to the request;
3. Fibre owns the production of the consequential appraisal/stance for the scenario — the caller requests appraisal but does not author the authoritative score, desired action, factors, or final stance;
4. the recorded private stances **diverge in a required and explainable way**;
5. at least one downstream participation or action consequence also diverges;
6. the evidence identifies which named Thread-owned fields and prior records caused the divergence;
7. a counterfactual or mutation that removes/swaps the claimed cause changes or eliminates the divergence;
8. the result survives persistence/restart and is human-inspectable.

Different context capsules, different prompt text, different portraits, or different stored trait values do **not** satisfy this gate by themselves.

The first implementation may use a deterministic, versioned Dignity Guardian policy. That is a proof mechanism, not a permanent restriction on later model-based cognition. The permanent boundary is that the consequential judgment belongs to the Thread/Fibre process, not to the requester supplying a pre-authored stance.

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
3. **Causal individuality:** What Thread-owned difference can this work make consequential? If it only changes representation or context today, is that limitation explicitly named rather than counted as functional individuality?

A deliberately narrow milestone passes the ambition test when it:

- verifies a foundational claim the broader world depends on
- names what is deferred and where the deferral is recorded
- preserves the domain boundaries and cross-domain contracts the ambition paths above need
- does not redefine deferred capabilities as unnecessary
- produces evidence the next, more ambitious layer can build on
- does not claim functional individuality, dignity, relationship, or development without a causal downstream consequence

Any permanent constraint on Fibre's intended scope must be explicit, justified, reviewed as a concept decision, and recorded in an ADR. A permanent constraint that closes a preserved ambition path should be refused and redesigned rather than documented, unless the owner accepts the reduction as a concept decision.
