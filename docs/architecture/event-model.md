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

Every event has an ID, aggregate ID, expected prior version, actor, timestamp, causation ID, correlation ID, payload schema version, provenance, and authorization evidence when the event depends on an authorization. Seed and directly owner-authored state events may carry no authorization reference; participation and execution events must carry the authorization required by their domain invariant.

The M1 SQLite public Thread-event profile currently implements `THREAD_SEEDED` and `SELF_MODEL_UPDATED` with this common envelope. Its stored names are prototype-specific and do not narrow the representative event vocabulary above.

M1 now persists request receipt, appraisal compilation, and private stance as separate restricted append-only records rather than copying their payloads into the public Thread event timeline. This is an access-boundary choice, not a rejection of the representative events. A later visibility-aware event projection may expose safe event headers while keeping capsule contents, private rationale, feelings, motives, and relationship attitudes restricted.

A `REQUEST_APPRAISAL_CONTEXT_COMPILED` record identifies the named request, exact historical Thread snapshot, SHA-256 request digest, policy, and which Thread-owned memory, relationship, and obligation references were included and excluded.

A `REQUEST_DIGNITY_ASSESSED` record carries the requester, request digest, objective, score, band, natural-language factors, policy version, attributable evidence references, private feelings, uncertainties, concrete alternatives, and proposed relationship effects. In the current M1 storage shape, that assessment is validated as the input used to form the immutable private stance; a separate assessment table may be introduced when appraisal revisions or multiple candidate assessments are supported.

A `PRIVATE_STANCE_RECORDED` record stores the desired action, evidence references, alternatives, bounded private rationale, private feelings, motives, uncertainties, repair questions, and proposed relationship effect. An exact retry is idempotent; a materially different second stance conflicts until an explicit `PRIVATE_STANCE_REVISED` operation exists.

An `ACTION_AUTHORIZED` event binds the authorized action to one Thread, snapshot version, request, requester, policy version, causation chain, and any Thread-owned recorded-obligation references. Full execution may follow only an accepted authorization in that chain.

A `DISCLOSURE_STRATEGY_CHOSEN` event records audience, disclosure mode, communicated posture, disclosed and withheld reason categories, and private mediation rationale under restricted visibility.

`EXTERNAL_EXPRESSION_EMITTED` records only the audience-visible expression, authorization ID, disclosure-strategy ID, and communicated posture. It does not copy the restricted disclosure mode, withheld reasons, or private rationale. External wording is never authorization evidence.

The event model must preserve access boundaries: private appraisal, stance, and disclosure mediation are not automatically visible to the requester. Raw model chain-of-thought is not an event payload.
