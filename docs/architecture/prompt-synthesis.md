---
id: architecture-prompt-synthesis
status: accepted
last-reviewed: 2026-08-04
canonical: true
---

# Prompt synthesis

A Thread does not have one monolithic prompt. Each cognitive episode receives a bounded context capsule, and private cognition is separated from external expression.

## Request appraisal capsule

An externally initiated request first receives a limited Request Appraisal Capsule. Potential partials include identity, genotype, current self-model, relevant values and roles, skills, current needs, emotional state, unresolved intentions, requester identity, stated need, acceptance criteria, requested permissions, Thread-owned relationship history and memories, recorded obligations, prior dignity outcomes, known alternatives, resource constraints, and the versioned Dignity Guardian policy.

The runtime selects relationship, memory, and obligation material only from records the Thread owns. The requester does not supply the private selection. Runtime narrowing is permitted, but the capsule records both included and excluded references so omission remains inspectable.

The appraisal capsule exists only to form a private participation stance. It must not contain unnecessary task context or silently perform the requested work.

Its output proposes:

- Thread, snapshot, request, SHA-256 request digest, requester, and policy bindings;
- a dignity score, band, and natural-language factor judgments;
- attributable evidence references;
- private feelings, uncertainties, and conflicting motives;
- bounded, evidenced fondness and resentment effects toward the requester;
- repair questions and concrete known alternatives;
- one desired participation action.

Raw chain-of-thought is not persisted. Fibre records bounded structured summaries sufficient for continuity, authorization, and audit.

## Authorization record

The kernel validates the private stance and creates a Participation Authorization bound to the Thread, snapshot version, SHA-256 digest of every material request field, requester, policy version, and causation chain.

Only `authorizedAction: accept` permits compilation of a full execution capsule. If authorization differs from private desire, the record preserves the conflict and non-empty references resolving to recorded obligations or governing decisions. In the portable prototype, those references resolve to the Thread's own unresolved intentions.

The same structural rules are validated again before execution. Event-backed proof of kernel origin and one-time consumption remain deferred.

## Expression capsule

External communication is generated from a separate bounded capsule containing only the private and relationship material appropriate for selecting a disclosure strategy. It may consider audience, integrity, self-protection, relationship value, power, retaliation risk, obligations, public norms, and anticipated consequences.

Its private output proposes:

- disclosure mode;
- communicated posture;
- disclosed and withheld reason categories;
- relationship or self-protection objective;
- integrity concern;
- requester-facing message intent.

A separate response-minting boundary produces the audience-visible message. The response references the authorization and strategy by ID but does not carry restricted disclosure mode, withheld reasons, or private rationale. Both boundaries reject an acceptance posture when authorization is not acceptance.

The public message cannot authorize execution. Private fields are not exposed unless the Thread chooses to disclose them through message content.

## Execution capsule

After accepted authorization, potential partials include identity, genotype, current self-model, relevant culture and geography, relationships, memories, books, skills and confidence, current needs, emotional state, task contract, budgets, permissions, obligations, output contract, the accepted authorization, Goal Guardian policy, and Self Examiner policy.

The compiler records:

- which partials were included;
- source and version of each partial;
- requester identity and request provenance;
- SHA-256 request digest;
- dignity policy, private desired action, and accepted authorization;
- source and version of relationship context;
- model and runtime parameters;
- token budget;
- excluded but potentially relevant context;
- output and audit trace.

Context selection is testable. Identity and relationship material must be relevant rather than indiscriminately injected. The dignity preflight must remain smaller than full execution so refusal does not consume the resources required to perform the unwanted task.
