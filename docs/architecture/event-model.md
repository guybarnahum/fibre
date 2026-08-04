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
- `THREAD_PARTICIPATION_DECIDED`
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

A `REQUEST_DIGNITY_ASSESSED` event records the requester, request objective, stated need, score, band, natural-language factors, policy version, relevant evidence, feelings, and proposed relationship effects. A `THREAD_PARTICIPATION_DECIDED` event records accept, clarify, negotiate, delegate, or refuse. Full execution may follow only an accepted decision within the same causation chain.
