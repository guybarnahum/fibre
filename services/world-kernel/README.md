# world-kernel

Owns validated commands, events, lifecycle transitions, provenance, and protected world laws.

## M1 persistence spine

`src/persistence.mjs` is the first executable world-kernel storage adapter. It uses Node's built-in `node:sqlite` module to prove a deterministic local Thread round trip without adding a production database dependency.

The adapter persists three distinct records:

- `threads` — the current versioned projection and deterministic state hash;
- `thread_events` — the ordered append-only history from which the projection is replayed;
- `commands` — accepted idempotency keys, command digests, resulting versions, and event references.

The public behavior is storage-neutral even though this first adapter is SQLite-specific:

1. seed a validated frozen Thread;
2. submit a typed command with an expected Thread version and stable command ID;
3. reject stale versions and conflicting reuse of an idempotency key;
4. append one event and atomically advance the projection;
5. replay all events and verify the projection and SHA-256 state hash;
6. close and reopen the database without changing the Thread.

SQLite triggers reject event and command updates or deletions. Replay independently validates sequence, version transitions, event state hashes, and final projection equality.

## Deliberate scope boundary

This is not yet an independently running service, HTTP API, thaw-lease manager, authorization-consumption system, model gateway, or production database. Those remain later M1 stages. The persistence spine exists to prove that a Thread's authoritative state survives outside the process that temporarily manipulates it.

LLM output still cannot write this store directly. Later world-kernel handlers must translate validated domain commands into this persistence contract.
