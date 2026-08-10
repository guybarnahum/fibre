---
id: architecture-structured-obligations-v1
status: proposed
last-reviewed: 2026-08-10
canonical: true
---

# Structured Obligation v1

## Purpose

Structured Obligation v1 turns a commitment into a durable Thread-owned social fact with inspectable provenance and future authority consequences.

The authority invariant is:

> **A caller may nominate an obligation; only Fibre may determine that it governs the current request.**

Nomination is attention, not authority.

The second invariant is:

> **Compulsion never rewrites consent.**

A Thread may privately refuse or otherwise decline a request while a valid governing obligation authorizes participation. The resulting execution is obligation-mediated/compelled; the private stance remains authoritative as the Thread's own desire.

The lifecycle invariant added by E is:

> **A commitment that causally authorizes completed participation must leave a durable, append-only social consequence, or the whole freeze fails.**

## Existing authority gap

Before #35, the canonical runtime accepted caller-supplied `obligationReferences` and treated membership in `thread.currentState.unresolvedIntentions` as sufficient authority to override a private refusal. Freeze then consumed the exact string and removed it from `unresolvedIntentions`.

This conflated a personal intention or unfinished goal, a social/legal commitment, and a caller-nominated authority token. Mina's fixture made the defect concrete: `Read a case study on identity-system failures` is an unresolved intention, yet historical M1 tooling can cite that string as an obligation. #35 must not preserve that semantic conflation behind a richer object shape.

D removes that authority path from the canonical world-kernel. E removes the corresponding lifecycle dependency for new Structured Obligations: canonical structured compulsion no longer discharges prose from `unresolvedIntentions`. Historical M1/v3 code and evidence remain readable with their original semantics.

## Domain model

A Structured Obligation is a stable logical aggregate with append-only revisions. Each revision records stable `obligationId`, monotonic revision/predecessor identity, obligated Thread, lifecycle status, issuer/parties, scope and terms, effective/expiry time, recurrence, satisfaction criteria, provenance, standing/terms visibility, optional legacy origin, and canonical digest.

Terms may never be more public than the fact that the obligation stands. Across revisions the obligated Thread, issuer identity, and legacy origin remain stable. A legacy origin may seed only one aggregate per Thread. Once status is terminal (`satisfied`, `expired`, `revoked`, or `discharged`), later revisions cannot resurrect the same obligation. A materially new commitment gets a new `obligationId`.

E uses terminal status `discharged` for successful obligation-mediated runtime closure. This is intentionally narrower than claiming `satisfied`: completion of one authorized runtime with Goal Guardian pass proves consumption/discharge of the exact one-shot authority, not semantic truth of arbitrary natural-language satisfaction criteria.

## Scope versus applicability

Representation and authority remain separate. Natural-language scope is descriptive, not executable authority.

V1 supports one deliberately conservative machine binding:

```text
scope.binding.kind = request_fingerprint
scope.binding.requestFingerprint = sha256:...
```

A stored obligation without a supported binding may exist and be inspectable but cannot override dignity. A later semantic applicability worker may broaden scope understanding only if it remains Fibre-owned, evidence-bound, replayable, and independently validated.

## Applicability record

Applicability is an append-only decision distinct from the obligation itself. Each decision binds operation/input identity, the historical Thread snapshot, persisted request, exact obligation revision/digest, nomination source, result/reason, policy, Fibre-generated evidence refs, time/causation lineage, and a decision digest.

Only a persisted `applies` decision produced by Fibre can support obligation-mediated authorization. The caller may nominate an obligation ID but cannot author result, reason, policy, obligation revision/digest, or evidence refs.

An `applies` decision is historical evidence, **not a perpetual capability**. D revalidates current obligation authority at runtime authorization insertion, and E revalidates it again at freeze. A later revision, revocation, discharge, expiry, tombstone, request-binding mismatch, or other loss of current authority prevents the historical `applies` record from being consumed into a completed/discharged life.

## Legacy migration

`currentState.unresolvedIntentions` is not an obligation registry. Migration MUST NOT convert those strings into active Structured Obligations. After D, they remain personal/history context and carry zero canonical obligation authority unless explicitly classified through a separate authoritative operation.

