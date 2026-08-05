# M1 local world-kernel API evidence

Date: 2026-08-04  
Scope: PR #17, deterministic local service and command preview

## Capability demonstrated

The world-kernel now runs as an independent Node process over the M1 SQLite store. A caller can seed Mina, inspect her current projection and ordered history, preview a typed command without mutation, submit only the matching previewed command, stop the process, reopen the same database, and observe identical durable state and integrity results.

The service keeps three boundaries separate:

1. HTTP transport parses bounded JSON and maps stable response codes.
2. The application service computes and verifies deterministic command-preview receipts.
3. The persistence adapter remains authoritative for transactions, events, projections, replay, idempotency, and repair.

## Preview receipt

For `UPDATE_SELF_MODEL`, the preview receipt binds:

```json
{
  "schemaVersion": 1,
  "threadId": "thr_mina_001",
  "commandId": "cmd_mina_api_001",
  "commandDigest": "sha256:<64 hexadecimal characters>",
  "expectedVersion": 1,
  "currentStateHash": "sha256:<64 hexadecimal characters>",
  "proposedEventId": "evt_thr_mina_001_<digest prefix>",
  "proposedResultingVersion": 2,
  "proposedStateHash": "sha256:<64 hexadecimal characters>"
}
```

`previewId` is the full SHA-256 digest of those canonical receipt fields, prefixed with `prv_`. Preview performs no write. Acceptance recomputes the receipt, rejects modified or stale content, applies the command through the store, and then verifies that Thread identity, resulting version, persisted event ID, command digest, event state hash, and projected state hash match the preview.

A preview is a consistency artifact only. It does not express consent and cannot replace Participation Authorization.

## Independent-process scenario

The process-level test:

1. proves invalid non-loopback environment configuration is rejected before a database is created;
2. starts `services/world-kernel/src/server.mjs` on an ephemeral loopback port;
3. seeds synthetic Thread `thr_mina_001` through `POST /threads`;
4. previews a version-1 self-model command;
5. verifies Mina remains at version 1 with one event;
6. rejects changed command content under the original preview;
7. accepts the exact command and advances Mina to version 2 with two events;
8. retries Mina's exact immutable seed after advancement and receives the current version-2 projection without another event;
9. rejects a conflicting immutable seed for the same Thread ID;
10. rejects another version-1 preview as stale;
11. stops the process cleanly;
12. restarts against the same SQLite database;
13. verifies the identical integrity report, projection, state hash, and event count;
14. retries the original previewed command idempotently after restart without adding an event.

## Automated evidence

The API-specific tests prove named properties:

1. deterministic no-write preview, exact acceptance, and idempotent receipt reconstruction;
2. service-layer rejection of unknown preview-envelope fields;
3. distinct malformed-preview, mismatched-preview, and accepted-command-conflict failures;
4. independent enforcement of Thread identity, resulting version, event ID, command digest, and state-hash post-apply witnesses;
5. changed, stale, and cross-Thread commands fail visibly;
6. event history remains inspectable when only the current projection is corrupt, while missing Threads still return not found;
7. stable HTTP preview/apply behavior, request IDs, no-store responses, method contracts, and byte-bounded bodies;
8. mutation requests with `Content-Type: text/plain` fail with 415 and browser preflight receives no CORS permission;
9. the exported listener and executable refuse non-loopback bind hosts;
10. non-loopback Host headers, absolute-form targets, and network-path targets fail with 421;
11. disabled or token-protected repair and redacted integrity responses preserve protected boundaries;
12. independent-process stop/restart survival, lifetime seed retry, matching integrity, and post-restart command idempotency;
13. `.fibre/` is ignored and repository validation rejects tracked live-world paths.

Run:

```bash
npm test
```

## Local security boundary

- The exported listener and executable bind only to loopback addresses.
- Requests with non-loopback `Host` headers or non-loopback request-target authorities are rejected.
- CORS is not enabled; preflight does not grant cross-origin access.
- Mutation endpoints require `application/json` and bounded bodies.
- Security response headers and content length cannot be overridden by problem-specific headers.
- Projection repair requires an explicit administrative token and remains disabled by default.
- Integrity and internal failures do not expose stack traces or database details to callers.
- `.fibre/` is excluded from Git and validated as world-state-only storage.
- Request, header, keep-alive, and connection limits are explicit for the local process.

This is still a local, single-user milestone process. It is not suitable for remote or multi-tenant deployment.

## M1 causation convention

The current command vocabulary produces one event per accepted command. Command events therefore use `commandId` as both `causationId` and `correlationId`; seed events use their own event ID. These fields identify the single durable transaction in M1. Multi-event chains and caller-supplied correlation scopes are deferred until the world-kernel supports commands that create multiple events.

## Deferred from this proof

- authenticated principals and production authorization;
- private/public record-level access control;
- persistent requests, appraisal capsules, private stances, authorizations, disclosure strategies, and external responses;
- thaw leases and runtime sessions;
- Actor and Goal Guardian workers;
- event-backed authorization consumption and kernel-origin proof;
- full lifecycle transition table and broader command vocabulary;
- audited failed-administration attempts and production observability;
- slow-client and load testing beyond explicit local timeouts and connection caps;
- replay checkpoints for histories where linear full replay is no longer acceptable;
- production database, backup, replication, high availability, and multi-region operation.
