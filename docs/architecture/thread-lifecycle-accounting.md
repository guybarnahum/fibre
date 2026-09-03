---
id: fibre-thread-lifecycle-accounting
status: accepted
last-reviewed: 2026-09-03
canonical: true
---

# Thread lifecycle and artifact accounting

## Purpose

Fibre must never accumulate ambiguous Threads or unowned identity/media artifacts. Every birth attempt, every authoritative Thread, and every generated artifact must have a durable disposition.

A failed acceptance test is not itself a lifecycle event. Once World has accepted a valid birth, the Thread remains the same person through later infrastructure or reconciliation failures.

## Three distinct state axes

### Birth outcome

Applies to a birth attempt before or at the World authority boundary.

- `provisional` — Birth Center work exists but World has not accepted a Thread.
- `born` — World accepted the birth and assigned authoritative identity state.
- `stillborn` — the birth was rejected as structurally invalid and no authoritative Thread exists.

A stillborn attempt must retain diagnostic provenance but must never receive a live Thread lifecycle or be silently repaired into a different birth.

### Authoritative Thread lifecycle

Applies only after `born`.

- `active` — living Thread.
- `retired` — lifecycle ended by explicit Fibre policy/authority.
- `deceased` — lifecycle ended by an explicit death event when Fibre supports biological/social death semantics.

Infrastructure failure, model failure, deployment failure, Presentation failure, or media-generation failure must not change an active Thread to retired/deceased.

### Operational reconciliation state

Orthogonal to lifecycle.

- `converged` — all currently required derived/projection state has converged.
- `pending` — legitimate retryable work is outstanding.
- `interrupted_recoverable` — a terminal infrastructure/provider/contract failure blocked convergence but authoritative Thread state remains valid and must be resumed after repair.
- `invalid_authoritative_state` — a defensive invariant found an already-authoritative Thread that should never have crossed the birth boundary; this is retained as historical evidence and requires explicit adjudication rather than silent mutation.

## Artifact ownership and disposition

Every durable generated object must resolve to exactly one owning semantic demand or retained diagnostic record.

For each artifact retain, directly or through immutable provenance:

- environment;
- objectRef;
- artifact role;
- owning threadId when applicable;
- owning birth/genesis/request identity when applicable;
- job/demand/Embodiment/media reference;
- creation/completion time;
- current disposition: `active`, `superseded`, `historical_evidence`, or `eligible_for_gc`;
- whether the artifact is publicly projected.

Canonical visual roots belong to the authoritative Thread/Embodiment identity. Derived official photos belong to Presentation media demands. Failed-attempt artifacts that have no authoritative owner must be retained as historical evidence until an explicit garbage-collection policy adjudicates them.

No artifact may be deleted merely because an E2E run failed.

## Recovery invariant

For a `born + active + interrupted_recoverable` Thread, recovery must resume the existing identity:

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

Recovery must not mint another FIN, create a replacement Thread, or regenerate a canonical root that already has a verified immutable result.

## Environment isolation

Lifecycle and artifact accounting are environment-scoped. Staging resources and production resources must never cross-reference or satisfy one another's state.

Production Cloudflare deployments use production Fibre service/resource instances; staging uses the corresponding `-staging` instances. Shared logical contracts do not imply shared durable state.

## Required census

Cloud acceptance must provide an operator-visible census capable of accounting for:

- every Birth Center birth attempt;
- every authoritative World Thread;
- civil identity / FIN association;
- canonical phenotype/root/Embodiment status;
- Presentation/Identity Card/official-photo state;
- active terminal/retryable reconciliation failures;
- durable generated artifacts and their owners/dispositions;
- orphan candidates where no valid owner can be resolved.

The census must classify each record without guessing and must fail the audit when an authoritative Thread or durable artifact has no explicit disposition.

## Cloud E2E rule

Every `cloud:e2e` run must end with a retained run disposition even when semantic closure fails:

```text
birth attempt only -> provisional or stillborn
World accepted birth -> born + active
later terminal failure -> active + interrupted_recoverable
full closure -> active + converged
```

Slice G is not considered operationally clean until the staging census can account for the historical G-development births and the `visual_identity_reference_*` objects already present in R2.