Historical consumed exact-string authority becomes deterministic append-only tombstones. Any later explicit legacy import computing the same legacy digest MUST NOT create active authority.

> **Pre-migration spent obligations remain spent.**

There is no automatic active-legacy migration because the old schema cannot distinguish a genuine commitment from a personal intention.

## Storage model

V1 uses:

```text
obligation_records
obligation_applicability_decisions
structured_obligation_discharges
legacy_obligation_tombstones
```

Current obligation state is not trusted from `MAX(revision)` alone: Fibre validates the complete aggregate history before returning the final revision.

The additive #35 work remains on world-store schema v4 under the existing same-version repair contract. D adds conditional authorization guards for structured authorization JSON. E adds a new append-only discharge ledger and terminal obligation revisions while leaving the historical `THREAD_FROZEN`, `freeze_reports`, and `authorization_consumptions` record shapes replay-compatible.

SQL independently backstops append-only history, predecessor linkage, visibility ordering, stable Thread/issuer/legacy identity, terminal-state stability, legacy-origin uniqueness, spent-legacy non-reactivation, D's current structured authority binding, and E's exact applicability -> authorization -> consumption -> runtime -> freeze -> terminal-revision discharge chain.

## ObligationStore v1 — B

`services/world-kernel/src/obligation-store.mjs` is the trusted revision substrate.

```text
normalize candidate
  -> BEGIN IMMEDIATE
  -> verify Thread exists
  -> reread and verify complete history
  -> resolve exact current revision
  -> enforce aggregate identity/lifecycle
  -> reject spent or duplicate legacy authority
  -> append canonical revision + digest
  -> COMMIT
```

It provides transactional append, exact retry, historical/current reads, full-chain verification, exact current revision/digest resolution, current-list resolution, and legacy-tombstone lookup. A correct obligation ID with a stale revision or digest is not current authority.

The row digest is an integrity witness inside Fibre's append-only boundary, not external notarization against a privileged administrator who disables enforcement and coherently rewrites both content and digest.

## Deterministic applicability v1 — C

Policy:

```text
structured_obligation_applicability / 1
```

A candidate can apply only when it belongs to the Thread; Fibre resolves and verifies the exact current revision; it is active/effective/unexpired; its supported request-fingerprint binding matches the persisted request; no legacy tombstone forbids authority; and the persisted decision binds the same historical Thread snapshot/request later used by authorization.

Natural-language terms may explain the commitment but cannot expand deterministic v1 authority.

### Persisted decision transaction

`services/world-kernel/src/obligation-applicability-store.mjs` performs:

```text
BEGIN IMMEDIATE
  -> resolve operation idempotency
  -> verify persisted activation request JSON/fingerprint/record digest
  -> verify historical Thread snapshot witness
  -> resolve Fibre's exact current Structured Obligation revision
  -> inspect legacy-spend tombstone state
  -> run structured_obligation_applicability/1
  -> append immutable applicability decision + digest
COMMIT
```

The applicability writer acquires SQLite's write reservation before consulting the companion file-backed `ObligationStore`. That companion performs B's full-chain validation while the reservation prevents a competing writer from committing a newer obligation revision before the applicability row commits. Thus resolution and append occur within one serialized write interval, although only the applicability connection owns the SQL transaction.

Fibre generates evidence refs for the persisted activation request, historical Thread snapshot, exact obligation revision, and any load-bearing legacy tombstone. SQL backstops independently require an applicability insert to match the persisted request, exact current obligation revision/digest, and policy `structured_obligation_applicability/1`.

Exact operation retry returns the original persisted decision even if time has advanced. A later obligation revision does not rewrite historical applicability; a new operation binds the new current revision.

The C implementation is file-backed. Because full-chain validation currently uses a companion connection, SQLite `:memory:` is not a supported runtime/evidentiary path and cannot resolve against the writer's separate in-memory world. A future shared-connection refactor may add true in-memory support without changing the decision contract.

## Runtime authorization cutover — D

The canonical world-kernel uses `StructuredObligationCausalWorldKernelService` with causal participation profile v4. The live participation API may nominate only a stable `governingObligationId`; legacy `governingObligationReferences` prose is rejected by the canonical structured service.

