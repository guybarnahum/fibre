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

The first M1 adapter uses one local SQLite database with three deliberately separate tables:

- `threads` stores the current projection, lifecycle status, version, last event, and SHA-256 state hash;
- `thread_events` stores ordered immutable seed and life-change events with expected and resulting versions;
- `commands` stores accepted idempotency keys, full command digests, and the event and version produced by each command.

A command, event, idempotency record, and projection update commit in one transaction. SQLite triggers reject updates and deletions from the event and command tables. Deterministic replay validates every sequence and version transition, recomputes each event's state hash, and requires the final replayed state to match the current projection exactly.

SQLite is an M1 implementation choice, not a permanent world architecture. Event, command, version, and hash contracts remain explicit so a future storage adapter can preserve the same behavior.

Live Thread data is not committed to Git. The repository may contain synthetic fixtures, templates, redacted archives, schema examples, and human-inspectable test reports.
