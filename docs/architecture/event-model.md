---
id: architecture-event-model
status: proposed
last-reviewed: 2026-08-02
canonical: true
---

# Initial event model

Representative events:

- `THREAD_BORN`
- `THREAD_THAW_REQUESTED`
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
