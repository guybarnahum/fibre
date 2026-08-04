# M1 persistence spine evidence

Date: 2026-08-04  
Scope: PR #16, local deterministic persistence only

## Human-inspectable proof

The test fixture `thr_mina_001` is seeded into a file-backed SQLite world store at version 1.

Initial state hash:

```text
sha256:a02738f852502530629d35a579b0bd0823c3bd9190a591af2f8e97e460176366
```

A validated `UPDATE_SELF_MODEL` command with expected version 1 produces one append-only event:

```text
evt_thr_mina_001_b13f6048e4d8258e13a9d854
```

The resulting projection is version 2 with state hash:

```text
sha256:baddec75c686a38aa54c4990ec9fb5477f123a1dc6e636bc8b9f828254775926
```

The database is closed, reopened, and replayed from the seed and command events. The replay report is:

```json
{
  "threadId": "thr_mina_001",
  "version": 2,
  "stateHash": "sha256:baddec75c686a38aa54c4990ec9fb5477f123a1dc6e636bc8b9f828254775926",
  "eventCount": 2
}
```

## Automated evidence

The persistence suite proves:

1. canonical JSON and stable SHA-256 state hashing;
2. durable seeding with an append-only seed event;
3. atomic command, event, and projection advancement;
4. stale expected-version rejection without side effects;
5. identical command retry without duplicated effects;
6. rejection of a reused command ID with different content;
7. close/reopen restart survival and matching replay hash;
8. database-level append-only event enforcement;
9. detection of event-history tampering during replay.

Run:

```bash
npm test
```

## Deferred from this proof

- independent world-kernel process and API;
- full command vocabulary;
- snapshots/checkpoints beyond the current projection;
- thaw leases and runtime sessions;
- persistent appraisal, stance, authorization, disclosure, and response records;
- one-time authorization consumption;
- production database, backup, replication, high availability, and multi-region operation.
