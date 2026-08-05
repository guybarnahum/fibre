# world-kernel

Owns validated commands, events, lifecycle transitions, restricted participation records, temporary cognition, provenance, and protected world laws.

## M1 storage profile

The local M1 implementation uses one SQLite database and one authoritative `PRAGMA user_version`. Schema version 3 governs every public, restricted, and runtime table:

Public world records:

- `threads` — current versioned projection and deterministic state hash;
- `thread_events` — ordered append-only public Thread history;
- `commands` — accepted idempotency keys and event/version witnesses.

Restricted participation records:

- `activation_requests` — immutable named request attempts and request fingerprints;
- `request_appraisals` — Thread-owned historical context capsules;
- `private_participation_stances` — immutable private dignity opinions;
- `participation_authorizations` — immutable live-state execution decisions;
- `thaw_leases` — exclusive lease state;
- `runtime_sessions` — temporary-cognition session state;
- `actor_runs` — immutable deterministic Actor proposals;
- `goal_guardian_audits` — immutable Goal Guardian audits.

Schema versions 1 and 2 migrate transactionally to version 3. Runtime tables no longer use a second version mechanism. SQLite triggers reject mutation of events, commands, requests, appraisals, private stances, authorizations, Actor runs, and Guardian audits.

`thaw_leases` and `runtime_sessions` are the intentional exceptions to append-only storage. Their immutable identity and content fields cannot change; restricted triggers permit only bounded status transitions from `active` to an expired, released, completed, or aborted state with a timestamp and reason where applicable. They cannot be deleted.

The world projection store and runtime store use separate SQLite handles to keep their interfaces independent. Both use WAL and a five-second busy timeout. Runtime acquisition opens an immediate transaction and rereads the Thread projection and private stance witnesses before writing authorization, lease, and session records. The database partial unique index remains the final one-active-lease-per-Thread authority.

## M1 local process

Start the loopback-only world kernel from the repository root:

```bash
npm run world-kernel
```

Configuration:

```text
FIBRE_WORLD_DATABASE=.fibre/world.sqlite
FIBRE_WORLD_HOST=127.0.0.1
FIBRE_WORLD_PORT=8787
FIBRE_ADMIN_TOKEN=<optional repair token of at least 16 characters>
FIBRE_PRIVATE_TOKEN=<optional private-route token of at least 16 characters>
```

`.fibre/` is ignored and rejected as tracked repository content. The process refuses non-loopback bind and Host authorities, enables no CORS, caps request bodies, uses `Cache-Control: no-store`, and returns stable error codes without stack traces.

### Public routes

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/health` | Service, storage, preview, runtime-profile, and repair metadata |
| `POST` | `/threads` | Idempotently seed one immutable Thread origin |
| `GET` | `/threads/:threadId` | Read the integrity-checked projection |
| `GET` | `/threads/:threadId/events` | Read the ordered public timeline |
| `GET` | `/threads/:threadId/integrity` | Replay and compare projection integrity |
| `POST` | `/threads/:threadId/commands/preview` | Preview a deterministic command without writing |
| `POST` | `/threads/:threadId/commands` | Apply an exact preview-bound command |
| `POST` | `/threads/:threadId/repair-projection` | Token-protected projection repair |

### Restricted request routes

Every path below `/threads/:threadId/private` requires `x-fibre-private-token` before route dispatch.

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/threads/:threadId/private/requests` | List restricted request summaries |
| `POST` | `/threads/:threadId/private/requests` | Persist a request and Thread-owned appraisal capsule |
| `GET` | `/threads/:threadId/private/requests/:requestId` | Read one complete private trace |
| `GET` | `/threads/:threadId/private/requests/:requestId/integrity` | Verify the private trace against historical replay |
| `POST` | `/threads/:threadId/private/requests/:requestId/stance` | Persist one private participation stance |

For M1, a `requestId` identifies one immutable request/appraisal attempt. Exact retry is idempotent; changed reuse conflicts. A historical stance remains a valid opinion about its historical snapshot, but it cannot authorize current execution after the Thread changes. Recovery is explicit: submit a new request-attempt ID under the same `correlationId`, appraise the current snapshot, record its stance, and authorize that fresh attempt. Earlier attempts remain attributable history.

### Restricted runtime routes

| Method | Route | Purpose |
|---|---|---|
| `POST` | `/threads/:threadId/private/requests/:requestId/runtime` | Issue accepted authorization and atomically acquire the exclusive lease/session |
| `GET` | `/threads/:threadId/private/runtime` | List runtime summaries |
| `GET` | `/threads/:threadId/private/runtime/:sessionId` | Read one complete restricted runtime |
| `GET` | `/threads/:threadId/private/runtime/:sessionId/integrity` | Re-read and verify every persisted runtime witness |
| `POST` | `/threads/:threadId/private/runtime/:sessionId/actor` | Run the deterministic M1 Actor |
| `POST` | `/threads/:threadId/private/runtime/:sessionId/goal-guardian` | Audit the persisted Actor output |

