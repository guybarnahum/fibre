# world-kernel

Owns validated commands, events, lifecycle transitions, restricted participation records, temporary cognition, freeze, rejected-runtime closure, provenance, and protected world laws.

## M1 storage profile

The local M1 implementation uses one SQLite database and one authoritative `PRAGMA user_version`. Schema version 4 governs every public, restricted, runtime, freeze, consumption, accepted-memory, and rejected-runtime-abandonment table.

Public world records:

- `threads` — current versioned projection and deterministic state hash;
- `thread_events` — ordered immutable `THREAD_SEEDED`, `SELF_MODEL_UPDATED`, and `THREAD_FROZEN` history;
- `commands` — accepted command/freeze-operation IDs and event/version witnesses.

Restricted records:

- `activation_requests` — immutable request attempts and request fingerprints;
- `request_appraisals` — Thread-owned historical context capsules;
- `private_participation_stances` — immutable private dignity opinions;
- `participation_authorizations` — immutable current-state execution decisions;
- `thaw_leases` — exclusive lease state;
- `runtime_sessions` — temporary-cognition state;
- `actor_runs` — immutable deterministic Actor proposals;
- `goal_guardian_audits` — immutable Goal Guardian audits;
- `authorization_consumptions` — one-time authorization and obligation-discharge witnesses;
- `freeze_reports` — restricted accepted/rejected change reports;
- `thread_memories` — accepted evidence-bearing memory records;
- `runtime_abandons` — immutable closure records for Guardian-rejected episodes.

Schema versions 1 through 3 migrate transactionally to version 4. Events, commands, requests, appraisals, private stances, authorizations, worker records, consumption records, freeze reports, memory records, and abandonment records are append-only.

`thaw_leases` and `runtime_sessions` are intentional mutable exceptions. Triggers preserve immutable identity, binding, context, digest, and start-time fields and permit only bounded status transitions. They cannot be deleted.

WorldStore, RuntimeStore, FreezeStore, and LifecycleHardeningStore use separate WAL connections over the same file to preserve interface boundaries. Cross-interface correctness is enforced by rereading every required witness inside the immediate transaction that writes dependent records.

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

`.fibre/` is ignored and rejected as tracked repository content. The process refuses non-loopback bind and Host authorities, enables no CORS, caps request bodies, uses `Cache-Control: no-store`, and returns stable errors without stack traces.

## Public routes

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/health` | Service, storage, preview, runtime, freeze, lifecycle-closure, and repair metadata |
| `POST` | `/threads` | Idempotently seed one immutable Thread origin |
| `GET` | `/threads/:threadId` | Read the integrity-checked projection |
| `GET` | `/threads/:threadId/events` | Read the ordered safe public timeline |
| `GET` | `/threads/:threadId/integrity` | Replay and compare projection plus freeze-created-memory integrity |
| `POST` | `/threads/:threadId/commands/preview` | Preview a deterministic command without writing |
| `POST` | `/threads/:threadId/commands` | Apply an exact preview-bound command |
| `POST` | `/threads/:threadId/repair-projection` | Token-protected projection repair |

The authoritative stored `THREAD_FROZEN` event remains fully replayable. Its public API projection exposes accepted memory references and counts but withholds concrete authorization, runtime, report, Actor, Guardian, causal, and private-rationale fields. Rejected-runtime abandonment never appears in public Thread history because it changes temporary runtime state, not durable Thread life state.

## Restricted request routes

Every path below `/threads/:threadId/private` requires `x-fibre-private-token` before route dispatch.

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/threads/:threadId/private/requests` | List restricted request summaries |
| `POST` | `/threads/:threadId/private/requests` | Persist a request and Thread-owned appraisal capsule |
| `GET` | `/threads/:threadId/private/requests/:requestId` | Read one complete private trace |
| `GET` | `/threads/:threadId/private/requests/:requestId/integrity` | Verify the private trace against historical replay |
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
| `GET` | `/threads/:threadId/private/runtime/:sessionId/abandon/integrity` | Verify abandonment, runtime closure, and non-consumption |
| `POST` | `/threads/:threadId/private/runtime/:sessionId/abandon` | Explicitly close a Guardian-rejected runtime without consumption |

Runtime, freeze, and abandonment mutation requests accept operation IDs and domain inputs only. The kernel owns authorization issuance, lease acquisition/expiry, Actor completion, Guardian completion, freeze completion, and abandonment timestamps. Caller-supplied timestamps are rejected.

## Authorization and lease boundary

A private stance is not execution authority. Runtime acquisition revalidates the current Thread and exact request chain, then persists one accepted Participation Authorization bound to:

- Thread ID, current version, and state hash;
- request ID, fingerprint, and requester;
- appraisal and private-stance IDs;
- dignity policy, score, band, evidence, and relationship target;
- any obligation-mediated override.

Only `authorizedAction: accept` can acquire a lease. A non-accept private desire can be overridden only by a non-empty reference currently present in `currentState.unresolvedIntentions` and absent from all historical discharge records. The service checks that history before acquisition, and a SQLite insertion trigger independently rejects direct creation of an authorization that reuses a discharged obligation.

A partial unique index permits one active lease per Thread, including across separate SQLite connections. At real kernel-clock expiry, a later acquisition may mark the old lease expired and its active session aborted before creating a replacement. Aborted, abandoned, completed, or expired sessions cannot continue work.

## Deterministic Actor and Goal Guardian

The M1 Actor is a deterministic proposal worker. It produces a bounded plan, declares no tool calls, declares no direct world commands, and may propose one memory change citing selected Thread-owned evidence. It cannot write authoritative state.

The M1 Goal Guardian is a declaration and consistency auditor, not a capability sandbox. It verifies Thread/request/objective/authorization binding, declared tool and command absence, and bounded life-change evidence. Every check is independently falsifiable, and a divergent test Actor can produce a durable `reject`.

