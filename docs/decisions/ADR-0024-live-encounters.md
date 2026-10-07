---
id: adr-0024
status: accepted
date: 2026-10-07
---

# ADR-0024: Live encounters are asynchronous lived event streams

## Context

N5/N6 proved the important encounter authorities: World-owned current life, voluntary participation, objective Encounter Story, Thread-specific Experience, selective Journal/Memory consequence, and continuity without a chat-session authority.

The first sustained live Person -> Thread conversation exposed a narrower implementation artifact:

- public encounter is advanced one complete request/response at a time;
- one model invocation produces one complete outward response before the other participant can react;
- Thread -> Thread social meetings currently synthesize a short opener -> reply -> closing sequence;
- synchronous aftermath makes every accepted conversational beat carry journal/memory work before the next outward exchange;
- World life appears static while conversation is being processed.

Those constraints are useful scaffolding, not the intended social architecture.

## Decision

### 1. There is no turn owner

A live encounter is an asynchronous lived event stream among independently acting participants inside continuing World life.

Participants may listen, speak, act, pause, interrupt, overlap, leave, or remain silent. Fibre does not persist or enforce a `whoseTurn` state.

### 2. Speech is an interruptible outward action

Speech may be transported incrementally at token/word-sized deltas.

Transport deltas are ephemeral. Objective history contains only expression that was actually exposed/audible.

If new material speech or a World event arrives while a participant is expressing, the current expression generation may be aborted. The already-emitted prefix remains objective history; unexposed generated text never happened.

### 3. Speech opportunities are not turns

The first accepted policy exposes a possible speaking opportunity when incoming speech reaches:

- sentence-ending punctuation (`.`, `!`, `?`);
- a meaningful pause;
- end-of-stream.

An opportunity means only that enough stable outward speech exists for a participant to consider acting. It never requires a response.

The pause threshold is runtime policy to tune empirically, not a semantic property of a Thread.

### 4. Structured cognition and streamed expression are distinct

Provider-neutral model integration has two different jobs:

```text
invoke(...)
  -> bounded structured cognition

streamExpression(...)
  -> interruptible outward language stream
```

A Thread's private appraisal/stance remains distinct from public expression. Streaming expression does not gain authority to change protected World state.

### 5. Live Encounter coordination is ephemeral

The live coordinator may hold:

- current participant presence;
- ephemeral heard-so-far buffers;
- active expression streams;
- current World event subscriptions;
- cancellation state.

It does not become a durable conversation/session authority.

Durable reconstruction comes from World-owned CurrentSituation plus committed Encounter Story history and downstream Thread-specific consequences.

### 6. World life continues during conversation

A meeting occurs inside life. Current activity, place/transit, background occurrences, other actors and Flight Plan pressure may continue and may interrupt or end the encounter.

Conversation does not freeze LivedNow and does not replace the Thread's ordinary activity with a synthetic meeting scene.

### 7. Consolidation is decoupled from conversational turn latency

Immediate outward interaction must not require full Journal/Memory consolidation after every conversational beat.

Admitted Experience is durable evidence. Bounded later consolidation may selectively yield no consequence, Journal, autobiographical memory, remembered meaning, relationship state, semantic state, insight, question, intention, or later desire for contact.

Conversation ending may be one consolidation opportunity, but it is not the sole trigger.

## Preserved authority boundaries

This decision preserves:

- World owns enacted reality and chronology;
- Thread cognition owns private participation and meaning;
- Encounter Story owns observable shared history;
- Experience is participant-specific;
- Journal is private contemporaneous interpretation;
- autobiographical memory is selective;
- clients never author Thread life or private state.

## Consequences

- the existing request/response public encounter and fixed three-beat Thread meeting are transitional interfaces, not conceptual constraints;
- a provider-neutral streamed-expression seam is required;
- later duplex coordination must tolerate overlap and cancellation;
- Encounter Story must be able to represent interrupted expression without inventing unspoken content;
- Observatory should derive encounter episodes from causal history rather than introduce a chat-session store;
- Thread -> Thread and Person -> Thread conversation should converge on the same live-encounter primitive.

## Rejected alternatives

### Keep strict alternating turns

Rejected because it makes social behavior an API artifact and prevents interruption, overlap and spontaneous expression.

### Persist every token as World history

Rejected because transport granularity is not semantic history and would create high-volume, low-value authority.

### Re-run full cognition after every incoming token

Rejected as wasteful and psychologically implausible. Tokens update ephemeral perception; punctuation/pause/end boundaries create bounded speaking opportunities.

### Add a durable chat/session object

Rejected because a meeting is one event inside continuing life. The existing World/Encounter/Experience authorities already provide durable truth.

## Related architecture

- [Live encounters](../architecture/live-encounters.md)
- [Encounter stories and Thread experience](../architecture/encounters-and-experience.md)
- [Situated perception and salience](../architecture/situated-perception-and-salience.md)
- [N7 live encounter slices](../validation/n7-live-encounter-slices.md)
