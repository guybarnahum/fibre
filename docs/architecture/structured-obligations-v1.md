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

This conflates:

- a personal intention or unfinished goal;
- a social/legal commitment;
- a caller-nominated authority token.

Mina's fixture makes the defect concrete: `Read a case study on identity-system failures` is an unresolved intention, yet historical M1 tooling can cite that string as an obligation. #35 must not preserve that semantic conflation behind a richer object shape.

## Domain model

A Structured Obligation is a stable logical aggregate with append-only revisions.

Each revision records:

- stable `obligationId` (`obl_` + 64 lowercase hex characters);
- monotonic `revision` and immediate `supersedesRevision`;
- obligated `threadId`;
- `status`: `active`, `satisfied`, `expired`, `revoked`, or `discharged`;
- issuer and typed parties;
- natural-language scope plus optional Fibre-owned machine-checkable binding;
- terms;
- effective/expiry time;
- recurrence;
- satisfaction criteria;
- provenance and evidence refs;
- separate standing and terms visibility;
- optional `legacySourceDigest`;
- canonical record digest.

Terms may never be more public than the fact that the obligation stands.

Stable aggregate identity is stronger than record identity. Across revisions:

- the obligated Thread cannot change;
- issuer entity identity (`entityId` + `kind`) cannot change, though display text may;
- `legacySourceDigest`, if present, cannot be added, removed, or replaced;
- one legacy source can seed at most one Structured Obligation aggregate per Thread;
- once status is terminal, later corrective revisions cannot resurrect the obligation.

A materially new or re-created commitment gets a new `obligationId`.

## Scope versus applicability

Representation and authority remain separate.

The natural-language `scope.description` says what the commitment means. It is not executable authority.

V1 supports one deliberately conservative binding:

```text
scope.binding.kind = request_fingerprint
scope.binding.requestFingerprint = sha256:...
```

A stored obligation without a supported machine-checkable binding may exist and be inspectable, but it cannot override dignity under deterministic v1 applicability.

A later semantic applicability worker may broaden scope understanding, but it must remain Fibre-owned, evidence-bound, replayable, and independently validated.

## Applicability record

Applicability is an append-only decision distinct from the obligation itself.

Each persisted decision binds:

- applicability operation ID and input digest;
- Thread and historical Thread snapshot/state hash;
- request ID and request fingerprint;
- exact obligation ID, revision, and digest;
- nomination source (`caller`, `fibre`, or `both`);
- result (`applies` or `does_not_apply`);
- reason code;
- policy ID/version;
- Fibre-generated evidence refs;
- decision time, causation/correlation IDs, and decision digest.

Only an `applies` decision produced by Fibre's applicability policy may eventually support obligation-mediated authorization.

The caller may nominate an obligation ID but cannot author the result, reason, policy, obligation revision/digest, or evidence refs.

Authorization must bind the applicability decision ID/digest, not merely an obligation ID.

## Legacy migration

### Do not promote unresolved intentions

`currentState.unresolvedIntentions` is not an obligation registry. Migration MUST NOT convert those strings into active Structured Obligations.

After authority cutover, unresolved intentions remain personal/history context and carry zero obligation authority unless explicitly classified into a Structured Obligation through a separate authoritative operation.

### Preserve spent authority as spent

Historical `authorization_consumptions.obligation_refs_json` is evidence that an exact legacy reference was already consumed.

Migration creates one deterministic append-only tombstone per consumed `(threadId, legacyReference)` pair, including the exact legacy-reference digest and source authorization/consumption witness.

Any later explicit legacy import computing the same digest MUST NOT create active authority.

> **Pre-migration spent obligations remain spent.**

There is no automatic active-legacy migration because the old schema cannot distinguish a genuine commitment from a personal intention.

## Storage model

V1 uses three append-only tables:

```text
obligation_records
obligation_applicability_decisions
legacy_obligation_tombstones
```

`obligation_records` stores revisions, not a mutable current row. Current state is not trusted from `MAX(revision)` alone: Fibre validates the complete aggregate history and then returns the final valid revision.

The additive #35 storage/applicability work remains on world-store schema v4 under the existing same-version repair contract. A global version bump should occur only when the later authorization/freeze cutover changes an existing persisted contract.

SQL independently backstops append-only history, predecessor linkage, visibility ordering, stable Thread/issuer/legacy identity, terminal-status stability, legacy-origin uniqueness, and spent-legacy non-reactivation.

## ObligationStore v1 — B

`services/world-kernel/src/obligation-store.mjs` is the trusted revision substrate. It does not itself authorize participation.

Its write path is transactional:

