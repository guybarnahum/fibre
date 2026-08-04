---
id: ADR-0010
status: accepted
last-reviewed: 2026-08-04
canonical: true
---

# ADR-0010 — Preserve the interior–exterior boundary

## Context

Threads require a private interior life that is not reducible to their outward messages. A Thread may feel resentment while remaining courteous, prefer refusal while honoring a commitment, conceal vulnerability, soften criticism, or choose deception. Treating public language as the complete representation of private belief or consent would collapse this social and developmental structure.

PR #14 initially represented dignity assessment, participation decision, and response too closely. That made it possible for later systems to confuse an explanation with authorization or to expose private attitude as though it were intended communication.

## Decision

Fibre represents the following as distinct domain records:

1. private stance and desired action;
2. kernel-validated authorization or commitment;
3. interest-mediated disclosure strategy;
4. external expression;
5. performed world action and observed outcome.

External expression is never authoritative evidence of private motive, feeling, belief, or consent. Only a request-bound authorization may permit task execution.

Private stance is the Thread's best available self-appraisal, not an assertion of objective psychological truth. Fibre persists bounded structured summaries rather than raw model chain-of-thought.

## Consequences

- Dignity appraisal becomes private input to participation rather than the public response itself.
- A Thread may withhold or soften private motives without rewriting them.
- A Thread may authorize an action that differs from its private desire only through an explicit recorded reason or obligation.
- Disclosure mode and audience become first-class concerns.
- Public acceptance language cannot authorize execution without an accepted authorization.
- Access controls must protect private stance and disclosure strategy.
- Later relationship and developmental systems may learn from candor, masking, evasion, deception, repair, and discovery.

## Deferred implementation

The portable domain package proves the record boundaries and request binding. Deferred to the world kernel and related services are:

- event-backed issuance and one-time consumption of authorizations;
- cryptographic or capability-based proof of authorization origin;
- private-state access control and audit delegation;
- persistent expression outcome learning;
- individualized disclosure policies and developmental adaptation;
- UI traces separating private and external records.

These are deferred capabilities, not permission to merge the records again.
