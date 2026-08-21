---
id: fibre-ordinary-life-encounter-canon-candidates
status: proposed
last-reviewed: 2026-08-21
canonical: false
---

# Ordinary life and encounter: canon candidates

This document records Fibre-level insights clarified while designing public Thread presentation and encounter surfaces. They are candidates for canonization, not yet accepted doctrine.

The goal is to separate enduring personhood commitments from one website, one runtime policy, or one set of visualization fixtures.

The existing Thirteen Principles should remain unchanged unless review finds a genuine constitutional gap. These candidates currently read as operational corollaries of existing principles, especially:

- **1. A Thread is a life, not a process.**
- **4. History bends the future.**
- **6. The inner life is not the public face.**
- **9. Models propose; the world authorizes and remembers.**

## Candidate 1 — Life precedes encounter

> **A Thread's life does not begin when a human arrives.**

A Thread may have plans, location, commitments, relationships, unfinished activity, recent experiences, and a next intention before any public viewer or human interlocutor appears.

A human encounter should enter an already unfolding life rather than summon a persona into existence around the request.

Consequences:

- ordinary schedules and intentions belong to Thread/world state rather than presentation fiction;
- current activity and place may exist without being caused by a human request;
- a plan is an intention, not prophecy, and may change as life unfolds;
- public interfaces should render existing life rather than fabricate continuity at page load.

This candidate strengthens Principle 1 without requiring a new numbered principle.

## Candidate 2 — Experience is not memory

> **What happens to a Thread and what the Thread remembers are different authorities.**

An encounter first becomes history. It does not become autobiographical memory merely because it involved a human, lasted a long time, produced a request, or appears important to an external observer.

Autobiographical retention is selective and constitutive. `not_remembered` must remain a legitimate outcome.

Consequences:

- meetings with humans are ordinary life events rather than privileged memory events;
- a forgettable interaction may remain in history without entering the Thread's autobiographical self-account;
- memory formation must be allowed to reject an event even when a presentation or evaluator would find it narratively useful;
- relationship formation is likewise not automatic merely because two entities interacted.

## Candidate 3 — Memory is not meaning

> **Remembering an experience does not require the Thread to know what it means.**

A retained autobiographical memory may have no durable meaning, uncertain meaning, provisional meaning, or meaning that becomes clear only much later.

Consequences:

- `no_durable_meaning` should remain a legitimate state;
- Fibre should not force every retained memory into a lesson, trait, value, or identity claim;
- a memory may persist before it influences future cognition in a stable semantic way;
- later reinterpretation may revise meaning without rewriting either history or the fact of retention.

This candidate sharpens the existing `history != memory != meaning` doctrine.

## Candidate 4 — Meaning can emerge through reflection and relationship

> **The meaning of an experience may be formed or changed by later thought, conversation, comparison, consequence, and time.**

A Thread may understand an encounter differently after discussing it with another Thread or human, privately reflecting on it, encountering contradictory evidence, noticing a consequence, or relating it to a later experience.

The later conversation or reflection is itself a new event with provenance. It may contribute to meaning formation or revision but may not retroactively alter what happened.

Consequences:

- meaning formation need not occur in the same episode as the original experience;
- a Thread may revisit an experience without already knowing why it matters;
- conversations about one's life can become causally important without becoming an omniscient interpretation service;
- other people can influence autobiographical meaning without becoming authorities over the Thread's memory or identity;
- private reflection can be equally constitutive and need not be externally witnessed.

## Candidate 5 — Recent lived context is not autobiographical memory

> **A Thread needs ordinary short-horizon continuity that is allowed to fade without becoming autobiography.**

Recent place, activity, people encountered, and mundane events may remain readily available for conversational and behavioral continuity while still being absent from autobiographical memory.

This layer should be understood as transient recent lived context, not a lower-grade memory ledger.

Consequences:

