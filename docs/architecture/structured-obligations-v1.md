---
id: architecture-structured-obligations-v1
status: proposed
last-reviewed: 2026-08-09
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

A Thread may privately refuse a request while a valid governing obligation still authorizes participation. The resulting execution is obligation-mediated/compelled; the private refusal remains authoritative.

## Existing authority gap

Before #35, the canonical runtime accepts caller-supplied `obligationReferences` and treats membership in `thread.currentState.unresolvedIntentions` as sufficient authority to override a private refusal. Freeze then consumes the exact string and removes it from `unresolvedIntentions`.

This conflates a personal intention or unfinished goal, a social/legal commitment, and a caller-nominated authority token. Mina's fixture makes the defect concrete: `Read a case study on identity-system failures` is an unresolved intention, yet historical M1 tooling can cite that string as an obligation. #35 must not preserve that semantic conflation behind a richer object shape.

## Domain model

A Structured Obligation is a stable logical aggregate with append-only revisions. Each revision records stable `obligationId`, monotonic revision/predecessor identity, obligated Thread, lifecycle status, issuer/parties, scope and terms, effective/expiry time, recurrence, satisfaction criteria, provenance, standing/terms visibility, optional legacy origin, and canonical digest.

Terms may never be more public than the fact that the obligation stands. Across revisions the obligated Thread, issuer identity, and legacy origin remain stable. A legacy origin may seed only one aggregate per Thread. Once status is terminal (`satisfied`, `expired`, `revoked`, or `discharged`), later revisions cannot resurrect the same obligation. A materially new commitment gets a new `obligationId`.

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

Only a persisted `applies` decision produced by Fibre may eventually support obligation-mediated authorization. The caller may nominate an obligation ID but cannot author result, reason, policy, obligation revision/digest, or evidence refs. Authorization must eventually bind applicability ID/digest, not merely an obligation ID.

## Legacy migration

`currentState.unresolvedIntentions` is not an obligation registry. Migration MUST NOT convert those strings into active Structured Obligations. After authority cutover they remain personal/history context and carry zero obligation authority unless explicitly classified through a separate authoritative operation.

Historical consumed exact-string authority becomes deterministic append-only tombstones. Any later explicit legacy import computing the same legacy digest MUST NOT create active authority.

> **Pre-migration spent obligations remain spent.**

There is no automatic active-legacy migration because the old schema cannot distinguish a genuine commitment from a personal intention.

## Storage model

V1 uses:

```text
obligation_records
obligation_applicability_decisions
legacy_obligation_tombstones
```

Current obligation state is not trusted from `MAX(revision)` alone: Fibre validates the complete aggregate history before returning the final revision.

The additive #35 storage/applicability work remains on world-store schema v4 under the existing same-version repair contract. A global version bump should occur only when the later authorization/freeze cutover changes an existing persisted contract.

SQL independently backstops append-only history, predecessor linkage, visibility ordering, stable Thread/issuer/legacy identity, terminal-state stability, legacy-origin uniqueness, and spent-legacy non-reactivation.

## ObligationStore v1 — B

`services/world-kernel/src/obligation-store.mjs` is the trusted revision substrate. It does not authorize participation.

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

A candidate can apply only when it belongs to the Thread; Fibre resolves and verifies the exact current revision; it is active/effective/unexpired; its supported request-fingerprint binding matches the persisted request; no legacy tombstone forbids authority; and the persisted decision binds the same historical Thread snapshot/request that later authorization will use.

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

The applicability writer acquires SQLite's write reservation before consulting the companion file-backed `ObligationStore`. That companion performs B's full-chain validation while the reservation prevents a competing writer from committing a newer obligation revision before the applicability row commits. Thus the resolution and append occur within one serialized write interval, although only the applicability connection owns the SQL transaction.

Fibre generates evidence refs for the persisted activation request, historical Thread snapshot, exact obligation revision, and any load-bearing legacy tombstone. SQL backstops independently require an applicability insert to match the persisted request, exact current obligation revision/digest, and policy `structured_obligation_applicability/1`.

Exact operation retry returns the original persisted decision even if time has advanced. A later obligation revision does not rewrite historical applicability; a new operation binds the new current revision.

The C implementation is file-backed. Because full-chain validation currently uses a companion connection, SQLite `:memory:` is not a supported runtime/evidentiary path and cannot resolve against the writer's separate in-memory world. A future shared-connection refactor may add true in-memory support without changing the decision contract.

## Required #35 adversarial cases

```text
unknown / foreign nomination
    -> no authority-bearing applicability record

real but unrelated obligation
    -> does_not_apply

active exact-bound obligation
    -> applies

private dignity = refuse + governing obligation
    -> may later authorize compelled execution
    -> private refusal remains unchanged

expired / satisfied / revoked / discharged obligation
    -> no authority

legacy unresolved intention without structured obligation
    -> no authority

pre-migration consumed legacy reference
    -> tombstone load-bearing -> does_not_apply

restart / replay
    -> same obligation/applicability/authorization/discharge evidence
```

## Non-goals for v1

- no claim that arbitrary natural-language obligation scope is semantically understood;
- no caller-authored applicability result;
- no LLM requirement for applicability;
- no authority from unresolved-intention membership;
- no score movement merely for richer representation;
- no rewriting private refusal into willing acceptance.

## Implementation status

### A — domain/schema/migration — LANDED

Domain validation, append-only tables, deterministic policy, consumed-legacy tombstones, fail-closed migration, and storage backstops are implemented.

### B — ObligationStore/revision integrity — LANDED

Transactional append/exact retry, full-chain current resolution, exact revision/digest binding, stable aggregate identity/terminal-state rules, and concurrency/restart/corruption/adversarial coverage are implemented.

### C — persisted Fibre-owned applicability — LANDED

Persisted request/snapshot verification, Fibre-owned current-revision resolution, deterministic applicability within one serialized write interval, caller-output exclusion, decision/digest verification, SQL binding backstops, restart idempotency, historical decision preservation, and unrelated/unknown/foreign/corrupt-witness/concurrency/legacy-spend coverage are implemented.

A, B, and C deliberately do **not** yet change runtime participation authorization. Historical M1 `obligationReferences` remains executable as legacy compatibility until the explicit authority cutover. Structured records and applicability decisions alone are not #35 authority closure.

## Follow-on implementation steps

1. **D — Runtime authorization cutover + applicability binding.** Remove exact-string/unresolved-intention authority from the canonical runtime and require a persisted `applies` decision bound by applicability ID/digest plus exact obligation revision/digest.
2. **E — Freeze/discharge cutover.** Discharge Structured Obligations through append-only status revisions and consumption evidence while preserving historical M1 evidence as historical only.
3. **F — Inspection + restart/replay/adversarial closure.** Expose bounded private/admin inspection and close #35 with full restart, replay, privacy, and authority-integrity tests.
