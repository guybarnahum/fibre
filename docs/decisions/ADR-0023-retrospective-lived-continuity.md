---
id: adr-0023
status: accepted
date: 2026-09-20
---

# ADR-0023: Retrospective lived continuity across compute dormancy

## Context

Fibre treats a Thread as a persistent person whose life spans temporary model executions.

That creates a practical tension:

- a lived Thread should not remain frozen in Tuesday's scene when Fibre next encounters the person on Friday;
- Fibre should not continuously run models or simulate every minute of every Thread merely so the calendar advances;
- historical integrity forbids silently pretending that continuously observed runtime events occurred when they did not;
- autobiographical memory cannot be injected directly merely to make a dormant interval feel rich.

The existing Flight Plan, CurrentSituation, encounter, reflection and selective-memory primitives prove bounded lived moments. They do not yet define how a lived Thread reaches a credible present after a long period with no active compute.

## Decision

### 1. Compute dormancy and lived-world continuity are distinct

For a Thread participating in continuous LivedNow, a frozen/dormant runtime means that temporary cognition is not continuously executing.

It does **not** by itself mean that the Thread's Fibre-world life must be treated as suspended at the freeze timestamp.

Retired Threads and explicitly suspended life remain separate lifecycle cases.

### 2. World may retrospectively realize an uncovered lived interval

When Fibre needs the Thread's present and authoritative lived coverage does not reach the requested time, World may generate and admit a bounded retrospective continuation across the uncovered interval.

That continuation may include:

- one or more retrospective Flight Plans;
- place/transit/presence episodes;
- ordinary activities;
- encounters where warranted;
- consequences admitted through their normal authorities.

This is an on-demand reconciliation operation, not a hidden continuous simulation.

### 3. Retrospective provenance is mandatory

Fibre must preserve both:

- **lived chronology** — when the event belongs in the Thread's Fibre-world life;
- **materialization chronology** — when Fibre actually generated/admitted the retrospective record.

The implementation may choose the concrete schema, but it must not silently backdate a record in a way that hides retrospective synthesis.

A retrospectively realized event becomes authoritative Fibre-world history once admitted. It is not evidence that Fibre continuously observed or executed the event at that wall-clock moment, and it is not evidence about external reality beyond Fibre's admitted world model.

### 4. Catch-up history precedes memory

Fibre must not create a direct “virtual memory” for time that lacked admitted lived events.

The causal order remains:

```text
retrospectively admitted event
  -> participant-specific experience / interpretation
  -> retention appraisal
  -> autobiographical memory or not_remembered
  -> optional remembered meaning
```

This keeps historical fact, contemporaneous/private interpretation, autobiographical memory and remembered meaning separate.

### 5. Catch-up uses ordinary consequence authorities

Retrospective synthesis may make circumstances available, but it does not directly rewrite personality, relationships, beliefs or memory.

Any durable change must pass through the same authorities that would apply to a real-time event:

- World/history;
- experience/journal;
- autobiographical memory;
- relationship state;
- semantic state;
- obligations/intentions;
- later Flight Plan cognition.

### 6. Catch-up is compressed and bounded

Fibre does not simulate every minute.

The continuity mechanism should materialize only enough elapsed life to make the current present causally credible and preserve meaningful consequences.

Quiet time may be represented sparsely. A conflict, encounter, obligation, delay, discovery or other causally important event may justify richer realization.

### 7. Meetings depend on reconciled LivedNow

A Person -> Thread or Thread -> Thread meeting may trigger World reconciliation, but the meeting path does not author the Thread's pre-existing scene.

The order is:

```text
ensure authoritative LivedNow
  -> publish bounded current scene
  -> admit meeting
```

For Thread-to-Thread meetings, each participant must independently reach an authoritative present before the shared encounter occurs.

## Consequences

- The existing `frozen` / `dormant` states remain runtime/lifecycle facts, not proof that world-time life ceased.
- Fibre needs one World-owned capability equivalent to `ensure LivedNow(threadId, at)`.
- Flight Plan renewal and dormant catch-up become prerequisites for a robust deployed `/meet`.
- Lived catch-up must be idempotent for the same interval and inputs.
- Historical inspection must be able to distinguish retrospectively materialized events from events admitted near their lived time.
- Memory formed from catch-up life remains selective and corrigible.
- insidefibre.com can show a current life without becoming the system that invents it.

## Rejected alternatives

### Freeze means the person literally stops until the next request

Rejected as the default for lived Threads because it makes every meeting expose compute scheduling rather than a continuing life.

### Continuously simulate all Threads

Rejected because it turns continuity into an expensive high-frequency world simulation and makes infrastructure the product.

### Invent only the current scene when /meet is called

Rejected because the scene would have no causal path through elapsed life and could not truthfully bend later memory, relationship or plans.

### Inject plausible memories for the missing time

Rejected because autobiography would bypass admitted history and violate the distinction between what happened, what was experienced, and what was retained.

## Related architecture

- [`../architecture/lived-now-and-meetings.md`](../architecture/lived-now-and-meetings.md)
- [`../vision/lived-world.md`](../vision/lived-world.md)
- [`../concepts/development-and-memory.md`](../concepts/development-and-memory.md)
- [`../architecture/thread-directory-and-meet.md`](../architecture/thread-directory-and-meet.md)
