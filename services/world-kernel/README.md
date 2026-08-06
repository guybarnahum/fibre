# world-kernel

Owns validated commands, events, lifecycle transitions, restricted participation records, temporary cognition, freeze, rejected-runtime closure, provenance, and protected world laws.

## Deterministic M1 baseline

The local M1 implementation uses one SQLite database and one authoritative `PRAGMA user_version`. Schema version 4 governs public world state, restricted participation, runtime, freeze, authorization consumption, accepted memories, and rejected-runtime abandonment.

Public records:

- `threads` — current versioned projection and deterministic state hash;
- `thread_events` — immutable `THREAD_SEEDED`, `SELF_MODEL_UPDATED`, and `THREAD_FROZEN` history;
- `commands` — accepted command/freeze operation witnesses.

Restricted records:

- activation requests, request appraisals, and private participation stances;
- participation authorizations, thaw leases, runtime sessions, Actor runs, and Goal Guardian audits;
- authorization consumptions, freeze reports, accepted memories, and runtime abandonments.

Events, commands, requests, appraisals, stances, authorizations, workers, consumptions, freeze reports, memories, and abandonment records are append-only. Lease and session rows are intentional trigger-constrained mutable lifecycle records and cannot be deleted.

WorldStore, RuntimeStore, FreezeStore, and LifecycleHardeningStore use separate WAL connections over the same file. Every dependent write rereads its required cross-interface witnesses inside the immediate transaction.

## Run the complete proof

```bash
npm run demo:m1
```

The consolidated runner starts independent kernel and credentialed editor processes, generates local credentials, communicates through HTTP only, and proves Mina's complete persistent round trip:

- seed and restart equality;
- stale request-attempt rejection and correlated recovery;
- admin-authorized self-model change;
- accepted runtime, Actor, Guardian pass, and atomic freeze;
- divergent Actor, Guardian reject, and explicit non-consuming abandonment;
- unattended timeout observed from kernel time and later lazy reclaim;
- obligation-mediated authorization, discharge, and permanent reuse rejection;
- final restart/replay equality, two accepted memories, replay rejection, and zero active runtimes.

## Inspect a completed world

Run the full proof and keep its completed world live in the Thread Editor:

```bash
npm run demo:m1:editor
```

The command prints a credentialed editor URL and the retained SQLite path. It uses free loopback ports and fresh credentials. Press Ctrl-C to stop the local servers; the database remains available unless `--delete-on-exit` is supplied.

Verify and summarize any retained current-schema Fibre database with:

```bash
npm run inspect:db -- "/path/to/world.sqlite"
npm run inspect:db -- "/path/to/world.sqlite" --json
```

The inspector checks SQLite integrity, foreign keys, schema completeness, Thread replay and projection hashes, private traces, runtime witnesses, freeze and consumption records, abandonment non-consumption, and accepted-memory projection. It reports failures without repairing the database.

## Start the normal local process

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

The process refuses non-loopback bind and Host authorities, enables no CORS, caps request bodies, uses `Cache-Control: no-store`, and returns stable errors without stack traces. `.fibre/` is ignored and rejected as tracked repository content.

`GET /health` publishes `kernelTime` from the lifecycle clock used for authorization, leases, Actor, Guardian, freeze, and abandonment. Read surfaces interpret expiry from this timestamp rather than browser time.

## Public and administrative routes

| Method | Route | Authority | Purpose |
|---|---|---|---|
| `GET` | `/health` | public loopback | Service, storage, profile, repair, and kernel-time metadata |
| `POST` | `/threads` | public loopback M1 seed | Idempotently seed one immutable Thread origin |
| `GET` | `/threads/:threadId` | public loopback | Read the integrity-checked projection |
| `GET` | `/threads/:threadId/events` | public loopback | Read the safe ordered public timeline |
| `GET` | `/threads/:threadId/integrity` | public loopback | Replay and compare projection and memory integrity |
| `POST` | `/threads/:threadId/commands/preview` | public loopback | Preview a deterministic command without writing |
| `POST` | `/threads/:threadId/commands` | `x-fibre-admin-token` | Apply an exact preview-bound command |
| `POST` | `/threads/:threadId/repair-projection` | `x-fibre-admin-token` | Rebuild projection from immutable history |

Without `FIBRE_ADMIN_TOKEN`, command acceptance returns `503 COMMAND_ACCEPTANCE_DISABLED` and repair returns `503 REPAIR_DISABLED`. Missing or incorrect configured credentials return `403 ADMIN_TOKEN_REQUIRED`.

Command preview is public and non-mutating. Preview identity is deterministic and derivable from its receipt; possession of a preview is not authority. Administrative authentication is the write boundary.

