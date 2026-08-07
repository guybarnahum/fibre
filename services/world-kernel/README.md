# world-kernel

Owns validated commands, events, lifecycle transitions, restricted participation and expression records, temporary cognition, freeze, rejected-runtime closure, provenance, and protected world laws.

## Deterministic M1 baseline — fully closed

The local M1 implementation uses one SQLite database and one authoritative `PRAGMA user_version`. Schema version 4 governs public world state, restricted participation, runtime, freeze, authorization consumption, accepted memories, rejected-runtime abandonment, and the accepted additive expression tables.

Public records:

- `threads` — current versioned projection and deterministic state hash;
- `thread_events` — immutable `THREAD_SEEDED`, `SELF_MODEL_UPDATED`, and `THREAD_FROZEN` history;
- `commands` — accepted command/freeze operation witnesses.

Restricted records:

- activation requests, request appraisals, and private participation stances;
- participation authorizations, thaw leases, runtime sessions, Actor runs, and Goal Guardian audits;
- authorization consumptions, freeze reports, accepted memories, and runtime abandonments;
- disclosure strategies and audience participation responses.

Events, commands, requests, appraisals, stances, participation authorizations, Actor/Guardian results, consumptions, freeze reports, memories, abandonments, disclosure strategies, and audience responses are append-only. Lease and session rows are intentional trigger-constrained mutable lifecycle records and cannot be deleted.

WorldStore, RuntimeStore, FreezeStore, LifecycleHardeningStore, and ExpressionStore use separate WAL connections over the same file. Dependent writes reread their required cross-interface witnesses inside the load-bearing transaction.

## Run the complete proof

```bash
npm run demo:m1
```

The consolidated runner starts independent kernel and credentialed editor processes, generates fresh local credentials, communicates through HTTP for the demonstrated lifecycle, and proves Mina's complete persistent round trip:

- seed and restart equality;
- stale request-attempt rejection and correlated recovery;
- admin-authorized self-model change;
- high-dignity willing acceptance with persisted disclosure/response before Actor work;
- accepted runtime, Actor, Guardian pass, and atomic freeze;
- separate low-dignity refusal with durable non-execution authority, disclosure/response, and no runtime;
- divergent Actor, Guardian reject, and explicit non-consuming abandonment;
- unattended timeout observed from kernel time and later lazy reclaim;
- obligation-mediated private `refuse` / authorized `accept` with persisted `obligation_override` expression before Actor work;
- obligation discharge and permanent reuse rejection;
- final restart/replay equality, two accepted memories, three complete expression chains, replay rejection, and zero active runtimes.

The reviewed proof layer reopens the same world and independently verifies expression linkage, historical discharge, authorization-consumption ordering, row counts, and final zero-active-runtime state.

## Inspect a completed world

Run the full proof and keep its completed world live in the Thread Editor:

```bash
npm run demo:m1:editor
```

Verify and summarize any retained current-schema Fibre database with:

```bash
npm run inspect:db -- "/path/to/world.sqlite"
npm run --silent inspect:db -- "/path/to/world.sqlite" --json
```

The inspector opens the source read-only, enables SQLite `query_only`, checks SQLite integrity, foreign keys and schema enforcement, validates a temporary snapshot through the Fibre stores, and cross-checks Thread replay, private traces, runtime/freeze/abandonment witnesses, memories, participation authorizations, disclosure strategies, and audience responses. It reports failures without repairing the source database.

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

`GET /health` publishes `kernelTime` from the lifecycle clock used for authorization, leases, Actor, Guardian, freeze, abandonment, and expression timestamps. Read surfaces interpret expiry from kernel time rather than browser time.

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

## Restricted participation, expression, and runtime routes

