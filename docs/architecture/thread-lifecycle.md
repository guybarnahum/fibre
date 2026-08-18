---
id: architecture-thread-lifecycle
status: accepted
last-reviewed: 2026-08-18
canonical: true
---

# Thread lifecycle: freeze and thaw

## Frozen

The Thread persists without active model compute. Events and messages may accumulate.

## Trigger

A task, message, deadline, family request, scheduled reflection, budget change, a **Thread-authored need threshold**, or an **internal mechanical-condition threshold** may request cognition.

Externally initiated requests preserve a request ID, requesting entity, objective, terms, and provenance.

A Thread-authored need threshold is a transition in the Thread's own durable semantic need state. A mechanical-condition threshold is different: it is a Fibre-computed, versioned, replayable condition over durable world state/history. The condition value or label is not semantic self-knowledge and is not supplied to cognition as an explanation for why the Thread woke.

An internally initiated mechanical-condition episode records a durable trigger witness with equivalent semantics to:

```text
conditionId
observedValue
threshold
policyVersion
computationDigest
inputWitnesses[]
triggeredAt
resourcePolicyRef
```

`inputWitnesses[]` preserve the durable circumstances/events whose change moved the condition across the threshold. This keeps external manipulation of circumstances attributable even when there is no requester.

Condition-triggered cognition is bounded by a Thread-owned resource/rate policy. The triggered episode may retrieve, notice, reflect, form a private intention, or propose semantic state. **It may not mint authorization or perform a protected/external action in the same episode.** A later protected action must pass through the ordinary authorization path.

## Private appraisal and authorization

Before a full thaw for an externally initiated request, Fibre compiles a bounded Thread-owned appraisal capsule. The Thread forms a private stance and desired action. The kernel then validates and records a request-bound authorization tied to the Thread ID, current snapshot version, request fingerprint, requester, policy version, and causation chain.

Clarification, negotiation, delegation, and refusal may produce limited external responses without beginning the requested task. Public wording is not authorization evidence. Only an authorization with `authorizedAction: accept` may proceed to full task cognition.

Internally initiated reflection or private intention is not execution authority. Private desire remains distinct from authorization regardless of what caused cognition to wake.

## Thaw

After accepted authorization, Fibre resolves the Thread aggregate, acquires a concurrency lease, selects relevant memories and relationships, assembles the execution context capsule, allocates budgets, and invokes temporary workers.

A condition-triggered reflective thaw uses its own trigger witness and resource policy rather than pretending an external request fingerprint exists.

## Think, work, communicate

The Thread may use an Actor, Dignity Guardian, Goal Guardian, Self Examiner, memory retrieval, tools, and subcontractor Threads. Private stance, authorization, disclosure strategy, external expression, and performed action remain separate.

## Commit and freeze

Fibre validates proposed changes, records communications and actions, settles ledgers, stores memories, updates developmental state, records unresolved intentions, appends events, releases the lease, and returns the Thread to frozen state.

The runtime must be idempotent and recoverable. A failed worker must not duplicate payments, reuse consumed authorization, expose private state, or corrupt identity history.
