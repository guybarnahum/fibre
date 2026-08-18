---
id: validation-m2-pr39-slice-bc-jk-rereview
status: draft
last-reviewed: 2026-08-18
canonical: false
---

# #39 Slice B+C focused J/K re-review

This packet requests a **focused re-review** of the only blocking findings from the first formal B+C Gate-C review. It does not reopen the clean A-I/L-M attacks and does not expand Slice C.

Requested verdict:

```text
CLEAR
or
HOLD
```

## Review history

Formal B+C review head:

```text
2022749fad5e67ef51cf325949737a28d4159e74
Refresh Slice B+C blocking review packet
```

The reviewer returned `HOLD` while explicitly finding that both headline B/C claims survived attack. The blocking findings were:

1. **J / S1-1** — admitted Pass-A episodes had no persistence path into authoritative `thread_events` history;
2. **K / S1-2** — #38 autobiographical memory therefore had no legal same-Thread childhood `eventRef`, and `THREAD_SEEDED` could not substitute because its publication timestamp falls outside a childhood `subjectPeriod`.

The reviewer assigned pool richness to E, burned-world enforcement and development-artifact archival to G, and conditions/modulation to post-#39/#42. Those remain out of this delta.

## Implementation fix under review

```text
acc0a692281fe94b9d8650aa3a4cc13b64a3906f
Publish Genesis life episodes into Thread history
```

This is exactly one implementation commit on top of the formal HOLD packet head.

Changed files:

```text
docs/architecture/genesis-compiler-contract-v1.md
services/world-kernel/src/genesis-life-episode.mjs
services/world-kernel/src/genesis-store.mjs
services/world-kernel/src/persistence-common.mjs
services/world-kernel/src/persistence-domain.mjs
services/world-kernel/src/persistence-sqlite.mjs
services/world-kernel/src/persistence.mjs
services/world-kernel/test/genesis-life-episode-publication.test.mjs
services/world-kernel/test/genesis-life-episode-runtime-guard.test.mjs
services/world-kernel/test/genesis-slice-a.test.mjs
```

No Pass-A creative prompt, EventStructurePool, generation scheduler, genome, conditions, burn policy, or quality gate changed.

## Decisions implemented

### 1. Genesis life episodes are uncommanded events

`THREAD_LIFE_EPISODE_RECORDED` joins `THREAD_SEEDED` in the SQLite no-command branch:

```text
command_id     = NULL
command_digest = NULL
```

The common event vocabulary records both as uncommanded, and replay skips command-witness lookup for exactly that set. Runtime command authority still rejects `THREAD_LIFE_EPISODE_RECORDED` as an unsupported command type.

This preserves a structural distinction between compiled Genesis history and commanded/runtime-lived events without synthesizing a fake commander.

### 2. Publication sequence and lived chronology are different orders

The accepted compiler contract now states:

> For a Genesis-published Thread, `sequence` is publication order and `occurred_at` is lived time. `THREAD_SEEDED` is sequence 1 at publication time, while compiled prior-life events atomically published after it may carry earlier `occurred_at` values; sequence order and lived chronology are not required to agree.

The seed remains sequence 1 so existing seed/replay invariants remain intact. Each life episode retains its actual Pass-A `occurredAt` for later #38 `subjectPeriod` grounding.

### 3. Every admitted life episode advances version/state

Life-episode replay changes only canonical Thread event progression:

```text
version += 1
provenance.lastEventId = lifeEpisodeEventId
```

Each episode therefore has unique contiguous:

```text
expected_version
resulting_version
state_hash
```

The first-live version is derived as:

```text
seedSnapshot.version + admittedEpisodeCount
```

`manifest.publication.resultingThreadVersion` is now an integrity cross-check against that derived result rather than the source of version truth.

### 4. Seed snapshot and final projection are separate

Atomic birth now intentionally carries two snapshots:

```text
seedSnapshot
  version     = seed version
  lastEventId = seed event
  stored only in THREAD_SEEDED payload

publishedThread
  version     = seed version + episode count
  lastEventId = final life episode event
  stored in threads projection
```

The seed therefore remains self-consistent under `applyEventToThread(null, seedEvent)`, while the live projection matches the full event chain.

### 5. Existing databases rebuild the event CHECK

`needsEventSchemaUpgrade(...)` now detects absence of `THREAD_LIFE_EPISODE_RECORDED`, so an existing schema-version-6 database with the prior five-event CHECK is rebuilt through the existing event-table rebuild path before publication.

No schema-version bump is used merely to force this repair; the existing same-version additive schema-repair discipline is exercised directly.

### 6. Genesis publication is the producer

The new event is emitted by `GenesisStore.publishBirth(...)` inside the existing atomic birth transaction.

Guard evidence includes both:

- a source scan asserting the only `thread_events` INSERT writers naming the new event are `genesis-store.mjs` and the migration copier in `persistence-sqlite.mjs`;
- a runtime test proving `WorldStore.applyCommand(...)` rejects the new event type and leaves only the seed event.

## Atomic publication shape

`publishBirth(...)` now accepts:

```text
{ manifest, thread, episodes }
```

It normalizes and preflights all episodes before opening the write transaction, derives the final Thread state/event chain, then atomically writes:

```text
threads row               final publishedThread
THREAD_SEEDED             sequence 1, seedSnapshot, publication occurred_at
THREAD_LIFE_EPISODE...    sequence 2..N+1, lived occurred_at
existing #37 seed identity / #38 visual obligations
Genesis manifest
```

Any transaction failure rolls back the birth.

Each life episode carries a bounded, revalidated Pass-A payload, deterministic event ID, same-Thread identity, Genesis/WorldSpec/Pass-A provenance, lived `occurred_at`, contiguous version metadata, and state hash.

## Focused tests

### Publication / replay / version

`services/world-kernel/test/genesis-life-episode-publication.test.mjs`

Proves:

- seed + admitted episodes appear in contiguous `thread_events` sequence;
- episodes are commandless;
- sequence 1 publication time may be later than sequence 2 lived time;
- every episode advances version and state hash;
- seed payload remains seed-versioned/self-referential;
- live projection carries final version/lastEventId;
- full `replayThread(...)` equals the projection;
- `verifyThreadIntegrity(...)` passes.

### #38 memory bridge and seed negative

The same file proves:

```text
Genesis life episode eventRef + childhood subjectPeriod  -> PASS
THREAD_SEEDED eventRef + same childhood subjectPeriod    -> throws falls outside subjectPeriod
```

The negative pins the reason the seed cannot become a surrogate childhood anchor.

### Pre-existing database migration

The test constructs an actual schema-version-6 database using the old five-event CHECK, then opens the current store and verifies:

- same-version migration rebuilds `thread_events` with `THREAD_LIFE_EPISODE_RECORDED`;
- a subsequent Genesis birth with a life episode succeeds on that migrated database;
- replay/integrity succeeds.

This avoids the false confidence of testing only a fresh database.

### Genesis-only runtime production

`services/world-kernel/test/genesis-life-episode-runtime-guard.test.mjs` proves the ordinary command path cannot mint the new event type and cannot add an event when such a command is attempted.

## Required verification

Run from repository root at the implementation SHA:

```bash
npm run check
```

Also run the focused tests directly if diagnosing a failure:

```bash
node --disable-warning=ExperimentalWarning --test \
  services/world-kernel/test/genesis-life-episode-publication.test.mjs \
  services/world-kernel/test/genesis-life-episode-runtime-guard.test.mjs \
  services/world-kernel/test/genesis-slice-a.test.mjs
```

Do not return `CLEAR` merely because the tests exist; inspect the event/replay/migration implementation and run the tests.

## Focused hostile questions

### J — authoritative historical publication

1. Can every admitted Pass-A episode supplied to `publishBirth(...)` become a real same-Thread `thread_events` row?
2. Is `THREAD_LIFE_EPISODE_RECORDED` genuinely uncommanded in both schema and replay, without a fabricated command witness?
3. Can replay verify every episode's state hash and version progression?
4. Does the seed event preserve its own seed-versioned snapshot while the `threads` row stores the final projection?
5. Is `publication.resultingThreadVersion` derived/cross-checked against the event chain rather than hand-authored?
6. Does the same-version migration actually rebuild a pre-existing old CHECK constraint?
7. Can any ordinary runtime command/store path mint the new uncommanded life event?
8. Does atomic rollback still prevent a half-born Thread?

### K — #38 memory compatibility

1. Can `AutobiographicalMemoryStore` resolve a published Genesis episode event ID for the same Thread?
2. Does the episode row use the episode's lived `occurred_at`, allowing legitimate childhood `subjectPeriod` containment?
3. Does a childhood memory citing `THREAD_SEEDED` still fail specifically because the seed publication time falls outside the childhood subject period?
4. After the memory anchor is recorded, does full Thread replay/integrity still pass?

## Out of scope for this re-review

Do not require or recommend before Gate-C CLEAR:

- EventStructurePool v2;
- differentiated developmental ranges;
- conversational/social pool enrichment;
- development-world burn enforcement;
- durable archive of dev-001..006 artifacts;
- mechanical conditions, modulation, need thresholds, or #42 work;
- helper/conflict/adversity/personality quotas;
- any semantic quality gate or regeneration policy.

If J and K are closed without introducing a direct regression in the changed persistence paths, return `CLEAR`. Otherwise return `HOLD` with only the minimum blocking delta required before Slice D.
