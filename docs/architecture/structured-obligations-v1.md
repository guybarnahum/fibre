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

A Thread may privately refuse or otherwise decline a request while a valid governing obligation authorizes participation. The resulting execution is obligation-mediated/compelled; the private stance remains authoritative as the Thread's own desire.

## Existing authority gap

Before #35, the canonical runtime accepted caller-supplied `obligationReferences` and treated membership in `thread.currentState.unresolvedIntentions` as sufficient authority to override a private refusal. Freeze then consumed the exact string and removed it from `unresolvedIntentions`.

This conflated a personal intention or unfinished goal, a social/legal commitment, and a caller-nominated authority token. Mina's fixture made the defect concrete: `Read a case study on identity-system failures` is an unresolved intention, yet historical M1 tooling can cite that string as an obligation. #35 must not preserve that semantic conflation behind a richer object shape.

D removes that authority path from the canonical world-kernel. Historical M1/v3 code and evidence remain readable as historical/internal compatibility, but the canonical server no longer accepts exact prose as obligation authority.

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

Only a persisted `applies` decision produced by Fibre can support obligation-mediated authorization. The caller may nominate an obligation ID but cannot author result, reason, policy, obligation revision/digest, or evidence refs.

An `applies` decision is historical evidence, **not a perpetual capability**. D therefore revalidates current obligation authority again at runtime authorization insertion. A later revision, revocation, discharge, expiry, tombstone, request-binding mismatch, or other loss of current authority prevents the historical `applies` record from being replayed into execution.

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
legacy_obligation_tombstones
```

Current obligation state is not trusted from `MAX(revision)` alone: Fibre validates the complete aggregate history before returning the final revision.

The additive #35 work remains on world-store schema v4 under the existing same-version repair contract. D adds conditional authorization guards for new structured authorization JSON while leaving historical M1 authorization rows readable. A global version bump should occur only if E changes the persisted contract of existing freeze/consumption tables or another later slice requires incompatible migration semantics.

SQL independently backstops append-only history, predecessor linkage, visibility ordering, stable Thread/issuer/legacy identity, terminal-state stability, legacy-origin uniqueness, spent-legacy non-reactivation, and D's current structured authority binding.

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

The canonical world-kernel now uses `StructuredObligationCausalWorldKernelService` with causal participation profile v4. The live participation API may nominate only a stable `governingObligationId`; legacy `governingObligationReferences` prose is rejected by the canonical structured service.

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

For compelled participation it also records a load-bearing `applicability` witness containing:

```text
applicabilityId
decisionDigest
obligationId
obligationRevision
obligationDigest
policy { id, version }
```

The legacy `obligationReferences` field remains present only for historical record-shape compatibility and is empty on all new structured authorizations. It carries no Structured Obligation authority.

A compelled authorization preserves the private `desiredAction` exactly and separately records `authorizedAction = accept`. It therefore represents the important Fibre distinction:

> **The Thread does not want to do this, but a current commitment can still bind what happens.**

A willing authorization cannot invoke obligation authority unnecessarily. An irrelevant obligation does not turn a non-execution stance into execution; C persists `does_not_apply` and D returns to the Thread's own stance.

The runtime SQL guard is intentionally load-bearing. C may have been correct when it ran, but between C and runtime insertion the obligation could be revised, revoked, expire, or become otherwise non-current. Because runtime insertion itself occurs under `BEGIN IMMEDIATE`, the current-authority recheck prevents a historical applicability decision from becoming a stale bearer token.

The canonical server owns and opens the applicability store. Callers cannot inject a substitute applicability store through server startup options.

D does **not** claim Structured Obligation discharge. Actor/Guardian execution can now be compelled through structured authority, but the obligation remains current until E appends the proper status/discharge history and consumption evidence.

### Why D is a Fibre step, not workflow plumbing

D makes a persistent social fact causally load-bearing while preserving the Thread's interior stance. The behavior is not “the request included a magic token, so execute.” Instead:

```text
Thread-owned current commitment
    -> Fibre-owned applicability judgment
    -> persisted authority witness
    -> current-authority revalidation
    -> compelled consequence
```

That is closer to a digital person than an assistant permission flag because a durable commitment can constrain future action **without changing what the Thread privately wants**. The provenance and exact current-state witnesses make the social constraint inspectable rather than hidden in prompt text or requester instructions.

D still earns no personhood score by itself. Its value is architectural: later identity, relationship, and institutional commitments can have real consequences without becoming caller-controlled execution channels.

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

expired / satisfied / revoked / discharged obligation
    -> no current execution authority

pre-migration consumed legacy reference
    -> tombstone load-bearing -> no authority

restart / replay after D
    -> same persisted private stance, applicability witness, authorization, and runtime identity
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

### D — runtime authorization cutover + applicability binding — LANDED

The canonical server now uses structured causal profile v4, rejects prose obligation authority, persists C from a stable nomination, distinguishes willing from compelled authorization, binds applicability ID/digest plus exact obligation revision/digest, and transactionally revalidates current authority at runtime insertion. Restart and stale-revision/expiry adversarial coverage are included.

A-D close the **canonical runtime authority-selection gap**: a caller can no longer create compelled execution merely by citing prose or by naming a real but irrelevant commitment. They do not yet close the full Structured Obligation lifecycle because discharge remains on the historical M1 freeze mechanism until E.

## Follow-on implementation steps

1. **E — Freeze/discharge cutover.** Discharge Structured Obligations through append-only status revisions and consumption evidence, bind the exact applicability/authorization chain, and preserve historical M1 evidence as historical only.
2. **F — Inspection + restart/replay/adversarial closure.** Expose bounded private/admin inspection and close #35 with full restart, replay, privacy, and authority-integrity tests.