Every path below `/threads/:threadId/private` requires `x-fibre-private-token` before private route dispatch.

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/threads/:threadId/private/requests` | List request-attempt summaries |
| `POST` | `/threads/:threadId/private/requests` | Persist request and Thread-owned appraisal |
| `GET` | `/threads/:threadId/private/requests/:requestId` | Read complete private trace |
| `GET` | `/threads/:threadId/private/requests/:requestId/integrity` | Verify historical trace |
| `POST` | `/threads/:threadId/private/requests/:requestId/stance` | Persist private participation stance |
| `GET/POST` | `/threads/:threadId/private/requests/:requestId/authorization` | Read or issue non-execution Participation Authorization |
| `GET/POST` | `/threads/:threadId/private/requests/:requestId/disclosure` | Read or persist restricted disclosure strategy |
| `GET/POST` | `/threads/:threadId/private/requests/:requestId/response` | Read or persist audience participation response |
| `GET` | `/threads/:threadId/private/requests/:requestId/expression` | Read authorization/disclosure/response chain |
| `GET` | `/threads/:threadId/private/requests/:requestId/expression/integrity` | Verify expression linkage and bounded response status |
| `GET` | `/threads/:threadId/private/expression` | List participation-authorization/expression summaries |
| `POST` | `/threads/:threadId/private/requests/:requestId/runtime` | Issue accepted execution authorization and acquire lease/session |
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

## Authorization and expression boundary

A private stance is not authority. Accepted execution authority is minted only through runtime acquisition, which revalidates the exact request chain against current Thread version/state hash and atomically creates authorization, exclusive lease, and runtime session.

A separate standalone authorization path persists `clarify`, `negotiate`, `delegate`, or `refuse` without runtime. It is available only while the Thread is stable (`frozen` or `dormant`) and rejects `authorizedAction: accept` at both domain and store layers.

A request attempt may have only one Participation Authorization. Runtime and non-execution writers detect each other's records before insertion and retain a SQLite uniqueness backstop; collisions are translated to stable domain errors rather than raw `500`s.

Disclosure strategy is a restricted immutable record bound to the exact request, stance, and authorization. Its mode is private strategy intent, not a kernel honesty classifier. Disclosure cannot create or expand authority.

Audience response is a separate immutable sanitized record. Its communicated posture cannot contradict authorization. Response creation does not imply consent, delivery, performed action, completion, or Thread life change.

For an obligation-mediated private `refuse` / authorized `accept`, the private chain records `participationBasis: obligation_override`. The outward `accept` wording remains distinguishable from willing acceptance and may, under full candor, say the Thread is proceeding because of a recorded obligation without exposing the private obligation reference.

The expression-integrity API reports response status structurally: response present, not sent, no performed action recorded, no completion claimed, and their combined bounded-status witness. The older store `audienceSafe` boolean remains only as a compatibility field.

## Obligation boundary

A private desire can be overridden only by an exact currently owned unresolved-intention reference that has never been discharged. M1 uses exact UTF-8 prose identity; structured obligations are the immediate post-M1 authority-hardening step.

Historical discharge permanently prevents identical reuse even if the same prose later reappears. Future structured obligations must separate public standing from private terms before any creation/editing surface is added.

## Actor and Goal Guardian

The deterministic M1 Actor produces proposals only, performs no external tools or network calls, issues no direct world commands, and sends no requester-facing communication. It cannot mutate authoritative state.

Goal Guardian is a declaration and consistency auditor, not a capability sandbox. A future model-, network-, or tool-capable Actor requires an isolated worker/tool gateway with independently observed traces.

## Freeze and rejected closure

Freeze is the only current path from Actor proposal to Thread life. It requires current state, active unexpired runtime, accepted unconsumed authorization, persisted Actor output, Guardian `pass`, no declared tool/direct-command activity, and one explicit decision for every proposal.

One immediate transaction appends `THREAD_FROZEN`, advances the projection, records accepted memories and rejected rationale, consumes authorization, discharges any override obligation, completes the session, and releases the lease.

Exact retry returns the original report. A different operation after successful consumption returns `AUTHORIZATION_CONSUMED`.

A Guardian-rejected active runtime may instead be explicitly abandoned. One transaction appends immutable restricted closure, aborts the session, and releases the lease while consuming neither authorization nor obligation and appending no public Thread life event. Expiry is a separate timeout and cannot be rewritten as synthetic abandonment.

## Replay, privacy, and editor

Replay reconstructs the public Thread state and freeze witnesses. Thread integrity cross-checks freeze reports, `thread_memories`, and projection `memoryRefs`. Expression integrity separately revalidates authorization, strategy, response, request, and stance linkage.

Public `THREAD_FROZEN` projections expose safe accepted-memory references and counts while withholding private authorization/runtime/Actor/Guardian/rationale fields. Restricted expression content never appears on public Thread/event routes.

The Thread Editor is loopback-only and non-authoritative. Its private token remains server-side; every editor API request also requires a separate per-run editor credential. The **Expression boundary** view is GET-only and shows private stance, kernel authority, disclosure intent, exact outward response, and delivery/performed/completion status as separate facts, with obligation-mediated divergence explicitly named as compelled participation rather than consent.

## Scope boundary

M1 is fully closed for the deterministic persistent participation, expression, cognition, life-change, closure, replay, and inspection boundary.

It does not send real messages, prove delivery, provide a general performed-action ledger, implement production authentication, distributed leasing, worker isolation, a tool/model gateway, remote communication, production database topology, structured obligation records, or M2 identity/embodiment.
