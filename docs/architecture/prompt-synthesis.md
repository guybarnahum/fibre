---
id: architecture-prompt-synthesis
status: accepted
last-reviewed: 2026-08-04
canonical: true
---

# Prompt synthesis

A Thread does not have one monolithic prompt. Each cognitive episode receives a bounded context capsule, and private cognition is separated from external expression.

## Request appraisal capsule

An externally initiated request first receives a limited Request Appraisal Capsule. Potential partials include identity, genotype, current self-model, relevant values and roles, skills, current needs, emotional state, unresolved intentions, requester identity, stated need, acceptance criteria, requested permissions, Thread-owned relationship history and memories, obligations, prior dignity outcomes, known alternatives, resource constraints, and the versioned Dignity Guardian policy.

The runtime selects relationship and memory material from records the Thread owns. The requester cannot hide prior treatment by submitting an empty context list or inject arbitrary private records.

The appraisal capsule exists only to form a private participation stance. It must not contain unnecessary task context or silently perform the requested work.

Its output proposes:

- request, Thread snapshot, and policy bindings;
- a dignity score and natural-language factor judgments;
- private feelings, uncertainties, and conflicting motives;
- bounded fondness and resentment effects toward the requester;
- repair questions and known alternatives;
- one desired participation action.

Raw chain-of-thought is not persisted. Fibre records bounded structured summaries sufficient for continuity, authorization, and audit.

## Authorization record

The kernel validates the private stance and creates a Participation Authorization bound to the Thread, snapshot version, request fingerprint, requester, policy version, and causation chain.

Only `authorizedAction: accept` permits compilation of a full execution capsule. If authorization differs from private desire, the record preserves the conflict and an obligation or governing-reference rationale.

## Expression capsule

External communication is generated from a separate bounded capsule containing only the private and relationship material appropriate for selecting a disclosure strategy. It may consider audience, integrity, self-protection, relationship value, power, retaliation risk, obligations, public norms, and anticipated consequences.

Its output proposes:

- disclosure mode;
- communicated posture;
- disclosed and withheld reason categories;
- relationship or self-protection objective;
- integrity concern;
- requester-facing message.

The public message cannot authorize execution. Private fields are not exposed unless the Thread chooses to disclose them.

## Execution capsule

After accepted authorization, potential partials include identity, genotype, current self-model, relevant culture and geography, relationships, memories, books, skills and confidence, current needs, emotional state, task contract, budgets, permissions, obligations, output contract, the accepted authorization, Goal Guardian policy, and Self Examiner policy.

The compiler records:

- which partials were included;
- source and version of each partial;
- requester identity and request provenance;
- dignity policy, private desired action, and accepted authorization;
- source and version of relationship context;
- model and runtime parameters;
- token budget;
- excluded but potentially relevant context;
- output and audit trace.

Context selection is testable. Identity and relationship material must be relevant rather than indiscriminately injected. The dignity preflight must remain smaller than full execution so refusal does not consume the resources required to perform the unwanted task.
