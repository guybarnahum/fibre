---
id: architecture-storage-model
status: accepted
last-reviewed: 2026-08-12
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

The M1 adapter uses one local SQLite database and one authoritative `PRAGMA user_version`. Schema version 4 governs all public, restricted-participation, runtime, freeze, consumption, accepted-memory, rejected-runtime-abandonment, and additive pre-M2 Structured Obligation tables. A subsystem-specific version table is not used.

Public world tables:

- `threads` stores the current projection, lifecycle status, version, last event, and SHA-256 state hash;
- `thread_events` stores ordered immutable `THREAD_SEEDED`, `SELF_MODEL_UPDATED`, and `THREAD_FROZEN` events with expected/resulting versions, actor, causation, correlation, provenance, authorization evidence, and per-event state hashes;
- `commands` stores accepted idempotency keys, operation digests, and resulting event/version witnesses.

Restricted participation and runtime tables:

- `activation_requests`, `request_appraisals`, and `private_participation_stances` preserve the interior request/appraisal/stance chain;
- `participation_authorizations` preserves current-state execution authority;
- `thaw_leases` and `runtime_sessions` preserve exclusive temporary-cognition state;
- `actor_runs` and `goal_guardian_audits` preserve deterministic worker proposals and audits;
- `authorization_consumptions` preserves one-time use of execution authority and any discharged legacy obligation references;
- `freeze_reports` preserves restricted accepted/rejected change decisions and causal witnesses;
- `thread_memories` preserves accepted evidence-bearing memory records;
- `runtime_abandons` preserves deliberate, non-consuming closure of Guardian-rejected episodes within an active lease window.

Structured Obligation v1 additive tables introduced during PR #35:

- `obligation_records` stores append-only Structured Obligation revisions with stable obligation identity, status, scope/terms, provenance, standing/terms visibility, effective/expiry state, and canonical digests;
- `obligation_applicability_decisions` stores Fibre-owned request-bound applicability decisions separately from the obligation itself;
- `legacy_obligation_tombstones` preserves deterministic evidence that an exact pre-#35 obligation reference was already consumed and therefore cannot be reactivated through migration;
- `structured_obligation_discharges` binds a successful one-shot compelled freeze to its exact prior and terminal obligation revisions plus applicability, authorization, consumption, runtime, freeze-report, and event witnesses;
- `structured_authority_withdrawal_closures` preserves an executed-but-interrupted compelled episode when its governing authority becomes stale after Actor execution and Guardian pass but before freeze.

The additive tables share schema version 4, but the canonical runtime authority is no longer the historical exact-prose path: Structured Obligation authority now requires Fibre-owned persisted applicability plus current-authority revalidation. Historical M1 prose evidence retains its original replay semantics.

Schema migrations run inside one immediate transaction when `PRAGMA user_version` advances. Schema versions 1 through 3 migrate to version 4. Version 4 rebuilds the event and command tables when necessary so the immutable event vocabulary can accept `THREAD_FROZEN` without rewriting existing event content. Opening an existing version-4 file also reruns idempotent schema creation so tables and triggers added by a later version-4 build are restored. PR #35's first additive obligation slice uses this established same-version repair mechanism; opening v4 also idempotently derives spent-authority tombstones from existing `authorization_consumptions`. No active Structured Obligation is inferred from `currentState.unresolvedIntentions`.

A later #35 authority cutover may increment the global schema version if it changes an existing authorization, freeze, or consumption table contract. The additive existence of new append-only tables alone does not force a version increment.

A normal command, event, idempotency record, and projection update commit in one world-store transaction. Runtime authorization, exclusive lease, and runtime-session creation commit in one runtime-store transaction after rereading Thread and private-stance witnesses.

Freeze uses a third interface over the same SQLite file because it owns a wider atomic boundary. One immediate freeze transaction rereads the Thread, authorization, lease, session, Actor, and Guardian witnesses and then atomically appends the freeze event, advances the projection, records accepted memories, records authorization consumption, records the freeze report, completes the session, and releases the lease.

Rejected-runtime closure uses a fourth interface over the same file. One immediate abandonment transaction rereads the active session, lease, authorization, and persisted Guardian reject, then appends the abandonment record, aborts the session, and releases the lease without advancing Thread life state or consuming authority.