The authority chain is:

```text
persisted private stance
        |
        +-- desiredAction=accept + dignity=high
        |       -> willing authorization
        |
        +-- non-accept + nominated obligationId
                -> Fibre persists C applicability
                -> does_not_apply: preserve private non-execution stance
                -> applies: attempt compelled runtime authorization
                              |
                              -> BEGIN IMMEDIATE in runtime store
                              -> revalidate exact applicability ID/digest
                              -> revalidate exact current obligation revision/digest
                              -> require active/effective/unexpired
                              -> require exact request-fingerprint binding
                              -> require no newer revision
                              -> require no spent-legacy tombstone
                              -> insert obligation_override authorization/runtime
```

Structured authorization explicitly records:

```text
participationBasis = willing | obligation_override
```

For compelled participation it records a load-bearing `applicability` witness containing:

```text
applicabilityId
decisionDigest
obligationId
obligationRevision
obligationDigest
policy { id, version }
```

The legacy `obligationReferences` field remains present only for historical record-shape compatibility and is empty on all new structured authorizations. It carries no Structured Obligation authority.

A compelled authorization preserves the private `desiredAction` exactly and separately records `authorizedAction = accept`.

> **The Thread does not want to do this, but a current commitment can still bind what happens.**

A willing authorization cannot invoke obligation authority unnecessarily. An irrelevant obligation does not turn a non-execution stance into execution; C persists `does_not_apply` and D returns to the Thread's own stance.

The runtime SQL guard is intentionally load-bearing. C may have been correct when it ran, but between C and runtime insertion the obligation could be revised, revoked, expire, or become otherwise non-current. Runtime insertion rechecks authority under `BEGIN IMMEDIATE`, preventing a historical applicability decision from becoming a stale bearer token.

The canonical server owns and opens the applicability store. Callers cannot inject a substitute applicability store through server startup options.

## Freeze/discharge cutover — E

E makes the completed runtime causally alter the Structured Obligation aggregate. Freeze profile v2 distinguishes this lifecycle contract from historical freeze v1.

For a structured `obligation_override` runtime, `FreezeStore.freezeRuntime` now performs one serialized transaction:

```text
BEGIN IMMEDIATE
  -> revalidate active runtime + lease
  -> revalidate exact authorization + Guardian pass
  -> revalidate exact applicability ID/digest
  -> revalidate exact obligation revision/digest
  -> reject any newer obligation revision
  -> require obligation still active/effective/unexpired
  -> require no spent-legacy tombstone
  -> build normal THREAD_FROZEN event / Thread update
  -> consume participation authorization
  -> persist freeze report
  -> mark runtime completed + release lease
  -> append obligation revision N+1 with status=discharged
  -> append immutable structured_obligation_discharges witness
COMMIT
```

Any failure rolls back the freeze, authorization consumption, runtime completion, terminal obligation revision, and discharge witness together.

The discharge witness binds exactly:

```text
prior obligation revision + digest
applicability ID + decision digest
authorization ID + authorization digest
authorization-consumption digest
runtime session + request
freeze operation + freeze report digest + event
terminal obligation revision + digest
discharge time + reason
```

The SQL discharge guard independently verifies that the entire chain exists and is coherent before accepting the witness.

### Legacy separation

E deliberately does **not** repurpose historical `freeze.report.dischargedObligations`. That field remains the M1 exact-prose/unresolved-intention contract so historical events replay under the semantics in which they were written.

For new Structured Obligation execution:

```text
authorization.obligationReferences = []
freeze.report.dischargedObligations = []
authorization consumption legacy refs = []
```

The social consequence lives in `obligation_records` plus `structured_obligation_discharges`. Structured compulsion therefore cannot silently remove a personal `unresolvedIntention` merely because similar prose exists there.

### One-shot discharge semantics

V1 auto-discharge is intentionally limited to `recurrence.kind = none`.

`recurrence.kind = descriptive` is representation only; Fibre does not yet have a machine model for occurrences, periods, partial satisfaction, or next-due state. E therefore fails closed rather than treating one completed runtime as discharge of an arbitrary recurring commitment.

A future recurrence model should represent occurrence-level authority and satisfaction explicitly rather than weakening this invariant.

