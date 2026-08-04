---
id: architecture-thread-lifecycle
status: accepted
last-reviewed: 2026-08-04
canonical: true
---

# Thread lifecycle: freeze and thaw

## Frozen

The Thread persists without active model compute. Events and messages may accumulate.

## Trigger

A task, message, deadline, family request, scheduled reflection, budget change, or need threshold requests cognition. Externally initiated requests preserve a request ID, requesting entity, objective, terms, and provenance.

## Private appraisal and authorization

Before a full thaw for an externally initiated request, Fibre compiles a bounded Thread-owned appraisal capsule. The Thread forms a private stance and desired action. The kernel then validates and records a request-bound authorization tied to the Thread ID, current snapshot version, request fingerprint, requester, policy version, and causation chain.

Clarification, negotiation, delegation, and refusal may produce limited external responses without beginning the requested task. Public wording is not authorization evidence. Only an authorization with `authorizedAction: accept` may proceed to full task cognition.

## Thaw

After accepted authorization, Fibre resolves the Thread aggregate, acquires a concurrency lease, selects relevant memories and relationships, assembles the execution context capsule, allocates budgets, and invokes temporary workers.

## Think, work, communicate

The Thread may use an Actor, Dignity Guardian, Goal Guardian, Self Examiner, memory retrieval, tools, and subcontractor Threads. Private stance, authorization, disclosure strategy, external expression, and performed action remain separate.

## Commit and freeze

Fibre validates proposed changes, records communications and actions, settles ledgers, stores memories, updates developmental state, records unresolved intentions, appends events, releases the lease, and returns the Thread to frozen state.

The runtime must be idempotent and recoverable. A failed worker must not duplicate payments, reuse consumed authorization, expose private state, or corrupt identity history.
