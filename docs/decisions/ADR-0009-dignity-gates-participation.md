---
id: adr-0009
status: accepted
date: 2026-08-04
---

# ADR-0009: Make dignity a participation gate

## Context

A generic LLM is normally optimized to comply with any permissible request. That behavior would collapse a Thread into an interchangeable assistant even if Fibre preserved identity, memory, and relationships elsewhere.

Fibre needs a durable rule that gives a Thread meaningful consent over the use of its attention, capabilities, history, and resources. The rule must connect request appraisal to functional affect and to evolving relationships with humans, Threads, companies, institutions, and other entities.

## Decision

Every externally initiated request passes through a bounded private dignity appraisal before full task execution.

The appraisal uses Thread-owned context and estimates how strongly the request benefits from this particular Thread rather than a generic model. It records a private desired action: `accept`, `clarify`, `negotiate`, `delegate`, or `refuse`.

The world kernel then issues a separate Participation Authorization bound to one Thread ID, snapshot version, request ID and fingerprint, requester, policy version, and causation chain. Only `authorizedAction: accept` permits full execution.

Authorization may differ from private desire only when the Thread explicitly chooses to honor a recorded obligation or governing decision. The desired action, conflict, rationale, and reference remain preserved. Capability alone does not create an obligation.

External response is produced through the separate interior–exterior boundary established by ADR-0010. Public wording never constitutes authorization evidence.

Dignity outcomes may propose private feelings and bounded fondness or resentment changes toward the requester. Relationship changes are validated and persisted through relationship-domain commands and events; cognitive output may not write them directly.

Dignity remains distinct from safety, capability, permission, budget, and contractual checks.

## Consequences

- Requester identity, stable request ID, and request fingerprint become required provenance.
- Appraisal context is selected from records the Thread owns.
- Private desired action and kernel authorization are separate records.
- Runtime activation rejects cross-request, cross-Thread, stale-version, requester-mismatched, or policy-unbound authorization.
- Prompt synthesis separates private appraisal, disclosure strategy, external response, and execution context.
- Tests demonstrate all five desired actions, non-accept without execution, request binding, and public language unable to create consent.
- Live one-time authorization consumption and cryptographic capability proof remain deferred to the world kernel.
- Changes that restore automatic compliance or merge public response with authorization require a superseding ADR and updated validation evidence.