Structured authority-withdrawal closure uses a separate bounded interface over the same file. It applies only to a structured compelled runtime with Actor evidence and Goal Guardian pass when the exact governing authority has become superseded, non-active, expired, or legacy-tombstoned before freeze. One immediate transaction appends the immutable withdrawal closure, aborts the runtime, and releases the lease with `governing_authority_withdrawn`; it records no freeze, consumes no authorization, and does not discharge the obligation.

The separate WorldStore, RuntimeStore, FreezeStore, LifecycleHardeningStore, Structured Obligation stores, and authority-withdrawal store preserve interface boundaries, not independent consistency domains. They use WAL and bounded busy timeouts. Cross-store invariants are never trusted from a prior application read; the transaction that writes the dependent records rereads every version, hash, ID, digest, lifecycle, and authorization witness it relies on.

Events, commands, requests, appraisals, private stances, authorizations, Actor runs, Guardian audits, runtime abandonments, structured authority-withdrawal closures, authorization consumptions, freeze reports, accepted memory rows, obligation revisions, applicability decisions, structured obligation discharges, and legacy-obligation tombstones are append-only. `thaw_leases` and `runtime_sessions` are mutable only for explicit lifecycle transitions. Triggers preserve immutable IDs, bindings, context, digests, and start times and permit only bounded completion, release, expiration, or abort metadata. Neither table permits deletion.

Successful obligation-mediated freeze is single-use in historical M1. The consumption record and `THREAD_FROZEN` event preserve the exact unresolved-intention reference, while the projection removes it from `currentState.unresolvedIntentions`. Historical M1 obligation identity is exact UTF-8 prose equality; whitespace, case, or Unicode-normalization differences are different provisional identities. The historical service requires any such reference to be present exactly in the Thread's current unresolved intentions.

Structured Obligation v1 does **not** promote those unresolved-intention strings into active obligations. A legitimate active commitment must be explicitly represented with stable ID, issuer/parties, scope, terms, provenance, visibility, satisfaction semantics, and Fibre-owned applicability evidence. Previously consumed exact references are migrated only to tombstones, preserving the invariant that spent authority remains spent.

A deliberate Guardian-reject abandonment is available only while the lease remains active and unexpired. If nobody closes the episode in time, later lease reclamation records a distinct timeout outcome through the persisted Guardian reject, expired lease, and aborted session; it does not synthesize an abandonment decision on the Thread's behalf. Failed freeze, Guardian reject, abandonment, state races, and lease expiry do not consume or discharge an obligation.

Normal projection reads verify identity, canonical hash, denormalized columns, and the last-event witness. Deterministic replay validates sequence, versions, event identity, command/operation digests, derived event IDs, command witnesses, authorization evidence, freeze-report witnesses, accepted memory references, legacy obligation discharge, and per-event state hashes before requiring the final replayed state to match the projection.

Runtime reads rederive acquisition, authorization, execution-context, session, Actor, and Guardian digests. Freeze reads additionally rederive the freeze operation, report, consumption, memory, event, and resulting-state witnesses. Abandonment reads rederive the closure record and verify matching Guardian reject, session abort, lease release, and non-consumption. The `THREAD_FROZEN` commit digest binds the request, session, authorization, report, Actor, Guardian, kernel completion time, exact decisions, discharged obligations, prior state, and resulting lifecycle status.

The public event API may project a safe subset of a private-backed event. The authoritative stored event remains replayable, while the public `THREAD_FROZEN` response exposes accepted memory references and counts but withholds concrete authorization, runtime, report, Actor, Guardian, causal, and private-rationale fields.

`provenance.lastEventId` is projection metadata. Seed normalizes the stored snapshot to its deterministic seed event.

The projection-repair operation rederives the current row from intact event history without rewriting life history.

SQLite is an M1/pre-M2 implementation choice, not a permanent world architecture. Event, command, version, identity, idempotency, lease, authorization, consumption, freeze, abandonment, obligation, applicability, and hash contracts remain explicit so a future adapter can preserve behavior.

Live Thread data is not committed to Git. The repository may contain synthetic fixtures, templates, redacted archives, schema examples, and human-inspectable test reports.
