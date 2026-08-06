# world-kernel

Owns validated commands, events, lifecycle transitions, restricted participation records, temporary cognition, freeze, rejected-runtime closure, provenance, and protected world laws.

## M1 storage profile

The local M1 implementation uses one SQLite database and one authoritative `PRAGMA user_version`. Schema version 4 governs every public, restricted, runtime, freeze, consumption, accepted-memory, and rejected-runtime-abandonment table.

Public world records:

- `threads` — current versioned projection and deterministic state hash;
- `thread_events` — ordered immutable `THREAD_SEEDED`, `SELF_MODEL_UPDATED`, and `THREAD_FROZEN` history;
- `commands` — accepted command/freeze-operation IDs and event/version witnesses.

Restricted records:

- `activation_requests` and `request_appraisals`;
- `private_participation_stances` and `participation_authorizations`;
- `thaw_leases`, `runtime_sessions`, `actor_runs`, and `goal_guardian_audits`;
- `authorization_consumptions`, `freeze_reports`, `thread_memories`, and `runtime_abandons`.

Schema versions 1 through 3 migrate transactionally to version 4. Events, commands, requests, appraisals, private stances, authorizations, worker records, consumption records, freeze reports, memory records, and abandonment records are append-only.

`thaw_leases` and `runtime_sessions` are intentional mutable exceptions. Triggers preserve immutable identity, binding, context, digest, and start-time fields and permit only bounded lifecycle transitions. They cannot be deleted.

WorldStore, RuntimeStore, FreezeStore, and LifecycleHardeningStore use separate WAL connections over the same file. Every dependent write rereads its required cross-interface witnesses inside the immediate transaction.

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
FIBRE_ADMIN_TOKEN=<optional command-acceptance and repair token, at least 16 characters>
FIBRE_PRIVATE_TOKEN=<optional private-route token, at least 16 characters>
```

`.fibre/` is ignored and rejected as tracked repository content. The process refuses non-loopback bind and Host authorities, enables no CORS, caps request bodies, uses `Cache-Control: no-store`, and returns stable errors without stack traces.

`GET /health` publishes `kernelTime` from the same lifecycle clock used for authorization, leases, Actor, Guardian, freeze, and abandonment. Read surfaces use that timestamp to interpret lease expiry without trusting a browser or proxy clock.

## Public and administrative routes

| Method | Route | Authority | Purpose |
|---|---|---|---|
| `GET` | `/health` | public loopback | Service, storage, profile, repair, and kernel-time metadata |
| `POST` | `/threads` | public loopback M1 seed | Idempotently seed one immutable Thread origin |
| `GET` | `/threads/:threadId` | public loopback | Read the integrity-checked projection |
| `GET` | `/threads/:threadId/events` | public loopback | Read the ordered safe public timeline |
| `GET` | `/threads/:threadId/integrity` | public loopback | Replay and compare projection and memory integrity |
| `POST` | `/threads/:threadId/commands/preview` | public loopback | Preview a deterministic command without writing |
| `POST` | `/threads/:threadId/commands` | `x-fibre-admin-token` | Apply an exact preview-bound command |
| `POST` | `/threads/:threadId/repair-projection` | `x-fibre-admin-token` | Rebuild the projection from immutable history |

When `FIBRE_ADMIN_TOKEN` is absent, live command acceptance returns `503 COMMAND_ACCEPTANCE_DISABLED` and repair returns `503 REPAIR_DISABLED`. When configured, missing or incorrect credentials return `403 ADMIN_TOKEN_REQUIRED`.

Command preview is non-mutating and does not grant consent, Participation Authorization, or write authority. A caller must possess both the exact command/preview witness and administrative authority to accept it through the independently running process.

The authoritative stored `THREAD_FROZEN` event remains fully replayable. Its public API projection exposes accepted memory references and counts but withholds authorization, runtime, report, Actor, Guardian, causal, and private-rationale fields. Runtime abandonment never appears in public Thread history because it changes temporary runtime state rather than durable Thread life state.

## Restricted request routes

Every path below `/threads/:threadId/private` requires `x-fibre-private-token` before private route dispatch.

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/threads/:threadId/private/requests` | List restricted request summaries |
| `POST` | `/threads/:threadId/private/requests` | Persist a request and Thread-owned appraisal capsule |
| `GET` | `/threads/:threadId/private/requests/:requestId` | Read one complete private trace |
| `GET` | `/threads/:threadId/private/requests/:requestId/integrity` | Verify the trace against historical replay |
| `POST` | `/threads/:threadId/private/requests/:requestId/stance` | Persist one private participation stance |

A request ID identifies one immutable request/appraisal attempt. A historical stance remains a valid opinion about its historical snapshot, but cannot authorize execution after the Thread changes. Recovery uses a new request-attempt ID under the same correlation ID.

## Restricted runtime, freeze, and abandonment routes

| Method | Route | Purpose |
|---|---|---|
| `POST` | `/threads/:threadId/private/requests/:requestId/runtime` | Issue accepted authorization and atomically acquire lease/session |
| `GET` | `/threads/:threadId/private/runtime` | List runtime summaries |
| `GET` | `/threads/:threadId/private/runtime/:sessionId` | Read one complete restricted runtime |
| `GET` | `/threads/:threadId/private/runtime/:sessionId/integrity` | Verify every persisted runtime witness |
| `POST` | `/threads/:threadId/private/runtime/:sessionId/actor` | Run the deterministic M1 Actor |
| `POST` | `/threads/:threadId/private/runtime/:sessionId/goal-guardian` | Audit the persisted Actor output |
| `GET` | `/threads/:threadId/private/runtime/:sessionId/freeze` | Read the restricted freeze report |
| `GET` | `/threads/:threadId/private/runtime/:sessionId/freeze/integrity` | Verify freeze, consumption, event, memory, and Thread witnesses |
| `POST` | `/threads/:threadId/private/runtime/:sessionId/freeze` | Atomically freeze explicit life-change decisions |
| `GET` | `/threads/:threadId/private/runtime/:sessionId/abandon` | Read the Guardian-reject abandonment record |
| `GET` | `/threads/:threadId/private/runtime/:sessionId/abandon/integrity` | Verify closure and non-consumption |
| `POST` | `/threads/:threadId/private/runtime/:sessionId/abandon` | Close a Guardian-rejected runtime without consumption |