```text
normalize candidate
  -> BEGIN IMMEDIATE
  -> verify Thread exists
  -> reread and verify complete obligation history
  -> resolve exact current revision
  -> enforce aggregate identity/lifecycle
  -> reject spent or duplicate legacy authority
  -> append one canonical revision + digest
  -> COMMIT
```

It exposes:

- `recordRevision(...)`;
- `getRevision(...)`;
- `listHistory(...)`;
- `getCurrentRevision(...)`;
- `resolveCurrentRevision({ threadId, obligationId, revision, obligationDigest })`;
- `listCurrent(...)`;
- `hasLegacyTombstone(...)`.

A correct obligation ID with a stale revision or digest is not current authority.

Read verification covers canonical JSON, digest, denormalized columns, predecessor continuity, stable owner/issuer/legacy identity, monotonic storage chronology, and terminal-status non-resurrection.

The row digest is an integrity witness inside Fibre's append-only boundary, not external notarization against a privileged administrator who disables enforcement and coherently rewrites both content and digest.

## Deterministic applicability v1 — C

Policy:

```text
structured_obligation_applicability / 1
```

A candidate can apply only when all are true:

1. it belongs to the Thread;
2. Fibre resolves its exact current revision/digest and verifies the full chain;
3. status is `active`;
4. it is effective at decision time;
5. it has not expired;
6. its supported request-fingerprint binding matches the persisted request;
7. no matching legacy tombstone forbids authority;
8. the persisted decision binds the same historical Thread snapshot/request that later authorization will use.

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

The applicability writer acquires SQLite's write reservation before consulting the companion file-backed `ObligationStore`. That companion performs B's full-chain read validation while the reservation prevents any competing writer from committing a newer obligation revision before the applicability row commits. The two connections therefore participate in one serialized write interval, though only the applicability connection owns the SQL transaction.

Fibre generates evidence refs for:

- the persisted activation request;
- the historical Thread snapshot;
- the exact obligation revision;
- any load-bearing legacy tombstone.

SQL backstops independently require an applicability insert to match the persisted activation request, the exact current obligation revision/digest, and policy `structured_obligation_applicability/1`.

Exact operation retry returns the original persisted decision even if time has advanced. A later obligation revision does not rewrite historical applicability; a new applicability operation binds the new current revision.

The current C implementation is file-backed. It uses a companion `ObligationStore` connection for full-chain validation while the applicability writer holds the SQLite write reservation. `:memory:` is not a supported evidentiary/runtime path for this cross-connection implementation and cannot produce a valid decision against the writer's separate in-memory world. A future shared-connection refactor may add true in-memory support without changing the decision contract.

## Required #35 adversarial cases

```text
unknown / foreign nomination
    -> no applicability record granting authority

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
    -> tombstone is load-bearing -> does_not_apply

restart / replay
    -> same obligation/applicability/authorization/discharge evidence
```

## Non-goals for v1

- no claim that arbitrary natural-language obligation scope is semantically understood;
- no caller-authored applicability result;
- no LLM requirement for applicability;
- no obligation authority from unresolved-intention membership;
- no score movement merely for richer representation;
- no rewriting private refusal into willing acceptance.

## Implementation status

### A — domain/schema/migration — LANDED

- domain validation and canonical digests;
- additive append-only tables;
- pure deterministic applicability policy;
- consumed-legacy tombstones;
- fail-closed migration and storage backstops.

### B — ObligationStore/revision integrity — LANDED

- transactional append and exact retry;
- full-chain current resolution;
- exact revision/digest binding;
- stable aggregate identity and terminal-state rules;
- concurrency/restart/corruption/adversarial coverage.

### C — persisted Fibre-owned applicability — LANDED

- persisted activation-request and historical-snapshot verification;
- Fibre-owned exact current-revision resolution;
- deterministic applicability within one serialized write interval;
- caller cannot author output fields;
- append-only decision/digest verification;
- SQL request/current-revision/policy backstops;
- exact operation idempotency across restart;
- historical decision preservation after later obligation revision;
- unrelated, unknown, foreign, corrupt-witness, concurrency, and legacy-spend coverage.

A, B, and C deliberately do **not** yet change runtime participation authorization. Historical M1 `obligationReferences` remains executable as legacy compatibility until the explicit authority cutover. Structured records and applicability decisions alone are not #35 authority closure.

## Follow-on implementation steps

1. **D — Runtime authorization cutover + applicability binding.** Remove exact-string/unresolved-intention authority from the canonical runtime and require a persisted `applies` decision bound by applicability ID/digest plus exact obligation revision/digest.
2. **E — Freeze/discharge cutover.** Discharge Structured Obligations through append-only status revisions and consumption evidence while preserving historical M1 evidence as historical only.
3. **F — Inspection + restart/replay/adversarial closure.** Expose bounded private/admin inspection and close #35 with full restart, replay, privacy, and authority-integrity tests.