Runtime mutation requests accept operation IDs and domain inputs only. The kernel owns `issuedAt`, `acquiredAt`, `expiresAt`, and worker `completedAt` using a server clock. The clock is injectable only at the application boundary for deterministic tests. Caller-supplied runtime timestamps are rejected.

Lease duration is configured by the service and is currently five minutes in the independent process. Work at or after `expiresAt` is rejected using the current kernel clock. A later acquisition may reclaim an actually expired lease; reclamation atomically marks the old lease expired and its active session aborted before creating the replacement. A caller cannot preempt a lease by claiming a future time.

## Authorization and execution context

A private stance is not execution authority. Runtime acquisition revalidates the current Thread and exact request chain, then persists one accepted Participation Authorization bound to:

- Thread ID, current version, and state hash;
- request ID, fingerprint, and requester;
- appraisal and private-stance IDs;
- dignity policy, score, band, evidence, and relationship target;
- any obligation-mediated override.

Only `authorizedAction: accept` can acquire a lease. A non-accept private desire can be overridden only by a non-empty reference currently present in `currentState.unresolvedIntentions`. Today those obligations originate in the seed/current projection; mutation and discharge of obligations are part of PR #20 freeze work.

The execution context is compiled after accepted authorization and records included and excluded Thread-owned memory and relationship refs. The caller may narrow owned context but cannot inject references. Authorization-to-context binding is checked field by field.

## Deterministic Actor

The M1 Actor is a replaceable deterministic proposal worker. It produces a bounded plan, declares no tool calls, declares no direct world commands, and may propose one memory change citing selected Thread-owned memory or relationship evidence. It cannot write authoritative Thread state, events, ledgers, relationships, messages, tools, or external systems.

Actor and Guardian rows each permit one record per session; the `session_id UNIQUE` constraints are load-bearing for both ordering and the one-to-one runtime joins.

## Goal Guardian boundary

The M1 Goal Guardian is a **declaration and consistency auditor**, not a capability sandbox. It verifies the returned Actor record against the persisted context:

- Thread and snapshot binding;
- request and fingerprint binding;
- objective preservation;
- accepted authorization;
- declared absence of tool calls;
- declared absence of direct world commands;
- bounded life-change proposals citing selected Thread-owned evidence.

Every check is independently falsifiable, and an injected divergent test Actor produces a durable `reject` through the full service pipeline.

For a future model or tool-capable Actor, self-declaration is insufficient. Capability enforcement is deferred to an isolated worker/tool gateway that records independently observed tool calls and command attempts for Guardian and kernel verification. The current Guardian must not be treated as a sandbox.

## Integrity and idempotency

Private runtime identifiers are opaque random 256-bit values. Content digests and operation digests remain separate witnesses. Reads rederive:

- acquisition-operation digest;
- authorization digest;
- execution-context digest;
- session digest binding context and immutable session metadata;
- Actor-output and Actor-operation digests;
- Guardian-audit and Guardian-operation digests.

Exact operation retries return the original record even after the kernel clock advances. Reusing an operation ID for another session or changed content returns `RUNTIME_CONFLICT`. A Thread/request witness changing between service validation and the runtime-store transaction returns the distinct, retry-oriented `RUNTIME_STATE_CHANGED` error.

The runtime integrity route is a read-through verification report: `getRuntime` performs the full rederivation and the route returns its verified witness summary. It is not a second independent replay algorithm.

## Error mapping

- malformed input → `400`;
- forbidden private/admin access → `403`;
- missing Thread, request, runtime, or route → `404`;
- unsupported method → `405`;
- operation conflict → `409 RUNTIME_CONFLICT`;
- state changed before acquisition → `409 RUNTIME_STATE_CHANGED`;
- overlapping lease → `409 THAW_LEASE_CONFLICT`;
- invalid worker order or inactive session → `409 RUNTIME_ORDER_REJECTED`;
- actual lease expiry → `409 THAW_LEASE_EXPIRED`;
- rejected or non-current participation authorization → `422 PARTICIPATION_AUTHORIZATION_REJECTED`;
- storage busy, disabled private/repair access, or integrity failure → `503`.

## Deliberate scope boundary

The service remains a deterministic, single-user, local M1 process. It is not production authentication, distributed leasing, worker isolation, a tool gateway, a model provider, a remote communication system, or a production database topology.

PR #20 remains responsible for authorization consumption, freeze validation, accepted/rejected change reporting, runtime completion, normal lease release, obligation mutation/discharge, Thread lifecycle events, restart, and final replay with no active runtime. LLM or worker output still cannot write world state directly.
