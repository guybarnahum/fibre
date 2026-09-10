---
id: fibre-thread-lifecycle-accounting
status: accepted
last-reviewed: 2026-09-10
canonical: true
---

# Thread lifecycle and artifact accounting

## Purpose

Fibre must never accumulate ambiguous Threads or unowned identity/media artifacts. Every birth attempt, authoritative Thread and generated artifact must have a durable disposition.

A failed acceptance test is not itself a lifecycle event. Once World has accepted a valid birth, the Thread remains the same person through later infrastructure or reconciliation failures.

## Three distinct state axes

### Birth outcome

Applies to a birth attempt before or at the World authority boundary.

- `provisional` — Birth Center work exists but World has not accepted a Thread.
- `born` — World accepted the birth and assigned authoritative identity state.
- `stillborn` — the birth was rejected as structurally invalid and no authoritative Thread exists.

A stillborn attempt retains diagnostic provenance but never receives a live Thread lifecycle or becomes a silently repaired different birth.

### Authoritative Thread lifecycle

Applies only after `born`.

- `active` — living Thread.
- `retired` — lifecycle ended by explicit Fibre policy/authority.
- `deceased` — lifecycle ended by an explicit death event when Fibre supports biological/social death semantics.

Infrastructure, model, deployment, Presentation or media-generation failure must not change an active Thread to retired/deceased.

### Operational reconciliation state

Orthogonal to lifecycle.

- `converged` — required derived/projection state has converged.
- `pending` — legitimate retryable work is outstanding.
- `interrupted_recoverable` — a terminal infrastructure/provider/contract failure blocked convergence but authoritative Thread state remains valid and must resume after repair.
- `invalid_authoritative_state` — a defensive invariant found already-authoritative state that should never have crossed the birth boundary; retain it as historical evidence for explicit adjudication.

## Developmental age is not lifecycle status

`active` does not mean adult.

Fibre birth is operational birth, not necessarily biological age zero. A Thread may enter Fibre at an autobiographical age greater than zero with grounded prior history, relationships and memories. Fibre must not invent newborn/infancy recollection merely to fill time before the earliest remembered period.

Developmental age/phase is separate evolving life context. It may affect plausible activities, accompaniment, independence and care authority, but it does not replace the authoritative lifecycle above.

Likewise dependency is contextual rather than a lifecycle label. A child or other dependent person may have a self-authored personal flight plan while a caregiver has a scoped care plan affecting the enacted day. Neither plan should be rewritten as though it belonged to the other person.

## Artifact ownership and disposition

Every durable generated object must resolve to exactly one owning semantic demand or retained diagnostic record.

Retain, directly or through immutable provenance:

- environment;
- object reference and artifact role;
- owning `threadId` and birth/genesis/request identity when applicable;
- job/demand/Embodiment/media reference;
- creation/completion time;
- disposition: `active`, `superseded`, `historical_evidence`, or `eligible_for_gc`;
- whether the artifact is publicly projected.

Canonical visual roots belong to authoritative Thread/Embodiment identity. Derived official photos belong to Presentation media demands. Failed-attempt artifacts without an authoritative owner remain historical evidence until explicit garbage-collection policy adjudicates them.

No artifact may be deleted merely because an E2E run failed.

## Recovery invariant

For a `born + active + interrupted_recoverable` Thread, recovery resumes the existing identity:

```text
same threadId
same civil identity / FIN
same canonical visual phenotype
same already-generated valid canonical root when present
 -> resume missing admission/reconciliation
 -> Presentation
 -> current media demands
 -> Viewer
```

Recovery must not mint another FIN, create a replacement Thread, or regenerate an already verified immutable canonical root.

## Environment isolation

Lifecycle and artifact accounting are environment-scoped. Staging and production resources must never cross-reference or satisfy one another's state.

## Required census

Cloud acceptance must account for:

- every Birth Center birth attempt;
- every authoritative World Thread;
- civil identity / FIN association;
- canonical phenotype/root/Embodiment status;
- Presentation/Identity Card/official-photo state;
- active terminal/retryable reconciliation failures;
- durable generated artifacts and their owners/dispositions;
- orphan candidates where no valid owner can be resolved.

The census classifies records without guessing and fails when an authoritative Thread or durable artifact has no explicit disposition.

## Cloud E2E rule

Every `cloud:e2e` run ends with a retained run disposition:

```text
birth attempt only -> provisional or stillborn
World accepted birth -> born + active
later terminal failure -> active + interrupted_recoverable
full closure -> active + converged
```

Operational convergence is not developmental adulthood, memory formation or lived-world continuity; those are separate Fibre semantics.
