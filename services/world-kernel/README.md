# world-kernel

Owns validated commands, events, lifecycle transitions, provenance, and protected world laws.

## M1 persistence spine

`src/persistence.mjs` is the first executable world-kernel storage adapter. It uses Node's built-in `node:sqlite` module to prove a deterministic local Thread round trip without adding a production database dependency.

The adapter persists two visibility classes.

Public world records:

- `threads` — the current versioned projection and deterministic state hash;
- `thread_events` — the ordered append-only public Thread history from which the projection is replayed;
- `commands` — accepted idempotency keys, command digests, resulting versions, and event references.

Restricted participation records:

- `activation_requests` — immutable named request origins and SHA-256 request bindings;
- `request_appraisals` — Thread-owned context capsules, historical snapshot witnesses, policies, opaque IDs, and content digests;
- `private_participation_stances` — immutable private dignity stances, their own historical state-hash witness, opaque IDs, and content digests.

The storage contract:

1. normalizes projection metadata and seeds a validated Thread;
2. accepts typed commands with expected Thread versions and stable command IDs;
3. rejects stale versions, illegal lifecycle states, unknown payload fields, oversized payloads, and conflicting idempotency reuse;
4. appends one event and atomically advances the projection;
5. verifies ordinary reads against the last immutable event;
6. replays all events while re-deriving command digests and event IDs and checking command witnesses;
7. repairs a corrupt projection from intact event history;
8. persists restricted request, appraisal, and private-stance records without adding them to the public event response;
9. revalidates restricted records against the exact historical Thread snapshot;
10. closes and reopens without changing the Thread or its private request traces.

SQLite schema version 2 records causation, correlation, payload schema version, provenance, and optional authorization evidence on every public Thread event and adds the restricted participation tables. Existing schema version 1 databases migrate in one transaction. Triggers reject updates or deletes of events, commands, requests, appraisals, and private stances.

Private record IDs are opaque random 256-bit values with `app_` and `pst_` prefixes. They are not hashes or commitments to private content. SHA-256 content digests are stored separately and verified against historical replay. The database enforces both ID and digest formats. One private stance may be recorded for each appraisal; a different later opinion requires an explicit future revision operation rather than overwrite.

`provenance.lastEventId` is projection metadata, not intrinsic identity. Seeding deterministically creates the seed event and normalizes the stored snapshot to reference it. `UPDATE_SELF_MODEL` is permitted only for frozen or dormant Threads and preserves the existing status.

For the M1 one-command/one-event profile, a command event uses its `commandId` as both `causationId` and `correlationId`; the seed event uses its own `eventId`. This means the fields identify the single durable transaction today. Multi-event causation chains and caller-supplied correlation scopes are deferred until the command vocabulary can produce more than one event.

## M1 local world-kernel API

`src/server.mjs` starts an independently running local HTTP process over the storage contract. HTTP parsing, error mapping, preview binding, participation-record validation, and persistence remain separate modules:

- `http-server.mjs` — loopback HTTP transport, restricted-route token checks, exact request envelopes, and stable problem responses;
- `kernel-service.mjs` — application operations, command-preview enforcement, request-appraisal creation, and private-stance recording;
- `private-participation.mjs` — runtime validation, request fingerprinting, Thread-owned capsule construction, and private-stance binding;
- `persistence.mjs` — durable SQLite commands, events, projections, replay, private traces, idempotency, integrity, and repair.

Start it from the repository root:

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

`.fibre/` is repository-ignored and repository validation rejects tracked content beneath it. The exported listener and the executable both refuse non-loopback bind addresses. Projection repair remains disabled unless `FIBRE_ADMIN_TOKEN` is configured. Restricted participation routes remain disabled unless `FIBRE_PRIVATE_TOKEN` is configured.

### Public routes

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/health` | Service, storage, preview, and repair metadata |
| `POST` | `/threads` | Idempotently seed one immutable Thread origin |
| `GET` | `/threads/:threadId` | Read the integrity-checked current projection |
| `GET` | `/threads/:threadId/events` | Read the ordered public event timeline, including while only the projection is corrupt |
| `GET` | `/threads/:threadId/integrity` | Replay and compare projection integrity |
| `POST` | `/threads/:threadId/commands/preview` | Validate and preview a command without writing |
| `POST` | `/threads/:threadId/commands` | Apply a command only with its matching preview receipt |
| `POST` | `/threads/:threadId/repair-projection` | Explicit token-protected administrative repair |

The unauthenticated health response does not advertise whether restricted participation access is configured. The independent process startup record may report that fact to its local operator.

### Restricted participation routes

Every path below `/threads/:threadId/private` requires `x-fibre-private-token` matching `FIBRE_PRIVATE_TOKEN` before route dispatch, including unknown private subpaths.

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/threads/:threadId/private/requests` | List restricted request summaries without full private payloads |
| `POST` | `/threads/:threadId/private/requests` | Persist one named request and Thread-owned appraisal capsule |
| `GET` | `/threads/:threadId/private/requests/:requestId` | Read the complete restricted request trace |
| `GET` | `/threads/:threadId/private/requests/:requestId/integrity` | Verify the trace against historical Thread replay |
| `POST` | `/threads/:threadId/private/requests/:requestId/stance` | Persist one validated private participation stance |

