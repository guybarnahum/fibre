---
id: fibre-thread-migration-repair-recovery
status: accepted
last-reviewed: 2026-09-16
canonical: true
---

# Thread migration, repair and recovery

Fibre distinguishes **migration**, **repair** and **recovery** because they change different things and therefore require different authority.

> **Migration changes an older authoritative representation into a newer valid representation. Repair restores state that is already derivable from existing authority. Recovery resumes halted processing.**

These operations must not be collapsed into a generic "fix Thread" mechanism.

## Migration

A Thread requires migration when it legitimately exists under an older Fibre representation but does not satisfy a newer invariant.

Migration may change authoritative state, so it requires an explicit authoritative source. Acceptable sources include preserved Genesis evidence, immutable World history, an older canonical record that can be deterministically transformed, or an explicit operator decision only where Fibre's domain rules permit one.

If no legitimate source exists, Fibre must not invent the missing fact merely to satisfy the modern schema. The Thread remains a valid legacy person with `migration_required` for that invariant.

Migrations are named and narrow, for example:

```text
genesis_sex_v1
canonical_visual_identity_v1
fin_registration_v2
```

A migration must be deterministic or explicitly evidence-bound, idempotent, and leave durable provenance identifying the prior state, resulting state, migration rule/version, evidence used and operation identity. Migration must preserve append-only history rather than rewrite the past to make a current projection convenient.

A migration may declare explicit operator input only when the migration's domain rule requires that input. The accepted input shape belongs to that named migration; there is no generic arbitrary-field migration editor.

The existing `genesis_sex_v1` migration is the reference pattern: preserved birth evidence may restore missing sex; without authoritative evidence, Fibre does not fabricate it. It requires no operator-supplied fact.

## Repair

Repair restores a state that is already implied by authoritative Fibre records.

Examples include rebuilding a missing Presentation projection, reconstructing a damaged current projection from intact World history, or reconciling a canonical Embodiment when the authoritative visual specification already exists.

Repair may reconstruct or republish derived/current state. It must not create a new biographical fact, reinterpret ambiguous legacy evidence as certainty, or silently perform a migration.

A repair should be safe to repeat and should report the authoritative evidence from which the repaired state was derived.

## Recovery

Recovery changes no semantic truth. It resumes operational work that Fibre intentionally stopped.

A terminal reconciliation failure is quarantined as `dead_letter` so normal alarms and retries cannot consume resources indefinitely. Recovery moves that one work item back to `pending` and requests targeted reconciliation.

```text
dead_letter(Thread A)
        |
        | Recover
        v
pending(Thread A)
        |
        v
reconciliation
```

Recovery is appropriate only when the authoritative blocker has already been removed or the failure was operational/transient. It must never be used to bypass `migration_required`, an integrity conflict, an unresolved operator decision, or another known semantic blocker.

Completed or unrelated Threads are not scanned or revived as a side effect of recovery.

## Lifecycle

The normal operator path is:

```text
legacy / malformed Thread
        |
        v
     diagnose
        |
        +--> migration_required -- no evidence --> remain legacy/quarantined
        |
        +--> migration_required -- evidence --> migrate
        |                                      |
        |                                      v
        |                                  re-diagnose
        |
        +--> repairable --------------------> repair
                                                |
                                                v
                                            re-diagnose
                                                |
                                                v
                                  healthy / legitimately repairable
                                                |
                                                v
                                             recover
                                                |
                                                v
                                           reconciliation
```

The phases remain separate even when Admin offers a compound operator action such as **Fix & Recover**. The UI convenience does not merge their authority semantics.

## Dead-letter and quarantine semantics

`dead_letter` is an operational reconciliation state, not a Thread lifecycle state and not a semantic judgment about the person. It means Fibre has stopped retrying a known terminal work item.

`migration_required` is a diagnosis about authoritative representation. A Thread may therefore be both semantically `migration_required` and operationally dead-lettered/quarantined.

The reconciliation workset must exclude `complete` and `dead_letter` work from normal background processing. A relevant authoritative repair or explicit recovery may re-enter work; ordinary birth replay or unrelated alarms may not.

## Admin semantics

Admin should make the distinctions visible rather than present one ambiguous repair button:

```text
Migration required + evidence available  -> Migrate Thread
Repairable derived state                 -> Fix Thread
Dead letter + authority ready            -> Recover
Repairable + dead letter                 -> Fix & Recover
Migration/integrity blocker unresolved   -> explain blocker; do not retry
```

For migration-required state, Admin should show the named migration and evidence status when known. For dead-letter state, it should show the stored failure code/message. Operator surfaces remain projection/control surfaces; they do not become the authority deciding the missing fact.

## Activity and provenance

Migration, repair and recovery should remain distinguishable in operational evidence.

Named migrations use their own operational family, for example:

```text
thread.migration.start
thread.migration.genesis_sex
thread.migration.complete
```

Repair remains under `thread.repair.*`; recovery records that quarantined work was reactivated. Activity may describe these operations but never substitutes for their authoritative records.

This distinction lets Fibre evolve its representation without rewriting a person's history, repair derived damage without inventing facts, and recover operational work without turning retries into semantic authority.
