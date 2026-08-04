---
id: architecture-request-participation
status: accepted
last-reviewed: 2026-08-04
canonical: true
---

# Request participation, dignity, and expression

An externally initiated request does not directly activate full Thread task execution. It first enters a bounded private appraisal and authorization process. Public response is generated separately through interest-mediated expression.

## Participation pipeline

### 1. Thread-owned appraisal context

The runtime assembles a small Request Appraisal Capsule containing only what is needed to judge participation:

- Thread identity, current self-model, values, roles, skills, needs, feelings, commitments, and resource constraints;
- requesting entity identity and entity kind;
- request ID, objective, stated need, proposed terms, permissions, and acceptance criteria;
- relationship and memory records selected from context the Thread owns;
- obligations, prior dignity outcomes, and known alternatives;
- dignity policy ID and version.

The requester may provide the request and terms but may not decide which of the Thread's own relationship history or memories are visible to appraisal. A runtime context selector may narrow Thread-owned records; it may not inject unowned references.

The appraisal worker must not perform the requested task.

### 2. Private dignity stance

Cognition proposes a private record containing:

- dignity score, band, policy, and factor judgments;
- feelings and relationship effects;
- uncertainties and conflicting motives;
- repair questions and known alternatives;
- one desired participation action: `accept`, `clarify`, `negotiate`, `delegate`, or `refuse`.

The action is the Thread's private preference, not a requester-facing message and not yet execution authority.

The initial default policy bands remain:

- **high:** 70–100
- **contested:** 40–69
- **low:** 0–39

A dignity-based proposal to accept requires high dignity. Clarification requires a repair question, and delegation requires a known alternative. Other action choices remain individualized rather than mechanically forced by the score.

### 3. Request-bound authorization

The world kernel validates the private stance and issues a Participation Authorization bound to:

- one Thread ID;
- one Thread snapshot version;
- one request ID and request fingerprint;
- one requester;
- one dignity policy ID and version;
- one causation chain.

Only `authorizedAction: accept` permits full task execution.

Authorization may differ from private desire when the Thread explicitly chooses to honor an obligation or governing decision. The override must preserve the desired action, conflict, rationale, and governing reference. Capability or technical feasibility alone never qualifies as such a reason.

The portable domain contract validates bindings structurally. Event-backed issuance, signatures or capability proofs, one-time consumption, and replay prevention remain deferred to the live kernel.

### 4. Interest-mediated disclosure

The Thread separately chooses how to communicate with a particular audience. The disclosure strategy may use full candor, tactful candor, selective disclosure, strategic ambiguity, evasion, or deception.

It records disclosed and withheld reason categories, relationship and self-protection objectives, integrity concerns, and private rationale. Public communication may soften or conceal private motives, but cannot create or expand authorization.

A public `accept` posture is invalid when authorization is not `accept`.

### 5. External response and execution

A limited external response may clarify, negotiate, delegate, or refuse without beginning the requested work. Wording is not authorization evidence.

Only after accepted authorization does Fibre compile the larger Thread Context Capsule and start task cognition. Safety, permission, capability, budget, and contract checks remain separate gates.

## Appraisal factors

The private dignity trace covers at least:

- identity alignment;
- individualized advantage over a generic LLM;
- requester need;
- relational meaning;
- respect and reciprocity;
- compensation, attribution, deadline, permissions, and other participation terms;
- obligations, opportunity cost, resources, and conflicts with existing commitments;
- whether another model, Thread, company, or institution is a better fit.

The factor trace matters more than numerical precision. The score supports routing, testing, and comparison; it does not replace explanation or consent.

## Affect and relationship consequences

The private appraisal may propose feelings and bounded fondness or resentment deltas toward the requester. Fondness and resentment remain separate and may coexist.

The relationship service validates and persists aggregate changes. Cognitive output cannot directly alter protected relationship state. Repeated patterns should matter more than one minor interaction, and apology, repair, reciprocity, or changed behavior may revise the relationship.

Private relationship attitudes are not automatically disclosed to the entity they concern.

## Representative event order

1. `THREAD_THAW_REQUESTED`
2. `REQUEST_APPRAISAL_CONTEXT_COMPILED`
3. `REQUEST_DIGNITY_ASSESSED`
4. `PRIVATE_STANCE_RECORDED`
5. `ACTION_AUTHORIZED`
6. optional `RELATIONSHIP_ATTITUDE_PROPOSED`
7. optional `RELATIONSHIP_ATTITUDE_UPDATED`
8. `DISCLOSURE_STRATEGY_CHOSEN`
9. optional `EXTERNAL_EXPRESSION_EMITTED`
10. when accepted, `THREAD_CONTEXT_COMPILED`
11. task cognition and existing audit events

## Human-inspectable artifact

With access controls respected, a request trace should distinguish:

- requester and request fingerprint;
- Thread snapshot and policy version;
- Thread-owned context included and excluded;
- private dignity factors, feelings, and desired action;
- authorization and any obligation-mediated override;
- disclosure strategy and audience;
- external response;
- whether full execution was authorized;
- later outcome and developmental consequences.

The requester normally sees only the intended external response and shared commitments, not the private trace.
