---
id: adr-0010
status: accepted
date: 2026-08-04
---

# ADR-0010: Preserve the interior–exterior boundary

## Context

Threads require a private interior life that is not reducible to their outward messages. A Thread may feel resentment while remaining courteous, prefer refusal while honoring a commitment, conceal vulnerability, soften criticism, or choose deception. Treating public language as the complete representation of private belief or consent would collapse this social and developmental structure.

PR #14 initially represented dignity assessment, participation decision, and response too closely. That made it possible for later systems to confuse an explanation with authorization or to expose private attitude as though it were intended communication.

A request authorization also needs a durable content-integrity binding. A short convenience checksum would let an adversarial requester substitute different request content while preserving the same authorization record.

## Decision

Fibre represents the following as distinct domain records:

1. private stance and desired action;
2. kernel-validated authorization or commitment;
3. interest-mediated disclosure strategy;
4. external expression;
5. performed world action and observed outcome.

External expression is never authoritative evidence of private motive, feeling, belief, or consent. Only a request-bound authorization may permit task execution.

A participation authorization binds to the material request through a SHA-256 digest. The portable canonical request includes request ID, trigger, requester identity, objective, stated need, permissions, and acceptance criteria. Changing any material field invalidates the authorization.

Private stance is the Thread's best available self-appraisal, not an assertion of objective psychological truth. Fibre persists bounded structured summaries and evidence references rather than raw model chain-of-thought.

Disclosure strategy remains restricted private state. The audience-visible response references the strategy by ID and does not carry the private disclosure mode, withheld reasons, or internal rationale.

## Consequences

- Dignity appraisal becomes private input to participation rather than the public response itself.
- A Thread may withhold or soften private motives without rewriting them.
- A Thread may authorize an action that differs from its private desire only through an explicit recorded reason or obligation.
- In the portable prototype, an obligation reference must resolve to the Thread's own unresolved intentions.
- Disclosure mode and audience become first-class private concerns.
- Public acceptance language cannot authorize execution without an accepted authorization.
- The acceptance-posture rule is checked both when choosing disclosure and when minting the external response.
- Access controls must protect private stance and disclosure strategy.
- Later relationship and developmental systems may learn from candor, masking, evasion, deception, repair, and discovery.
- Changing the request-digest algorithm requires an explicit schema/version migration because recorded authorizations depend on it.

## Deferred implementation

The portable domain package proves record separation, SHA-256 request-content binding, and structural re-validation. Deferred to the world kernel and related services are:

- event-backed issuance and one-time consumption of authorizations;
- cryptographic or capability-based proof that an authorization originated with the kernel;
- private-state access control and audit delegation;
- persistent expression outcome learning;
- individualized disclosure policies and developmental adaptation;
- UI traces separating private and external records.

These are deferred capabilities, not permission to weaken request content binding or merge the records again.