A future model- or tool-capable Actor requires an isolated worker/tool gateway that records independently observed tool calls and command attempts. Self-declaration is not sufficient for production capability enforcement.

## Freeze boundary

Freeze is the only current path from Actor proposal to authoritative Thread state.

The request supplies:

```json
{
  "operationId": "op_freeze_...",
  "lifeChangeDecisions": [
    {
      "proposalIndex": 0,
      "decision": "accept",
      "rationale": "Evidence-bearing memory."
    }
  ],
  "causationId": "cause_...",
  "correlationId": "corr_..."
}
```

Each decision rationale is limited to 4096 UTF-8 bytes before append-only persistence.

Freeze requires:

- current Thread version and state hash matching the runtime snapshot;
- active, unexpired lease and session;
- accepted and unconsumed authorization;
- persisted Actor output;
- persisted Goal Guardian decision `pass`;
- no declared tool calls or direct commands;
- one explicit accept/reject decision for every proposal;
- supported memory proposals citing selected Thread-owned evidence.

One immediate transaction:

1. rereads all Thread/runtime/authorization/worker witnesses;
2. appends `THREAD_FROZEN` and its operation witness;
3. advances the Thread projection and state hash;
4. records accepted memory rows and rejected rationale;
5. consumes authorization once;
6. discharges any obligation used to override private stance;
7. completes the runtime session; and
8. releases the lease.

A successful obligation-mediated freeze removes the exact reference from `unresolvedIntentions` and preserves it in consumption and event history. That historical consumption permanently prevents another override using the same reference, even if identical text is reintroduced later. Failure, Guardian reject, abandonment, expiry, or state races consume nothing.

Exact retry returns the original freeze report. Another operation after successful consumption returns `AUTHORIZATION_CONSUMED`.

## Guardian-reject abandonment

A rejected cognition episode may be closed deliberately rather than occupying the Thread's lease until timeout.

The request supplies:

```json
{
  "operationId": "op_abandon_...",
  "causationId": "cause_...",
  "correlationId": "corr_..."
}
```

Abandonment requires:

- an active, unexpired session and lease;
- a persisted Goal Guardian audit with decision `reject`;
- no freeze report;
- no authorization consumption.

One immediate transaction appends an immutable `runtime_abandons` record, marks the session `aborted`, and releases the lease with reason `guardian_rejected_abandon`. It does not advance the Thread version, append a public life event, consume the Participation Authorization, or discharge an obligation.

Exact retry returns the original record. Changed operation reuse returns `RUNTIME_ABANDON_CONFLICT`. A Guardian-pass runtime, expired runtime, completed runtime, or runtime that already affected authoritative state returns `RUNTIME_ABANDON_REJECTED`.

After explicit closure, a fresh request-attempt ID under the same correlation lineage may acquire a new runtime immediately.

## Replay and integrity

The `THREAD_FROZEN` commit digest binds:

- request, session, authorization, report, Actor-run, and Guardian-audit IDs;
- Actor and Guardian content digests;
- kernel completion time;
- exact freeze operation and decisions;
- accepted/rejected life changes;
- discharged obligations;
- prior state hash and resulting lifecycle status.

Replay reconstructs the freeze-report digest from the event, rederives the operation/commit digests and event ID, applies accepted memory refs and obligation discharge, and verifies the resulting state hash.

Thread integrity compares the exact generated-memory set across accepted changes in all freeze reports, `thread_memories`, and projection `memoryRefs`. It also rederives each memory digest and checks event/session binding. Missing, extra, or substituted memory records therefore fail integrity rather than remaining an unnoticed secondary-table divergence.

Abandonment integrity rederives the immutable abandonment digest, verifies the persisted Guardian reject, requires matching aborted/released lifecycle state, and proves the authorization was not consumed and the session was not frozen.

A separate-process freeze test restarts the service and recovers the same state and freeze integrity with a completed session, released lease, and no active runtime.

## Error mapping

- malformed input → `400`;
- forbidden private/admin access → `403`;
- missing Thread, request, runtime, freeze, abandonment, or route → `404`;
- unsupported method → `405`;
- operation conflict → `409 RUNTIME_CONFLICT`, `409 FREEZE_CONFLICT`, or `409 RUNTIME_ABANDON_CONFLICT`;
- changed Thread/runtime witness → `409 RUNTIME_STATE_CHANGED` or `409 FREEZE_STATE_CHANGED`;
- overlapping lease → `409 THAW_LEASE_CONFLICT`;
- inactive/aborted runtime → `409 RUNTIME_ORDER_REJECTED`;
- lease expiry → `409 THAW_LEASE_EXPIRED`;
- consumed authorization → `409 AUTHORIZATION_CONSUMED`;
- rejected authorization → `422 PARTICIPATION_AUTHORIZATION_REJECTED`;
- invalid freeze boundary → `422 FREEZE_REJECTED`;
- invalid abandonment boundary → `422 RUNTIME_ABANDON_REJECTED`;
- storage busy, disabled private/repair access, or integrity failure → `503`.

`FREEZE_CONFLICT` and `FREEZE_STATE_CHANGED` remain intentionally distinct stable codes: operation/idempotency reuse is different from a current-state race and requires a different recovery path.

## Deliberate scope boundary

The service remains a deterministic, single-user, local M1 process. It is not production authentication, distributed leasing, worker isolation, a tool gateway, a model provider, a remote communication system, or a production database topology.

The next product slices are the API-backed Thread Editor and one consolidated Mina persistent-round-trip demonstration. Persistent live-kernel disclosure strategy and audience-visible response remain unfinished. LLM or worker output still cannot write world state directly.