Runtime, freeze, and abandonment mutation requests accept operation IDs and domain inputs only. The kernel owns authorization issuance, lease acquisition/expiry, Actor completion, Guardian completion, freeze completion, and abandonment timestamps. Caller timestamps are rejected.

## Authorization and lease boundary

A private stance is not execution authority. Runtime acquisition revalidates the current Thread and exact request chain, then persists one accepted Participation Authorization bound to:

- Thread ID, current version, and state hash;
- request ID, fingerprint, and requester;
- appraisal and private-stance IDs;
- dignity policy, score, band, evidence, and relationship target;
- any obligation-mediated override.

Only `authorizedAction: accept` can acquire a lease. A non-accept private desire can be overridden only by a non-empty obligation reference currently present in `currentState.unresolvedIntentions` and absent from all historical discharge records.

A partial unique index permits one active lease per Thread, including across separate SQLite connections. At kernel-observed expiry, a later acquisition may mark the old lease expired and its active session aborted before creating a replacement. Before that lazy reclaim, `expiresAt <= kernelTime` still means the attention window has timed out even if the stored lease status remains `active`.

## Deterministic Actor and Goal Guardian

The M1 Actor is a deterministic proposal worker. It produces a bounded plan, declares no tool calls or direct world commands, and may propose one memory change citing selected Thread-owned evidence. It cannot write authoritative state.

The M1 Goal Guardian is a declaration and consistency auditor, not a capability sandbox. It verifies Thread/request/objective/authorization binding, declared tool and command absence, and bounded life-change evidence. A future model- or tool-capable Actor requires an isolated worker/tool gateway with independently observed capability traces.

## Freeze boundary

Freeze is the only current path from Actor proposal to authoritative Thread state. It requires:

- current Thread version and state hash matching the runtime snapshot;
- active, unexpired lease and session;
- accepted and unconsumed authorization;
- persisted Actor output and Goal Guardian `pass`;
- no declared tool calls or direct commands;
- one explicit accept/reject decision for every proposal;
- supported memory proposals citing selected Thread-owned evidence.

Each decision rationale is limited to 4096 UTF-8 bytes. One immediate transaction appends `THREAD_FROZEN`, advances the projection, records accepted memories and rejected rationale, consumes authorization once, discharges any override obligation, completes the session, and releases the lease.

Successful obligation-mediated freeze removes the exact reference from `unresolvedIntentions` and preserves it in consumption/event history. Historical consumption prevents the identical reference from authorizing another override even if later reintroduced. Failure, Guardian reject, abandonment, expiry, or state races consume nothing.

Exact retry returns the original freeze report. Another operation after successful consumption returns `AUTHORIZATION_CONSUMED`.

## Guardian-reject abandonment

A rejected cognition episode may be closed deliberately rather than occupying the lease until timeout. Abandonment requires an active unexpired session/lease, persisted Guardian `reject`, and no freeze or consumption.

One immediate transaction appends an immutable `runtime_abandons` record, marks the session `aborted`, and releases the lease with reason `guardian_rejected_abandon`. It does not advance the Thread version, append a public life event, consume authorization, or discharge an obligation.

Exact retry returns the original record. Changed reuse returns `RUNTIME_ABANDON_CONFLICT`. Expiry remains a separate diagnosable timeout and cannot be rewritten as a synthetic abandonment.

## Replay and integrity

The `THREAD_FROZEN` commit digest binds request, session, authorization, report, Actor, Guardian, kernel time, exact decisions, accepted/rejected life changes, discharged obligations, prior state, and resulting state.

Replay reconstructs the freeze-report digest, operation and commit digests, event ID, memory refs, obligation discharge, and resulting state hash. Thread integrity compares the exact generated-memory set across freeze reports, `thread_memories`, and projection `memoryRefs` and checks every memory digest and event/session binding.

Abandonment integrity rederives the immutable abandonment digest, verifies the Guardian reject, requires matching aborted/released lifecycle state, and proves no consumption or freeze occurred.

## Stable error families

- malformed input → `400`;
- forbidden private/admin access → `403`;
- missing resource or route → `404`;
- unsupported method → `405`;
- command acceptance disabled → `503 COMMAND_ACCEPTANCE_DISABLED`;
- operation/state conflicts → stable `409` codes;
- rejected authorization/freeze/abandonment → stable `422` codes;
- storage busy, disabled private/repair access, or integrity failure → `503`.

## Deliberate scope boundary

The service remains a deterministic, single-user, local M1 process. Its local tokens are not production authentication or principal identity. It is not distributed leasing, worker isolation, a tool gateway, a model provider, remote communication, or production database topology.

The sole remaining planned M1 slice is the consolidated Mina persistent-round-trip demonstration through the independently running kernel and credentialed API-backed Thread Editor. Persistent live-kernel disclosure strategy and audience-visible response remain unfinished. LLM or worker output still cannot write world state directly.
