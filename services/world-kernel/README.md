# world-kernel

Owns validated commands, events, lifecycle transitions, provenance, and protected world laws.

## M1 persistence spine

`src/persistence.mjs` is the first executable world-kernel storage adapter. It uses Node's built-in `node:sqlite` module to prove a deterministic local Thread round trip without adding a production database dependency.

The adapter persists three distinct records:

- `threads` — the current versioned projection and deterministic state hash;
- `thread_events` — the ordered append-only history from which the projection is replayed;
- `commands` — accepted idempotency keys, command digests, resulting versions, and event references.

The storage contract:

1. normalizes projection metadata and seeds a validated Thread;
2. accepts typed commands with expected Thread versions and stable command IDs;
3. rejects stale versions, illegal lifecycle states, unknown payload fields, oversized payloads, and conflicting idempotency reuse;
4. appends one event and atomically advances the projection;
5. verifies ordinary reads against the last immutable event;
6. replays all events while re-deriving command digests and event IDs and checking command witnesses;
7. repairs a corrupt projection from intact event history;
8. closes and reopens without changing the Thread.

SQLite schema version 1 records causation, correlation, payload schema version, provenance, and optional authorization evidence on every event. Triggers reject event and command updates or deletions. Replay validates identity, sequence, version transitions, command content, event state hashes, command witnesses, and final projection equality.

`provenance.lastEventId` is projection metadata, not intrinsic identity. Seeding deterministically creates the seed event and normalizes the stored snapshot to reference it. `UPDATE_SELF_MODEL` is permitted only for frozen or dormant Threads and preserves the existing status.

For the M1 one-command/one-event profile, a command event uses its `commandId` as both `causationId` and `correlationId`; the seed event uses its own `eventId`. This means the fields identify the single durable transaction today. Multi-event causation chains and caller-supplied correlation scopes are deferred until the command vocabulary can produce more than one event.

## M1 local world-kernel API

`src/server.mjs` starts an independently running local HTTP process over the storage contract. HTTP parsing, error mapping, preview binding, and persistence remain separate modules:

- `http-server.mjs` — loopback HTTP transport and stable problem responses;
- `kernel-service.mjs` — application operations and command-preview enforcement;
- `persistence.mjs` — durable SQLite commands, events, projections, replay, idempotency, and repair.

Start it from the repository root:

```bash
npm run world-kernel
```

Configuration:

```text
FIBRE_WORLD_DATABASE=.fibre/world.sqlite
FIBRE_WORLD_HOST=127.0.0.1
FIBRE_WORLD_PORT=8787
FIBRE_ADMIN_TOKEN=<optional token of at least 16 characters>
```

`.fibre/` is repository-ignored and repository validation rejects tracked content beneath it. The exported listener and the executable both refuse non-loopback bind addresses. Projection repair remains disabled unless `FIBRE_ADMIN_TOKEN` is configured.

### Routes

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/health` | Service and storage metadata |
| `POST` | `/threads` | Idempotently seed one immutable Thread origin |
| `GET` | `/threads/:threadId` | Read the integrity-checked current projection |
| `GET` | `/threads/:threadId/events` | Read the ordered event timeline, including while only the projection is corrupt |
| `GET` | `/threads/:threadId/integrity` | Replay and compare projection integrity |
| `POST` | `/threads/:threadId/commands/preview` | Validate and preview a command without writing |
| `POST` | `/threads/:threadId/commands` | Apply a command only with its matching preview receipt |
| `POST` | `/threads/:threadId/repair-projection` | Explicit token-protected administrative repair |

`POST /threads` is idempotent for the lifetime of the Thread when the submitted snapshot and seed timestamp match the immutable seed event. A retry returns the current projection even after later commands have advanced it. A different proposed origin for the same Thread ID returns `THREAD_ALREADY_EXISTS`.

The transport rejects query parameters, absolute-form and network-path request targets, unknown envelope fields, unsupported methods, non-JSON mutation requests, oversized HTTP bodies, route/command Thread mismatches, non-loopback `Host` headers, and non-loopback bind addresses. Responses use `Cache-Control: no-store`, do not enable CORS, and never expose stack traces. Integrity failures are logged server-side but returned with a redacted public message. Security headers and content length are owned by the transport and cannot be overridden by problem-specific headers.

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

A preview receipt is a consistency and review artifact. It is not consent, participation authorization, an authentication credential, or proof of kernel origin. Later M1 stages add request-bound Participation Authorization and event-backed consumption separately.

### Error mapping

The API uses stable JSON error codes and request IDs:

- malformed input → `400`;
- forbidden administrative repair → `403`;
- missing Thread or route → `404`;
- unsupported method → `405`;
- stale version, idempotency conflict, preview mismatch, or route identity conflict → `409`;
- oversized body → `413`;
- unsupported media type → `415`;
- lifecycle rejection → `422`;
- non-loopback routing or request-target authority → `421`;
- storage busy, repair disabled, or integrity failure → `503`.

## Deliberate scope boundary

This service remains a deterministic, single-user, local M1 process. It is not a production network service, authentication system, multi-tenant access-control layer, model gateway, thaw-lease manager, authorization-consumption system, or production database.

The API currently exposes the whole synthetic Thread snapshot to its local caller because private participation records do not exist yet. Before remote or multi-user use, Fibre requires authenticated principals, access-aware private/public views, audited administrative failures, stricter resource quotas, production-grade slow-client defenses, and alternatives to linear full replay on integrity requests.

LLM output still cannot write the store directly. Later world-kernel handlers must translate validated, authorized domain outcomes into the same command and event boundary.