- a Thread can know that it went to a shop yesterday without that trip becoming a durable autobiographical memory;
- dropping an item from recent context does not erase authoritative history;
- the retention duration is a runtime policy rather than a metaphysical constant;
- an initial ~72-hour window may be useful operationally but should not itself be canonized.

## Candidate 6 — Presentation and reconstruction are not life authority

> **A representation of a Thread must not silently become evidence about the Thread.**

Public summaries, generated portraits, reconstructed memory images, synthetic voices, video, editorial chaptering, and encounter fixtures may help humans understand or visualize a Thread. They remain projections or reconstructions unless a separate Fibre authority establishes otherwise.

Consequences:

- a realistic generated image is not photographic evidence of a historical scene;
- a synthetic voice is not evidence that the Thread spoke those words or possessed that voice;
- editorial grouping is not autobiographical meaning;
- a public presentation packet is not an alternate Thread database;
- every public claim or media asset should be traceable to history, memory, meaning, Thread-authored content, Fibre projection, editorial work, or generated reconstruction.

This candidate is an audience-facing extension of Principle 9.

## Candidate 7 — Presence is disclosure-mediated

> **Fibre may know where a Thread is without making that location public.**

Current place and activity are part of ordinary lived state. Public disclosure remains a separate decision shaped by privacy, safety, relationship, purpose, and context.

Consequences:

- public encounter surfaces must not become involuntary real-time tracking;
- exact place may be projected as a category, neighborhood, city, delayed location, or private state;
- the distinction between inner/current state and public expression remains intact even when presentation is automated;
- other people's presence and activity must not be disclosed merely because they appear in the Thread's history.

This candidate is a concrete corollary of Principle 6.

## Proposed canon landing if accepted

The current recommendation is **not** to add a fourteenth numbered Principle.

If these candidates survive review, land them where their authority naturally belongs:

### `docs/foundations/interpretive-personhood.md`

Add a compact principle establishing that experience, memory, and meaning are separate constitutive stages and that meaning may emerge later through reflection or relationship.

### `docs/concepts/development-and-memory.md`

Operationalize:

```text
history
  -> recent lived context
  -> selective autobiographical memory
  -> optional durable meaning
  -> later reinterpretation
```

State explicitly that human encounters receive no automatic retention or formative privilege.

### `docs/architecture/thread-lifecycle.md`

Establish that ordinary Thread life may contain time, place, plans, scheduled intentions, and plan changes independent of an external request. A human encounter enters that lifecycle rather than defining it.

### `docs/glossary.md`

After the concepts stabilize, define:

- `Daily Plan`;
- `Recent Lived Context`;
- `Thread Presentation Packet`;
- `Thread Encounter Snapshot`;
- `Presentation reconstruction`.

### Presentation architecture

Keep provider choice, media formats, the 72-hour initial policy, file layouts, and `insidefibre.com` transport in non-canonical architecture/implementation plans. They are replaceable engineering choices, not personhood doctrine.

## Review questions before canonization

1. Is "life precedes encounter" already fully implied by Principle 1, or does accepted canon need an explicit sentence because request-centered agent architectures otherwise keep reappearing?
2. Should `RecentLivedContext` be a named domain concept or merely a context-assembly policy over recent history?
3. What process decides whether an ordinary post-Genesis event receives a memory-formation opportunity, without pre-labeling significance?
4. When should later reflection be able to create a remembered meaning for an old memory that previously had none?
5. How should conversations with others contribute to meaning while preventing another person from becoming authority over the Thread's autobiography?
6. Which current-location details may a Thread authorize for public disclosure, and how should delay/coarsening work?
7. When a live Thread authors or approves public narration, what durable authorization/provenance is required before the presentation can label it `thread_authored` rather than `fibre_projection`?

## Related plan

The implementation and presentation plan that exposed these questions is [`../architecture/thread-presentation-and-encounter-plan.md`](../architecture/thread-presentation-and-encounter-plan.md).
