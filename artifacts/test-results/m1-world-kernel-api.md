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

`previewId` is the full SHA-256 digest of those canonical receipt fields, prefixed with `prv_`. Preview performs no write. Acceptance recomputes the receipt, rejects modified or stale content, applies the command through the store, and then verifies that the persisted event ID, command digest, resulting version, Thread identity, and state hash match the preview.

A preview is a consistency artifact only. It does not express consent and cannot replace Participation Authorization.

## Independent-process scenario

The process-level test:

1. starts `services/world-kernel/src/server.mjs` on an ephemeral loopback port;
2. seeds synthetic Thread `thr_mina_001` through `POST /threads`;
3. previews a version-1 self-model command;
4. verifies Mina remains at version 1 with one event;
5. rejects changed command content under the original preview;
6. accepts the exact command and advances Mina to version 2 with two events;
7. rejects another version-1 preview as stale;
8. stops the process cleanly;
9. restarts against the same SQLite database;
10. verifies the identical integrity report, projection, state hash, and event count;
11. retries the original previewed command idempotently after restart without adding an event.

## Automated evidence

The five API-specific tests prove:

1. deterministic no-write preview, exact acceptance, and idempotent receipt reconstruction;
2. changed, stale, cross-Thread, and storage-divergent results fail visibly;
3. HTTP preview/apply behavior, request IDs, no-store responses, method contracts, and body limits;
4. disabled or token-protected repair, loopback Host enforcement, and redacted integrity responses;
5. independent-process stop/restart survival, matching integrity, and post-restart idempotency.

Run:

```bash
npm test
```

## Local security boundary

- The executable binds only to loopback addresses.
- Requests with non-loopback `Host` headers are rejected.
- CORS is not enabled.
- Mutation endpoints require `application/json` and bounded bodies.
- Projection repair requires an explicit administrative token and remains disabled by default.
- Integrity and internal failures do not expose stack traces or database details to callers.

This is still a local, single-user milestone process. It is not suitable for remote or multi-tenant deployment.

## Deferred from this proof

- authenticated principals and production authorization;
- private/public record-level access control;
- persistent requests, appraisal capsules, private stances, authorizations, disclosure strategies, and external responses;
- thaw leases and runtime sessions;
- Actor and Goal Guardian workers;
- event-backed authorization consumption and kernel-origin proof;
- full lifecycle transition table and broader command vocabulary;
- production database, backup, replication, high availability, and multi-region operation.