## Restricted participation and runtime routes

Every path below `/threads/:threadId/private` requires `x-fibre-private-token` before private route dispatch.

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/threads/:threadId/private/requests` | List request-attempt summaries |
| `POST` | `/threads/:threadId/private/requests` | Persist request and Thread-owned appraisal |
| `GET` | `/threads/:threadId/private/requests/:requestId` | Read complete private trace |
| `GET` | `/threads/:threadId/private/requests/:requestId/integrity` | Verify historical trace |
| `POST` | `/threads/:threadId/private/requests/:requestId/stance` | Persist private participation stance |
| `POST` | `/threads/:threadId/private/requests/:requestId/runtime` | Issue accepted authorization and acquire lease/session |
| `GET` | `/threads/:threadId/private/runtime` | List runtime summaries |
| `GET` | `/threads/:threadId/private/runtime/:sessionId` | Read complete runtime |
| `GET` | `/threads/:threadId/private/runtime/:sessionId/integrity` | Verify runtime witnesses |
| `POST` | `/threads/:threadId/private/runtime/:sessionId/actor` | Run deterministic Actor |
| `POST` | `/threads/:threadId/private/runtime/:sessionId/goal-guardian` | Audit Actor output |
| `GET/POST` | `/threads/:threadId/private/runtime/:sessionId/freeze` | Read or atomically freeze explicit decisions |
| `GET` | `/threads/:threadId/private/runtime/:sessionId/freeze/integrity` | Verify freeze and consumption |
| `GET/POST` | `/threads/:threadId/private/runtime/:sessionId/abandon` | Read or close Guardian-rejected runtime |
| `GET` | `/threads/:threadId/private/runtime/:sessionId/abandon/integrity` | Verify closure and non-consumption |

A request ID identifies one immutable attempt. After Thread advancement, historical authorization is rejected with an instruction to create a new request ID under the same correlation ID.

## Authorization and lease boundary

A private stance is not execution authority. Runtime acquisition revalidates the exact request chain against current Thread version and state hash, then persists accepted Participation Authorization, one exclusive lease, and one runtime session atomically.

A private non-accept desire can be overridden only by an exact currently owned unresolved-intention reference that has never been discharged. M1 uses exact UTF-8 prose identity; structured obligations are post-M1 work.

A partial unique index permits one active lease per Thread, including across separate SQLite connections. When kernel time passes `expiresAt`, the attention window is timed out even if the stored row remains `active` until later acquisition lazily marks it `expired` and aborts its session.

## Actor and Goal Guardian

The deterministic M1 Actor produces proposals only, performs no external tools or network calls, issues no direct world commands, and sends no requester-facing communication. It cannot mutate authoritative state.

Goal Guardian is a declaration and consistency auditor, not a capability sandbox. A future model-, network-, or tool-capable Actor requires an isolated worker/tool gateway with independently observed traces.

## Freeze and rejected closure

Freeze is the only current path from Actor proposal to Thread life. It requires current state, active unexpired runtime, accepted unconsumed authorization, persisted Actor output, Guardian `pass`, no declared tool/direct-command activity, and one explicit decision for every proposal.

One immediate transaction appends `THREAD_FROZEN`, advances the projection, records accepted memories and rejected rationale, consumes authorization, discharges any override obligation, completes the session, and releases the lease. Each rationale is limited to 4096 UTF-8 bytes.

Exact retry returns the original report. A different operation after successful consumption returns `AUTHORIZATION_CONSUMED`.

A Guardian-rejected active runtime may instead be explicitly abandoned. One transaction appends immutable restricted closure, aborts the session, and releases the lease while consuming neither authorization nor obligation and appending no public Thread life event. Expiry is a separate timeout and cannot be rewritten as synthetic abandonment.

## Replay and privacy

The `THREAD_FROZEN` witness binds request, session, authorization, report, Actor, Guardian, kernel completion time, exact decisions, accepted/rejected changes, discharged obligations, prior state, and resulting state.

Replay reconstructs the freeze report, operation and commit digests, event ID, memory refs, obligation discharge, and resulting state hash. Thread integrity cross-checks freeze reports, `thread_memories`, and projection `memoryRefs`.

Public `THREAD_FROZEN` projections expose safe accepted-memory references and counts while withholding private authorization, runtime, Actor, Guardian, causal, and rationale fields. Runtime abandonment remains restricted because it changes temporary runtime state, not Thread life.

## Scope boundary

The deterministic M1 persistent lifecycle is complete. Persistent disclosure strategy and audience-visible external response remain separate post-M1 records and must not be inferred from Actor output or freeze.

The local service is not production authentication, distributed leasing, worker isolation, a tool gateway, a model provider, remote communication, or production database topology.
