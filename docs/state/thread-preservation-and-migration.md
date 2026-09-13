---
id: fibre-thread-preservation-and-migration
status: accepted
last-reviewed: 2026-09-13
canonical: true
---

# Thread preservation and migration

Fibre should preserve a Thread across software and schema generations without treating the person as disposable staging data and without rewriting the life that already happened.

This is a **post-M2 follow-on**, not a new M2 closure gate. M2 still closes through the deployed human meeting defined by [`../validation/m2-meeting-runbook.md`](../validation/m2-meeting-runbook.md).

## Immediate staging policy

Until M2 closes:

- retain the existing staging Threads;
- use fresh Genesis Threads to validate current runtime behavior;
- treat older Activity without operation parentage as valid `legacy/pre-lineage` evidence;
- do not retrofit `operationId`, `parentOperationId`, `causationId` or other causal witnesses into historical Activity;
- do not manually delete a Thread from only one persistence surface;
- do not purge disposable E2E Threads until an archive for them has been created and verified.

After M2, keep a small curated corpus of milestone, regression and useful failure Threads. Disposable E2E identities may then be removed through coordinated cleanup after verified archival.

## Archive before migration

A migration begins by preserving the source Thread exactly enough to reconstruct what Fibre knew and owned at that point in time.

The first archive contract should remain Fibre-specific and small. Conceptually:

```text
thread-archive-v0.1/
  manifest.json
  world/
    thread.json
    events.json
    registration.json
    embodiments.json
    memories.json
    semantic-state.json
    situated-life.json
  birth/
    genesis.json
    inspection.json
  presentation/
    snapshot.json
    catalog.json
  assets/
    manifest.json
  activity/
    activity.json
```

This is a plan-of-record shape, not yet a frozen byte-level format. A real exporter must include only surfaces that actually exist for the Thread and must record missing or unavailable surfaces rather than inventing them.

`manifest.json` should identify at least:

- original `threadId`;
- Fibre Identity Number when one exists;
- related Genesis/request identities when available;
- source deployment Git SHA;
- relevant archive and persisted-schema versions;
- archive timestamp;
- integrity digests for retained surfaces;
- an explicit included/missing-surface inventory.

Original identity is preserved. Archive/export must not mint a replacement Thread ID, FIN or historical identity.

For assets, preserve provider-neutral object references and provenance at minimum. Retaining asset bytes is a policy decision to make when the archive contract is implemented; raw provider/storage locators must not become the portable identity of an asset.

Activity is included as exact non-authoritative historical evidence. It does not become World truth merely because it is archived beside authoritative state.

## Migrate state, not history

Migration may translate persisted state into a current compatible schema. It may not rewrite what happened.

Therefore:

- preserve World event identities, chronology and civil identity;
- preserve identity, genome, admitted memories, Semantic State, relationships, embodiments and situated-life state where their source records exist;
- preserve old Activity exactly rather than reconstructing missing telemetry;
- record schema-conversion/migration provenance separately from lived history;
- never create a fictional life event merely because Fibre software changed;
- never infer parentage or causality from timestamps or storage order after the fact.

Current reconcilers may rebuild **derived** Presentation and media projections from restored authoritative state. Those projections are current derivations and should carry migration/reconciliation provenance where useful; they are not evidence that the same projection existed historically.

The rule is simple:

```text
preserve the person
preserve the life that happened
translate the storage representation
rebuild only what is legitimately derived
```

## Archive is not lifecycle freeze

World runtime freeze and operational archive solve different problems.

A lifecycle freeze commits a Thread's current runtime consequences and returns temporary cognition to rest. The person continues to exist in Fibre.

An archive is a portable preservation/export operation across Fibre persistence surfaces. It must not create a second authority, impersonate World freeze, or manufacture a lifecycle transition.

## Post-M2 operator capability

After M2 closes, add one small Thread-scoped operator path rather than a generic backup framework:

```text
inspect
  -> archive
  -> verify
  -> dry-run migrate
  -> restore / migrate
  -> normal reconciliation
  -> verify current Thread
  -> optionally purge old disposable copy
```

The operator should:

- require an explicit environment and Thread identity;
- default to non-destructive inspection/dry-run behavior;
- verify archive integrity before any destructive cleanup;
- refuse accidental identity collisions or overwrite unless a later explicit policy permits it;
- restore authoritative data through the owning World/Birth surfaces or purpose-built migration adapters, never through Presentation or Activity;
- keep migration idempotent where practical and emit machine-readable evidence;
- coordinate cleanup across affected stores rather than leaving a partially deleted person.

Do not create a new service merely for this. A repository operator tool is sufficient until a real deployment/ownership boundary proves otherwise.

## Representative acceptance proof

Before using migration for general staging cleanup, one retained legacy Thread should prove the path end to end:

1. archive is created without mutating the source Thread;
2. archive integrity verifies;
3. restore/migration preserves `threadId`, FIN when present, and authoritative World event identity/history;
4. current World reads the same Thread under the current schema;
5. current Presentation reconciles from current authoritative state;
6. historical Activity remains byte/field-equivalent evidence and explicitly legacy where lineage did not exist;
7. no migration-created event is presented as lived history;
8. only after verification may an old disposable staging copy be removed through coordinated cleanup.

## Sequencing

```text
M2 deployed human meeting / closure
  -> Thread archive/export operator
  -> verify one representative legacy archive
  -> restore/migrate one retained legacy Thread
  -> reconcile current derived projections
  -> decide curated retention vs coordinated purge for disposable E2E corpus
```

No bulk purge comes before this path is proven.
