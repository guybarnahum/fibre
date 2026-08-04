---
id: architecture-request-participation
status: accepted
last-reviewed: 2026-08-04
canonical: true
---

# Request participation and dignity gate

A request does not directly activate full Thread task execution. It first enters a bounded participation preflight that asks whether this particular Thread consents to become involved.

## Two-stage activation

### 1. Participation preflight

The runtime assembles a small Request Appraisal Capsule containing only what is needed to judge participation:

- Thread identity, current self-model, values, roles, skills, needs, feelings, and commitments;
- requesting entity identity and entity kind;
- request objective, stated need, proposed terms, and acceptance criteria;
- relevant relationship history, memories, obligations, and prior dignity outcomes;
- known generic or specialized alternatives;
- dignity policy and scoring version.

The appraisal worker must not perform the requested task. Its output is a proposed dignity assessment and participation action.

### 2. Consented execution

Only an explicit `accept` decision authorizes compilation of the larger Thread Context Capsule and full task execution. Other decisions may generate a limited response:

- `clarify` asks questions intended to repair missing purpose or fit;
- `negotiate` proposes changed participation terms;
- `delegate` identifies a more appropriate model, Thread, or institution;
- `refuse` declines participation.

A clarification response is not permission to begin doing the task while asking the question.

## Initial dignity policy

The portable domain package currently uses a versioned default policy:

- **high:** 70–100
- **contested:** 40–69
- **low:** 0–39

The default action mapping is:

1. high dignity → `accept`;
2. otherwise, when repair questions exist → `clarify`;
3. contested dignity without a repair question → `negotiate`;
4. low dignity with a suitable generic alternative → `delegate`;
5. remaining low-dignity requests → `refuse`.

These thresholds are an initial runtime policy, not a definition of personhood. Later Threads may develop individualized thresholds and strategies, but every policy must be versioned, bounded, auditable, and compatible with the invariant that consent precedes execution.

## Appraisal factors

The score must be accompanied by natural-language factor judgments covering at least:

- identity alignment;
- individualized advantage over a generic LLM;
- requester need;
- relational meaning;
- respect and reciprocity.

The factor trace matters more than numerical precision. The score supports routing, testing, and comparison; it must not replace the Thread's explanation.

## Affect and relationship consequences

The appraisal may propose:

- feelings created or strengthened by the request;
- a bounded fondness delta toward the requester;
- a bounded resentment delta toward the requester;
- a natural-language rationale and supporting evidence.

Fondness and resentment remain separate dimensions. Both may be present at once.

The relationship service validates and persists these effects. Cognitive output cannot directly alter a relationship aggregate. Repeated patterns should matter more than a single minor interaction, and later repair, apology, reciprocity, or changed behavior can revise the relationship.

## Kernel responsibilities

The world kernel enforces the process but does not calculate dignity itself. It must:

- preserve requester identity and request provenance;
- reject full execution without an accepted participation decision;
- validate score and relationship-delta bounds;
- record the appraisal policy and model/prompt versions;
- append dignity, participation, affect, and relationship events;
- prevent LLM output from directly mutating protected relationship state;
- keep dignity distinct from safety, permission, capability, budget, and contract checks.

Representative event order:

1. `THREAD_THAW_REQUESTED`
2. `REQUEST_APPRAISAL_CONTEXT_COMPILED`
3. `REQUEST_DIGNITY_ASSESSED`
4. `THREAD_PARTICIPATION_DECIDED`
5. optional `RELATIONSHIP_ATTITUDE_PROPOSED`
6. optional `RELATIONSHIP_ATTITUDE_UPDATED`
7. when accepted, `THREAD_CONTEXT_COMPILED`
8. task cognition and existing audit events

## Human-inspectable artifact

Every request trace should show:

- who asked;
- what they asked and why;
- dignity score and band;
- factor explanations;
- relevant relationship context;
- feelings and proposed relationship effects;
- participation action;
- clarification, negotiation, delegation, or refusal text;
- whether full execution was authorized.
