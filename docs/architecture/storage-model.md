---
id: architecture-storage-model
status: accepted
last-reviewed: 2026-08-05
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

The aggregate is reconstructed at a versioned point in time. Snapshots and current-state projections may accelerate loading but never replace event history.

## M1 local persistence profile

The M1 adapter uses one local SQLite database and one authoritative `PRAGMA user_version`. Schema version 3 governs all public, restricted-participation, and runtime tables. A second subsystem-specific schema-version table is not used.

Public world tables:

- `threads` stores the current projection, lifecycle status, version, last event, and SHA-256 state hash;
- `thread_events` stores ordered immutable seed and life-change events with expected/resulting versions, actor, causation, correlation, provenance, optional authorization evidence, and per-event state hashes;
- `commands` stores accepted idempotency keys, command digests, and resulting event/version witnesses.

Restricted participation and runtime tables:

- `activation_requests`, `request_appraisals`, and `private_participation_stances` preserve the interior request/appraisal/stance chain;
- `participation_authorizations` preserves current-state execution authority;
- `thaw_leases` and `runtime_sessions` preserve exclusive temporary-cognition state;
- `actor_runs` and `goal_guardian_audits` preserve deterministic worker proposals and audits.

Schema migrations run inside one immediate transaction. Schema versions 1 and 2 migrate to version 3 without rewriting existing Thread events or private records.

A command, event, idempotency record, and projection update commit in one world-store transaction. Runtime authorization, exclusive lease, and runtime-session creation commit in one runtime-store transaction after rereading the Thread and private-stance witnesses.

The world store and runtime store intentionally use two SQLite handles over the same file to preserve separate interfaces. WAL and a bounded busy timeout mitigate lock contention. Cross-store invariants are not assumed from an earlier read: the runtime transaction rereads version, lifecycle, state hash, appraisal ID, stance ID, fingerprint, and stance digest before writing. The partial unique lease index remains the database-level exclusivity authority.

Events, commands, requests, appraisals, private stances, authorizations, Actor runs, and Guardian audits are append-only. `thaw_leases` and `runtime_sessions` are mutable only for explicit lifecycle transitions. Triggers prevent changes to their immutable IDs, bindings, context, digests, and start times and permit only bounded status completion, release, expiration, or abort metadata. Neither table permits deletion.

Normal projection reads verify identity, canonical hash, denormalized columns, and the last-event witness. Deterministic replay validates sequence, versions, event identity, command digests, derived event IDs, command witnesses, and per-event state hashes before requiring the final replayed state to match the projection.

Runtime reads rederive acquisition, authorization, execution-context, session, Actor, and Guardian digests. The runtime session digest independently binds the context digest to immutable session and lease metadata, so coherent context-plus-digest rewriting still fails. Actor and Guardian operation digests similarly remain independent of their content digests.

`provenance.lastEventId` is projection metadata. Seed normalizes the stored snapshot to its deterministic seed event.

The projection-repair operation rederives the current row from intact event history without rewriting life history.

SQLite is an M1 implementation choice, not a permanent world architecture. Event, command, version, identity, idempotency, lease, authorization, and hash contracts remain explicit so a future adapter can preserve behavior.

Live Thread data is not committed to Git. The repository may contain synthetic fixtures, templates, redacted archives, schema examples, and human-inspectable test reports.
