# M1 persistence spine evidence

Date: 2026-08-04  
Scope: PR #16, local deterministic persistence only

## Human-inspectable proof

The test fixture `thr_mina_001` is seeded into a file-backed SQLite world store at version 1. Seeding normalizes the optional projection metadata `provenance.lastEventId` to the deterministic seed event:

```text
evt_thr_mina_001_seed_e6dd472f9bfb756e02623328
```

Initial stored state hash:

```text
sha256:8fb2f4d9dde37bb43665998065ec549aec211a969f59a718bb3ec0da982a17dc
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

The 24-test persistence suite proves named properties rather than relying on test count alone:

1. canonical JSON stability and rejection of undefined, non-finite, and negative-zero values;
2. explicit SQLite schema version and lock timeout;
3. refusal of unknown schema versions;
4. correct database-path normalization at a filesystem root;
5. durable seeding with normalized last-event metadata;
6. successful round trip for a schema-valid snapshot that omitted `lastEventId`;
7. atomic command, event, command-witness, and projection advancement;
8. preservation of frozen and dormant lifecycle state;
9. rejection of retired, active, thawing, and freezing self-model writes;
10. stale expected-version rejection without side effects;
11. idempotent retry by replaying the accepted event rather than trusting a cached result blob;
12. rejection of reused command IDs with different content;
13. rejection of unknown and oversized payload fields;
14. close/reopen restart survival and matching replay hash;
15. database-level append-only enforcement for events and commands;
16. projection identity-swap rejection;
17. seed-event identity-swap rejection during replay;
18. mandatory projection hash, column, and last-event witness checks;
19. projection repair from intact immutable history;
20. detection of coherent event-content rewriting through recomputed command digests and command witnesses;
21. detection of a missing accepted-command witness;
22. replay sequence-gap rejection;
23. seed version-metadata rejection;
24. typed `IntegrityError` reporting for corrupt stored rows.

Run:

```bash
npm test
```

Integrity detection is bounded honestly: it detects inconsistencies among identities, hashes, digests, event IDs, projection metadata, and command witnesses. It is not a proof against an administrator who can disable database protections and coherently rewrite every witness; kernel-origin signatures and external trust anchors remain deferred.

## Deferred from this proof

- independent world-kernel process and API;
- full command vocabulary and complete lifecycle transition table;
- snapshots/checkpoints beyond the current projection;
- thaw leases and runtime sessions;
- persistent appraisal, stance, authorization, disclosure, and response records;
- one-time authorization consumption and kernel-origin proof;
- production database, backup, replication, high availability, and multi-region operation;
- multi-process crash injection and exhaustive concurrency testing.
