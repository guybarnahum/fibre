---
id: architecture-thread-lifecycle
status: accepted
last-reviewed: 2026-08-02
canonical: true
---

# Thread lifecycle: freeze and thaw

## Frozen

The Thread persists without active model compute. Events and messages may accumulate.

## Trigger

A task, message, deadline, family request, scheduled reflection, budget change, or need threshold requests cognition.

## Thaw

Fibre resolves the Thread aggregate, acquires a concurrency lease, selects relevant memories and relationships, assembles a context capsule, allocates budgets, and invokes temporary workers.

## Think, work, communicate

The Thread may use an Actor, Goal Guardian, Self Examiner, memory retrieval, tools, and subcontractor Threads.

## Commit and freeze

Fibre validates proposed changes, records communications and actions, settles ledgers, stores memories, updates developmental state, records unresolved intentions, appends events, releases the lease, and returns the Thread to frozen state.

The runtime must be idempotent and recoverable. A failed worker must not duplicate payments or corrupt identity state.
