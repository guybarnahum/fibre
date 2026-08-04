---
id: architecture-storage-model
status: accepted
last-reviewed: 2026-08-04
canonical: true
---

# Storage model

A Thread is a logical aggregate, not necessarily one row or document.

Suggested durable stores:

- Relational database for identity indexes, tasks, contracts, evaluations, and derived balances
- Append-only event store for life and world events
- Graph relationships for family, trust, ownership, mentorship, and organizational links
- Vector/semantic memory index with provenance
- Object storage for artifacts, portraits, voice, books, and archives
- Secret/resource vault for credentials and external authorizations
- Double-entry ledger for FC, USD, and model-token accounting

The aggregate is reconstructed at a versioned point in time. Snapshots and current-state projections may accelerate loading but never replace the event history.

## M1 local persistence profile

The first M1 adapter uses one local SQLite database with an explicit schema version and three deliberately separate tables:

- `threads` stores the current projection, lifecycle status, version, last event, and SHA-256 state hash;
- `thread_events` stores ordered immutable seed and life-change events with expected and resulting versions, actor, causation, correlation, payload schema version, provenance, optional authorization evidence, and per-event state hashes;
- `commands` stores accepted idempotency keys, full command digests, and the event and version produced by each command.

A command, event, idempotency record, and projection update commit in one transaction. SQLite triggers reject updates and deletions from the event and command tables. Normal projection reads verify identity, canonical hash, denormalized columns, and the last-event witness. Deterministic replay validates sequence, versions, event identity, command digests, derived event IDs, command witnesses, and per-event state hashes before requiring the final replayed state to match the current projection exactly.

`provenance.lastEventId` is projection metadata. A seed operation deterministically creates a seed event and normalizes the stored snapshot to reference it, whether or not the incoming schema-valid snapshot supplied that optional field.

The M1 adapter also provides an explicit projection-repair operation that re-derives the current row from intact event history. This makes projection corruption diagnosable and recoverable without rewriting the life history.

The M1 event profile implements the common envelope described in [`event-model.md`](event-model.md). Authorization evidence is nullable for seed and owner-authored self-model events; participation-authorized event classes will require it when those records are added.

SQLite is an M1 implementation choice, not a permanent world architecture. Event, command, version, identity, idempotency, and hash contracts remain explicit so a future storage adapter can preserve the same behavior.

Live Thread data is not committed to Git. The repository may contain synthetic fixtures, templates, redacted archives, schema examples, and human-inspectable test reports.
