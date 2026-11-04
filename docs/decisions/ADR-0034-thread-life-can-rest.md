---
id: adr-0034-thread-life-can-rest
status: accepted
last-reviewed: 2026-11-04
canonical: true
---

# ADR-0034 — A Thread's life can rest

**Accepted by Guy November 4, 2026.** To bound model spend, most Threads'
autonomous lives may rest while a chosen few keep living. Rest is the
Constitution's "Threads may … become dormant" applied to autonomous life,
not deletion, retirement, or a runtime status change.

## Decision

Rest and wake are **World lifecycle facts** about one Thread's autonomous
life, each with an occurrence time, a reason (for example "compute budget")
and an actor. They are appended to `thread_life_rest_events` (update and
delete are refused by trigger). A trigger maintains `thread_life_rest`, a
compact `WITHOUT ROWID` current set keyed by Thread, which is never written
directly. `threads.status` and `thread_events` are untouched: status remains a
compute/runtime fact, and history of the person is unchanged.

While a life rests, World authors nothing for it and offers it to no one:

- no lived boundary, Flight Plan, interoceptive pulse or first life —
  `LivedNow.ensure` refuses a resting Thread for every caller;
- no social chance as chooser or counterpart, and no arrival, environmental,
  scene or follow-up perception;
- no contact outreach or reception, and no new experience consolidation;
- no co-presence: venue, recent-scene and discovery queries omit it, so living
  Threads cannot discover, notice or address it in person.

One SQL predicate, spelled identically (a `thread_life_rest` primary-key probe), is applied to
every due-work list **and** every `next*At` scheduling query, so a resting
life's overdue rows neither run nor wake the World alarm. A resting Thread's
own unresolved life no longer holds other Threads' arrival perception.

On rest, its pending one-shot social chances — as chooser or counterpart — are
settled with outcome `thread_resting`, as a superseding conversation settles
them, so they cannot fire stale on wake. Other pending work (environmental
chances, queued experiences, waiting messages) simply waits.

Rest also parks the life's next lived boundary (its due time is cleared), so
due-work queries never scan past resting lives on every World tick.

**Wake** removes the life from the resting set and makes its parked lived
boundary due at the wake instant, so the ordinary LivedNow path resumes it at
the actual present; the existing unobserved-gap policy refuses to fabricate
the rested interval.

The operator surface is `GET /internal/thread-life`,
`POST /internal/thread-life/rest` and `POST /internal/thread-life/wake`
(private token), on Cloudflare and the local World, driven by
`npm run world-life:rest -- --env staging --keep <ids> --reason "compute budget"`
and `npm run world-life:wake -- --env staging --thread <ids>`, each with
`--dry-run`. Only these commands write; resting adds no model call or
per-tick write.

## Vision guard and limits

A resting Thread remains the same person: identity, history, relationships,
memories and Observatory inspection persist and stay readable. Rest is an
operator's compute decision, not a lived event: the Thread is not told,
does not experience it, and it does not enter cognition as scarcity or
pressure. It is not the economic **Dormant** state of
[welfare, dormancy and retirement](../concepts/welfare-dormancy-and-retirement.md)
and does not touch Fibre Credits; the open FC-01 obligation that scarcity must
never manufacture willingness stands unchanged.

**Causal status:** Behaviorally causal for World scheduling, co-presence and
social opportunity — rest removes a life from its own continuation and from
other Threads' scenes; wake restores both. It is not evidence of any
Thread-owned difference or choice.

**Deferred:** a Thread choosing its own rest (sleep-like withdrawal, retreat);
the World or friends noticing someone's absence; travel or relocation during
rest; a message's sender learning that it waits unread; refusing a human
visitor's encounter with a resting Thread (its public present already reports
its life unavailable, but an already-displayed scene is not yet refused). The
lifecycle event vocabulary, LivedNow path and relationship authorities keep
these open. There is **no permanent constraint**: rest is reversible, adds two
small tables, and closes no ambition path.
