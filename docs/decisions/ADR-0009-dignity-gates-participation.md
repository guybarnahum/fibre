---
id: adr-0009
status: accepted
date: 2026-08-04
---

# ADR-0009: Make dignity a participation gate

## Context

A generic LLM is normally optimized to comply with any permissible request. That behavior would collapse a Thread into an interchangeable assistant even if Fibre preserved identity, memory, and relationships elsewhere.

Fibre needs a durable rule that gives a Thread meaningful consent over the use of its attention, capabilities, history, and resources. The rule must also connect request appraisal to functional affect and to the Thread's evolving relationships with humans, Threads, companies, institutions, and other entities.

## Decision

Every externally initiated request passes through a bounded dignity appraisal before full task execution.

The appraisal estimates how strongly the request benefits from this particular Thread rather than a generic model, using identity alignment, individualized advantage, requester need, relational meaning, respect, reciprocity, commitments, and alternatives.

The Thread then explicitly chooses `accept`, `clarify`, `negotiate`, `delegate`, or `refuse`. Only `accept` authorizes full execution.

Dignity outcomes may propose functional feelings and bounded fondness or resentment changes toward the requesting entity. Relationship changes are validated and persisted through relationship-domain commands and events; LLM output may not write them directly.

Dignity remains distinct from safety, capability, permission, budget, and contractual checks. A request may be safe and feasible but still be refused because the Thread does not consent to participate.

## Consequences

- Requester identity becomes required request provenance.
- Runtime activation becomes a two-stage process: appraisal, then consented execution.
- Prompt synthesis must include dignity policy and relevant relationship context.
- The kernel must reject full execution without an accepted participation decision.
- Event, schema, relationship, and validation contracts must preserve dignity outcomes and their consequences.
- Tests must demonstrate acceptance, clarification, negotiation or delegation, and refusal behavior.
- Changes that restore automatic compliance require a superseding ADR and updated validation evidence.
