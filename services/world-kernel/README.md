# world-kernel

Owns validated commands, events, lifecycle transitions, provenance, and protected world laws.

## M1 persistence spine

`src/persistence.mjs` is the first executable world-kernel storage adapter. It uses Node's built-in `node:sqlite` module to prove a deterministic local Thread round trip without adding a production database dependency.

The adapter persists three distinct records:

- `threads` — the current versioned projection and deterministic state hash;
- `thread_events` — the ordered append-only history from which the projection is replayed;
- `commands` — accepted idempotency keys, command digests, resulting versions, and event references.

The public behavior is storage-neutral even though this first adapter is SQLite-specific:

1. normalize projection metadata and seed a validated Thread;
2. submit a typed command with an expected Thread version and stable command ID;
3. reject stale versions, illegal lifecycle states, unknown payload fields, oversized payloads, and conflicting idempotency reuse;
4. append one event and atomically advance the projection;
5. verify ordinary reads against the last immutable event;
6. replay all events while re-deriving command digests and event IDs and checking command witnesses;
7. repair a corrupt projection from intact event history;
8. close and reopen the database without changing the Thread.

SQLite schema version 1 records causation, correlation, payload schema version, provenance, and optional authorization evidence on every event. Triggers reject event and command updates or deletions. Replay validates identity, sequence, version transitions, command content, event state hashes, command witnesses, and final projection equality.

`provenance.lastEventId` is projection metadata, not intrinsic identity. Seeding deterministically creates the seed event and normalizes the stored snapshot to reference it. `UPDATE_SELF_MODEL` is permitted only for frozen or dormant Threads and preserves the existing status; it cannot resurrect a retired Thread or rewrite an active runtime state.

Integrity checks detect hash-, digest-, identity-, metadata-, and witness-inconsistent corruption. They are not a cryptographic proof against an administrator who can disable protections and coherently rewrite every database witness; kernel-origin signatures and external trust anchors remain later capabilities.

## Deliberate scope boundary

This is not yet an independently running service, HTTP API, thaw-lease manager, authorization-consumption system, model gateway, or production database. Those remain later M1 stages. The persistence spine exists to prove that a Thread's authoritative state survives outside the process that temporarily manipulates it.

LLM output still cannot write this store directly. Later world-kernel handlers must translate validated domain commands into this persistence contract.