The local private token is a route capability, not a production principal, consent record, Participation Authorization, authentication architecture, or permission to execute the request.

`POST /threads` is idempotent for the lifetime of the Thread when the submitted snapshot and seed timestamp match the immutable seed event. A retry returns the current projection even after later commands have advanced it. A different proposed origin for the same Thread ID returns `THREAD_ALREADY_EXISTS`.

A request/appraisal submission is idempotent when request content, normalized context selection, policy, timestamp, causation, and correlation metadata match the immutable origin. This remains true after the Thread advances. Reusing the request ID with different content fails with `PRIVATE_REQUEST_CONFLICT`.

Request appraisal compilation is allowed only while the Thread is frozen or dormant. A lifecycle-invalid appraisal returns the same 422 lifecycle rejection class used by protected commands. The store also rejects a race in which the Thread advances after a capsule is compiled but before that immutable request/appraisal trace is atomically inserted.

A private stance is an opinion about the immutable historical appraisal, not an action against the live Thread. It may therefore be recorded after unrelated later Thread changes, while remaining bound to the request, requester, fingerprint, policy, historical version, and state hash. An exact retry is idempotent. A materially different second stance returns `PRIVATE_STANCE_CONFLICT`; explicit stance revision remains deferred. Any future Participation Authorization must independently revalidate the live Thread version and current governing state.

The transport rejects query parameters, absolute-form and network-path request targets, unknown envelope fields, unsupported methods, non-JSON mutation requests, oversized HTTP bodies, route/record Thread mismatches, non-loopback `Host` headers, and non-loopback bind addresses. Responses use `Cache-Control: no-store`, do not enable CORS, and never expose stack traces. Integrity failures are logged server-side but returned with a redacted public message. Security headers and content length are owned by the transport and cannot be overridden by problem-specific headers.

The local process uses bounded Node transport defaults: 30-second request timeout, 10-second header timeout, five-second keep-alive timeout, and 64 maximum concurrent connections.

### Command preview

A preview performs the same command and lifecycle validation as acceptance but does not mutate world state. It returns:

- the full SHA-256 command digest;
- the current Thread state hash and expected version;
- the deterministic proposed event ID;
- the proposed resulting version and state hash;
- the proposed event core and resulting Thread projection;
- a deterministic `previewId` over those receipt fields.

Command acceptance requires the exact command and matching `previewId`. The service recomputes the receipt against current state before writing, so modified or stale previews fail visibly. After persistence, Thread identity, resulting version, event ID, command digest, event state hash, and projected state hash must all match the previewed result. Identical retries reconstruct the original receipt from accepted event history and remain idempotent across process restart.

A preview receipt is a consistency and review artifact. It is not consent, participation authorization, an authentication credential, or proof of kernel origin.

### Private request trace

A Request Appraisal Capsule is compiled from the authoritative Thread snapshot. The caller may narrow Thread-owned memory, relationship, and unresolved-intention references but cannot inject unowned references. The stored capsule records included and excluded references.

Trace integrity verification reconstructs the exact historical Thread version from immutable events and checks:

- Thread state-hash witnesses on the request/appraisal and stance;
- SHA-256 request fingerprint and immutable request digest;
- complete, disjoint included/excluded partitions of Thread-owned context;
- copied identity, self-model, needs, feelings, intentions, and budget state;
- policy, request, requester, snapshot, and appraisal bindings;
- opaque appraisal and stance ID formats;
- appraisal and stance content digests.

The public Thread and event routes never copy the appraisal capsule, private rationale, private feelings added by the stance, conflicting motives, uncertainties, or proposed relationship effects. The public Thread projection may separately contain Thread state fields such as `currentState.feelings`; that is distinct from exposing the restricted participation trace.

### Error mapping

The API uses stable JSON error codes and request IDs:

- malformed input → `400`;
- forbidden private or administrative access → `403`;
- missing Thread, private request, or route → `404`;
- unsupported method → `405`;
- stale version, idempotency conflict, preview mismatch, route identity conflict, private request conflict, private stance conflict, or request-appraisal insertion race → `409`;
- oversized body → `413`;
- unsupported media type → `415`;
- lifecycle rejection → `422`;
- non-loopback routing or request-target authority → `421`;
- storage busy, disabled repair, disabled private access, or integrity failure → `503`.

## Deliberate scope boundary

This service remains a deterministic, single-user, local M1 process. It is not a production network service, authentication system, multi-tenant access-control layer, model gateway, thaw-lease manager, authorization-consumption system, or production database.

The public API currently exposes the whole synthetic Thread snapshot to its local caller, but not the restricted participation trace. Before remote or multi-user use, Fibre requires authenticated principals, per-record access-aware private/public views, audited administrative failures, encryption and key management, stricter resource quotas, production-grade slow-client defenses, and alternatives to linear full replay on integrity requests.

Persistent requests and private stances still do not authorize execution. The next M1 stage adds Participation Authorization, restricted disclosure strategy, audience-visible external response, and event-backed authorization consumption. LLM output cannot write the store directly.
