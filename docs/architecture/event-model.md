---
id: architecture-event-model
status: proposed
last-reviewed: 2026-08-04
canonical: true
---

# Initial event model

Representative events:

- `THREAD_BORN`
- `THREAD_THAW_REQUESTED`
- `REQUEST_APPRAISAL_CONTEXT_COMPILED`
- `REQUEST_DIGNITY_ASSESSED`
- `PRIVATE_STANCE_RECORDED`
- `ACTION_AUTHORIZED`
- `DISCLOSURE_STRATEGY_CHOSEN`
- `EXTERNAL_EXPRESSION_EMITTED`
- `EXPRESSION_OUTCOME_OBSERVED`
- `PRIVATE_STANCE_REVISED`
- `RELATIONSHIP_ATTITUDE_PROPOSED`
- `RELATIONSHIP_ATTITUDE_UPDATED`
- `THREAD_CONTEXT_COMPILED`
- `COGNITIVE_RUN_COMPLETED`
- `GOAL_AUDIT_COMPLETED`
- `IMPACT_AUDIT_COMPLETED`
- `MEMORY_RECORDED`
- `SELF_MODEL_REVISED`
- `TASK_PUBLISHED`
- `BID_SUBMITTED`
- `CONTRACT_AWARDED`
- `SUBCONTRACT_AWARDED`
- `DELIVERABLE_ACCEPTED`
- `LEDGER_TRANSACTION_POSTED`
- `RELATIONSHIP_FORMED`
- `CHILD_CREATED`
- `IDENTITY_MAJORITY_RECORDED`
- `THREAD_ENTERED_DORMANCY`
- `THREAD_RETIRED`

Every event has an ID, aggregate ID, expected prior version, actor, authorization evidence, timestamp, causation ID, correlation ID, payload schema version, and provenance.

A `REQUEST_DIGNITY_ASSESSED` event records the requester, request fingerprint, objective, stated need, score, band, natural-language factors, policy version, relevant Thread-owned evidence, private feelings, uncertainties, and proposed relationship effects.

A `PRIVATE_STANCE_RECORDED` event records the desired action and bounded private rationale. An `ACTION_AUTHORIZED` event binds the authorized action to one Thread, snapshot version, request, requester, policy version, and causation chain. Full execution may follow only an accepted authorization in that chain.

A `DISCLOSURE_STRATEGY_CHOSEN` event records audience, disclosure mode, communicated posture, disclosed and withheld reason categories, and private mediation rationale under restricted visibility. `EXTERNAL_EXPRESSION_EMITTED` records only the audience-visible expression and its references. External wording is never authorization evidence.

The event model must preserve access boundaries: private stance and disclosure mediation are not automatically visible to the requester. Raw model chain-of-thought is not an event payload.
