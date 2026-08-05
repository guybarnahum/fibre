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
- recorded obligations, prior dignity outcomes, and known alternatives;
- dignity policy ID and version.

The requester provides the request and terms but does not decide which of the Thread's own relationship history, memories, or obligations are visible to appraisal. A runtime context selector may narrow Thread-owned records; it may not inject unowned references. The capsule records both included and excluded references so narrowing remains inspectable.

In the portable prototype, obligation references resolve against the Thread's own `currentState.unresolvedIntentions`. A later kernel may also resolve contract IDs or governing-decision IDs through dedicated domains, but free-form caller strings are never recorded obligations.

The appraisal worker must not perform the requested task.

The M1 kernel persists the named activation request and its capsule as immutable restricted records. The request carries the portable SHA-256 fingerprint over every material request field. The capsule is built from the authoritative Thread snapshot and stores that snapshot version and state-hash witness. Integrity verification replays to that historical version and proves that included and excluded references form complete, disjoint partitions of the memory, relationship, and obligation references owned by the Thread at that time.

An exact request/appraisal retry is idempotent even after later Thread changes. Reusing the same request ID with materially different request content, selection, policy, timestamps, or causal metadata fails visibly.

Compilation is permitted only while the Thread is frozen or dormant. If the Thread advances after compilation but before the immutable request/appraisal trace is inserted, the store rejects that race rather than persisting a capsule against the wrong snapshot.

### 2. Private dignity stance

Cognition proposes a private record containing:

- dignity score, band, policy, factor judgments, and attributable evidence references;
- feelings and relationship effects, including evidence for non-zero attitude changes;
- uncertainties and conflicting motives;
- repair questions and concrete known alternatives;
- one desired participation action: `accept`, `clarify`, `negotiate`, `delegate`, or `refuse`.

The action is the Thread's private preference, not a requester-facing message and not yet execution authority.

The initial default policy bands remain:

- **high:** 70–100
- **contested:** 40–69
- **low:** 0–39

A dignity-based proposal to accept requires high dignity. Clarification requires a non-empty repair question, and delegation requires a validated alternative entity. Other action choices remain individualized rather than mechanically forced by the score.

The M1 kernel persists one restricted private stance bound to the request, fingerprint, exact historical Thread snapshot, state hash, policy, and requester. A stance is the Thread's opinion about that durable appraisal at that time. It may be recorded after unrelated later Thread changes without changing what snapshot it describes. Any future Participation Authorization or execution decision must separately revalidate current Thread state.

An exact stance retry remains idempotent. A materially different second stance conflicts until explicit stance revision is implemented. This prevents silent overwrite while leaving a clear future path for a new `PRIVATE_STANCE_REVISED` record.

Appraisal and stance records have opaque random identifiers. Their SHA-256 content digests are stored and verified separately so an identifier is not a commitment to private material.

The request, capsule, and stance are stored outside the public Thread event response. Every private route requires a separate local private token before route dispatch. That token protects route access only; it is not consent, Participation Authorization, or permission to execute.

### 3. Request-bound authorization

The world kernel validates the private stance and issues a Participation Authorization bound to:

- one Thread ID;
- one Thread snapshot version;
- one request ID;
- a SHA-256 digest of every material request field;
- one requester;
- one dignity policy ID and version;
- one causation chain.

Only `authorizedAction: accept` permits full task execution.

The request digest is an integrity binding against adversarial request substitution, not a convenience checksum. The portable package computes it deterministically over request ID, trigger, requester identity, objective, stated need, permissions, and acceptance criteria. Changing any material field invalidates the authorization.

Authorization may differ from private desire only when the Thread explicitly chooses to honor a recorded obligation or governing decision. The override preserves the desired action, conflict, rationale, and governing reference. In the portable prototype every reference must be non-empty and resolve to a Thread-owned unresolved intention. Capability or technical feasibility alone never qualifies as such a reason.

The portable domain contract validates request content, Thread, snapshot, requester, policy, score, relationship evidence, rationale, and obligation bindings structurally at issuance and again before execution. Event-backed origin proof, one-time consumption, and replay detection remain deferred to the live kernel; those deferrals do not weaken content integrity.

A historical stance does not authorize current action by itself. Persistent authorization must bind to and validate the live governing state needed for execution. Persistent authorization is the next M1 slice.

### 4. Interest-mediated disclosure

The Thread separately chooses how to communicate with a particular audience. The disclosure strategy may use full candor, tactful candor, selective disclosure, strategic ambiguity, evasion, or deception.

It records disclosed and withheld reason categories, relationship and self-protection objectives, integrity concerns, and private rationale. The strategy is bound to the exact private stance and authorization. Public communication may soften or conceal private motives, but cannot create or expand authorization.

A public `accept` posture is invalid when authorization is not `accept`. This rule is checked when selecting a strategy and again when minting the audience-visible response.

### 5. External response and execution

A limited external response may clarify, negotiate, delegate, or refuse without beginning the requested work. Wording is not authorization evidence.

The audience-visible response references the disclosure strategy by ID but does not carry the restricted disclosure mode or private rationale. Restricted strategy metadata remains private unless the Thread intentionally discloses it through ordinary message content.

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

The factor trace and evidence matter more than numerical precision. The score supports routing, testing, and comparison; it does not replace explanation or consent.

## Affect and relationship consequences

The private appraisal may propose feelings and bounded fondness or resentment deltas toward the requester. Fondness and resentment remain separate and may coexist.

Every non-zero relationship delta carries attributable evidence references. The relationship service validates and persists aggregate changes. Cognitive output cannot directly alter protected relationship state. Repeated patterns should matter more than one minor interaction, and apology, repair, reciprocity, or changed behavior may revise the relationship.

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

The current M1 implementation stores the first three durable participation artifacts in a restricted append-only ledger instead of exposing their private payloads through the public Thread event route. The representative order remains the intended causal history.

## Human-inspectable artifact

With access controls respected, a request trace distinguishes:

- requester and SHA-256 request digest;
- Thread snapshot and policy version;
- Thread-owned context included and excluded;
- private dignity factors, evidence, feelings, and desired action;
- authorization and any recorded-obligation override;
- disclosure strategy and audience under restricted visibility;
- audience-visible response referencing only the strategy ID;
- whether full execution was authorized;
- later outcome and developmental consequences.

The requester normally sees only the intended external response and shared commitments, not the private trace.