### Why E is a Fibre step

D established that a durable commitment can constrain behavior without falsifying the Thread's private desire. E makes that constraint part of the Thread's durable social history:

```text
private non-consent
    + current commitment
    -> compelled participation
    -> completed guarded episode
    -> commitment authority consumed
    -> durable terminal social fact
```

This is materially different from a workflow permission bit. The Thread can later remember or reason about having been compelled, who the commitment involved, and that the commitment is no longer active, while its earlier private stance remains historically true.

E still earns no personhood-score movement by itself. It supplies trustworthy consequence semantics that later relationships, institutions, contracts, family roles, and economic commitments can use.

## Required #35 adversarial cases

```text
unknown / foreign nomination
    -> no authority-bearing applicability record or runtime

real but unrelated obligation
    -> does_not_apply
    -> private non-execution stance preserved

active exact-bound obligation
    -> applies
    -> may authorize obligation_override runtime

private dignity != accept + governing obligation
    -> compelled runtime may occur
    -> private stance remains unchanged
    -> never rewritten as consent

legacy unresolved-intention prose
    -> rejected as canonical obligation authority

C says applies, then obligation is revised/revoked before runtime insert
    -> runtime authorization rejected

C says applies, then obligation expires before runtime insert
    -> runtime authorization rejected

D authorized runtime, then obligation advances/revokes before freeze
    -> freeze rejected atomically
    -> no authorization consumption
    -> no freeze report
    -> no structured discharge

expired / satisfied / revoked / discharged obligation
    -> no current execution/discharge authority

descriptive recurring obligation
    -> cannot auto-discharge as one-shot v1 authority

pre-migration consumed legacy reference
    -> tombstone load-bearing -> no authority

successful compelled freeze + restart
    -> private stance remains historical truth
    -> runtime remains completed
    -> exact terminal obligation revision remains current
    -> exact discharge evidence remains durable
```

## Non-goals for v1

- no claim that arbitrary natural-language obligation scope is semantically understood;
- no caller-authored applicability result;
- no LLM requirement for applicability;
- no authority from unresolved-intention membership;
- no general recurring-obligation occurrence model;
- no claim that runtime completion semantically proves arbitrary satisfaction criteria;
- no score movement merely for richer representation or authority plumbing;
- no rewriting private refusal into willing acceptance.

## Implementation status

### A — domain/schema/migration — LANDED

Domain validation, append-only tables, deterministic policy, consumed-legacy tombstones, fail-closed migration, and storage backstops are implemented.

### B — ObligationStore/revision integrity — LANDED

Transactional append/exact retry, full-chain current resolution, exact revision/digest binding, stable aggregate identity/terminal-state rules, and concurrency/restart/corruption/adversarial coverage are implemented.

### C — persisted Fibre-owned applicability — LANDED

Persisted request/snapshot verification, Fibre-owned current-revision resolution, deterministic applicability within one serialized write interval, caller-output exclusion, decision/digest verification, SQL binding backstops, restart idempotency, historical decision preservation, and unrelated/unknown/foreign/corrupt-witness/concurrency/legacy-spend coverage are implemented.

### D — runtime authorization cutover + applicability binding — LANDED

The canonical server uses structured causal profile v4, rejects prose obligation authority, persists C from a stable nomination, distinguishes willing from compelled authorization, binds applicability ID/digest plus exact obligation revision/digest, and transactionally revalidates current authority at runtime insertion.

### E — freeze/discharge cutover — LANDED

Freeze profile v2 atomically closes one-shot Structured Obligation authority through an immediate terminal `discharged` revision plus immutable causal discharge witness. It revalidates current authority at freeze, preserves private stance and historical M1 event semantics, refuses descriptive recurrence auto-discharge, survives restart, and rolls back completely if the obligation advances before freeze.

A-E close the canonical **authority selection + one-shot lifecycle consequence** path. They do not yet claim #35 closure because bounded inspection and full replay/privacy/adversarial closure remain F.

## Follow-on implementation step

1. **F — Inspection + restart/replay/adversarial closure.** Expose bounded private/admin inspection of Structured Obligations/applicability/discharge evidence and close #35 with full restart, replay, privacy, and authority-integrity tests.