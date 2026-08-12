---
id: architecture-structured-obligations-v1
status: proposed
last-reviewed: 2026-08-12
canonical: true
---

# Structured Obligation v1

## Purpose

Structured Obligation v1 turns a commitment into a durable Thread-owned social fact with inspectable provenance, request-bound authority, and durable lifecycle consequence.

The authority invariant is:

> **A caller may nominate an obligation; only Fibre may determine that it governs the current request.**

Nomination is attention, not authority.

The consent invariant is:

> **Compulsion never rewrites consent.**

A Thread may privately refuse, clarify, or otherwise decline a request while a valid governing obligation authorizes participation. The resulting execution is obligation-mediated/compelled; the private stance remains authoritative as the Thread's own desire.

The lifecycle invariant is:

> **A commitment that causally authorizes completed participation must leave a durable, append-only social consequence, or the whole freeze fails.**

## Authority gap closed by #35

Before #35, the canonical runtime could accept caller-supplied obligation prose and treat membership in `thread.currentState.unresolvedIntentions` as sufficient authority to override a private refusal. Freeze then consumed the exact string and removed it from `unresolvedIntentions`.

That conflated a personal intention or unfinished goal, a social/legal commitment, and a caller-nominated authority token. #35 removes that conflation from the canonical Structured Obligation path while retaining historical M1 records with the semantics under which they were written.

`currentState.unresolvedIntentions` is not an obligation registry and is never automatically promoted into active Structured Obligations.

## Domain model

A Structured Obligation is a stable logical aggregate with append-only revisions. Each revision records:

- stable `obligationId`;
- monotonic revision and predecessor identity;
- obligated Thread;
- lifecycle status;
- issuer and parties;
- natural-language scope and terms;
- effective and optional expiry time;
- recurrence representation;
- satisfaction criteria;
- provenance and evidence references;
- separate standing and terms visibility;
- optional legacy origin;
- canonical content digest.

Terms may never be more public than the fact that the obligation stands. Across revisions, obligated Thread, issuer identity, and legacy origin remain stable. A legacy origin may seed only one aggregate per Thread.

Once status is terminal (`satisfied`, `expired`, `revoked`, or `discharged`), later revisions cannot resurrect the same obligation. A materially new commitment receives a new `obligationId`.

Successful one-shot obligation-mediated runtime closure uses terminal status `discharged`, not `satisfied`. Goal Guardian completion proves consumption/discharge of the exact one-shot authority; it does not prove arbitrary natural-language satisfaction criteria true.

## Scope versus applicability

Representation and authority are separate. Natural-language scope is descriptive, not executable authority.

V1 supports one deliberately conservative machine binding:

```text
scope.binding.kind = request_fingerprint
scope.binding.requestFingerprint = sha256:...
```

A stored obligation without a supported binding may exist and be inspectable but cannot override dignity. A future semantic applicability worker may broaden scope understanding only if selection remains Fibre-owned, evidence-bound, replayable, and independently validated.

## Storage model

V1 uses:

```text
obligation_records
obligation_applicability_decisions
structured_obligation_discharges
structured_authority_withdrawal_closures
legacy_obligation_tombstones
```

A direct post-#35 lifecycle follow-up advances the world store to schema v5 because the append-only `thread_events` vocabulary now includes `COMPELLED_EPISODE_INTERRUPTED`. The Structured Obligation authority model itself is unchanged; v5 makes an already-established interrupted compelled episode part of replayable Thread life history.

Current obligation state is not trusted from `MAX(revision)` alone. Fibre validates the complete aggregate history before returning the current revision.

SQL independently backstops append-only history, predecessor linkage, visibility ordering, stable Thread/issuer/legacy identity, terminal-state stability, legacy-origin uniqueness, spent-legacy non-reactivation, current structured authority binding, and the exact applicability -> authorization -> consumption -> runtime -> freeze -> terminal-revision discharge chain.

## Legacy migration — A

Historical consumed exact-string authority becomes deterministic append-only tombstones. Any later explicit legacy import computing the same legacy digest cannot create active authority.

> **Pre-migration spent obligations remain spent.**

There is no automatic active-legacy migration because the old schema cannot distinguish a genuine commitment from a personal intention.

## ObligationStore and revision integrity — B

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

It provides transactional append, exact retry, historical/current reads, full-chain verification, exact current revision/digest resolution, current-list resolution, and legacy-tombstone lookup.

A correct obligation ID with a stale revision or digest is not current authority.

The row digest is an integrity witness inside Fibre's append-only boundary, not external notarization against a privileged administrator who disables enforcement and coherently rewrites storage.

## Persisted Fibre-owned applicability — C

Policy:

```text
structured_obligation_applicability / 1
```

A candidate can apply only when it belongs to the Thread; Fibre resolves and verifies the exact current revision; it is active/effective/unexpired; its supported request-fingerprint binding matches the persisted request; no legacy tombstone forbids authority; and the persisted decision binds the same historical Thread snapshot/request later used by authorization.

Natural-language terms may explain the commitment but cannot expand deterministic v1 authority.

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

Fibre generates evidence refs for the persisted request, historical Thread snapshot, exact obligation revision, and any load-bearing legacy tombstone. The caller cannot author applicability result, reason, policy, revision/digest, or evidence refs.

An `applies` decision is historical evidence, **not a perpetual capability**. A later obligation revision, revocation, discharge, expiry, tombstone, or request-binding mismatch prevents the old decision from being consumed as current authority.

Exact operation retry returns the original persisted decision even if time advances. A later obligation revision does not rewrite historical applicability; a new operation binds the new current revision.

The C implementation is file-backed. SQLite `:memory:` is not a supported runtime/evidentiary path because full-chain validation uses a companion file-backed connection.

## Runtime authorization cutover — D

The canonical world-kernel uses `StructuredObligationCausalWorldKernelService` with causal participation profile v4. The live participation API may nominate only a stable `governingObligationId`; legacy caller prose is rejected as canonical Structured Obligation authority.

```text
persisted private stance
        |
        +-- desiredAction=accept + dignity=high
        |       -> willing authorization
        |
        +-- non-accept + nominated obligationId
                -> Fibre persists C applicability
                -> does_not_apply: preserve private non-execution stance
                -> applies: attempt compelled authorization
                              -> BEGIN IMMEDIATE
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

Compelled authorization preserves private `desiredAction` exactly and separately records `authorizedAction = accept`.

For compelled participation, authorization carries a load-bearing applicability witness:

```text
applicabilityId
decisionDigest
obligationId
obligationRevision
obligationDigest
policy { id, version }
```

The historical `obligationReferences` field remains only for record-shape compatibility and is empty on new structured authorizations. It carries no Structured Obligation authority.

The runtime SQL guard is load-bearing. If the obligation advances, revokes, expires, or otherwise ceases to be current after C but before runtime insertion, authorization fails rather than treating the historical applicability record as a bearer token.

The canonical server owns the applicability store. Callers cannot inject a substitute through startup options.

## Freeze/discharge cutover — E

Freeze profile v2 makes completed one-shot obligation-mediated participation causally alter the Structured Obligation aggregate.

For a structured `obligation_override` runtime, freeze performs one serialized transaction:

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

The SQL discharge guard independently verifies that causal chain before accepting the witness.

### Legacy separation

E does **not** repurpose historical `freeze.report.dischargedObligations`. That field remains the M1 exact-prose/unresolved-intention contract so historical events replay under their original semantics.

For new Structured Obligation execution:

```text
authorization.obligationReferences = []
freeze.report.dischargedObligations = []
authorization consumption legacy refs = []
```

The social consequence lives in `obligation_records` plus `structured_obligation_discharges`. Structured compulsion cannot silently remove a personal `unresolvedIntention` merely because similar prose exists there.

### One-shot boundary

V1 auto-discharge is limited to `recurrence.kind = none`.

`recurrence.kind = descriptive` is representation only. Fibre does not yet have a machine occurrence/period/partial-satisfaction/next-due model, so recurring commitments fail closed instead of being collapsed into one terminal discharge.

## Inspection, restart/replay, privacy, and adversarial closure — F

F adds no new obligation semantics. It closes the evidence and inspection boundary around A-E.

The canonical server owns a dedicated `StructuredObligationInspectionStore` opened only after schema-owning stores complete additive repair. The inspector itself performs no migration, mutation, trigger restoration, or repair.

The inspection connection is deliberately read-only twice:

```text
DatabaseSync(..., { readOnly: true })
PRAGMA query_only=ON
```

The same verifier underlies live private inspection and the administrative offline tool.

### Live private inspection

The world-kernel exposes GET-only, private-token, loopback-only, `no-store` routes:

```text
GET /threads/:threadId/private/obligations
GET /threads/:threadId/private/obligations/integrity
GET /threads/:threadId/private/obligations/:obligationId
GET /threads/:threadId/private/requests/:requestId/obligation-applicability
GET /threads/:threadId/private/runtime/:sessionId/obligation-discharge
GET /threads/:threadId/private/runtime/:sessionId/authority-withdrawal
GET /threads/:threadId/private/authority-withdrawals
```

There is no corresponding public obligation route. Public Thread, event, and health responses do not reveal obligation IDs, private terms, applicability IDs, or discharge IDs.

Malformed route identifiers are caller errors and remain `400 INVALID_REQUEST`. Malformed persisted obligation evidence is an integrity failure and returns `503 INTEGRITY_FAILURE`; stored corruption is never misreported as a bad caller request.

### Administrative inspection

The same verifier is available offline as:

```bash
npm run inspect:obligations -- <world.sqlite>
npm run inspect:obligations -- <world.sqlite> --thread <thread-id>
npm run inspect:obligations -- <world.sqlite> --json
```

This is a companion administrative surface to the broader world-database inspector. It opens the source read-only and reports revision, applicability, and discharge integrity without repairing the source.

### Cross-chain verification

A discharge is considered inspectably valid only when all of the following independently agree:

```text
complete obligation revision history
  -> exact prior active revision + digest
  -> exact applicability decision + digest
  -> persisted activation-request witnesses
  -> exact obligation_override authorization + digest
  -> exact authorization consumption + digest
  -> completed runtime session
  -> exact freeze report + digest
  -> exact THREAD_FROZEN event
  -> exact terminal discharged revision + digest
  -> exact immutable discharge witness
```

The verifier checks canonical JSON, denormalized columns, content digests, stable aggregate identity, contiguous revision history, terminal non-resurrection, chronology, request/snapshot bindings, applicability policy/result, authorization basis, empty legacy authority refs on the structured path, runtime completion, freeze/event bindings, and terminal discharge linkage.

### Restart/replay proof

The canonical F process test completes a compelled Structured Obligation life, captures the full private inspection view, closes the independent world-kernel process, restarts against the same world database, and requires exact deep equality of the inspection view.

After restart:

```text
private desiredAction remains clarify
structured authorizedAction remains accept
runtime remains completed
obligation current revision remains discharged
applicability remains historical evidence
discharge causal chain remains verified
```

This preserves the distinction between private desire and compelled consequence through durable replay.

### Adversarial tamper proof

F also deliberately bypasses append-only protection after a clean completion, coherently rewrites a discharge witness field, recomputes its canonical JSON and row digest, and restarts Fibre.

The row is internally re-signed but no longer agrees with the freeze evidence. Both live private inspection and the offline administrative verifier detect the cross-chain mismatch. This demonstrates that F is not merely checking a self-consistent row digest.

### Privacy boundary

F proves route-level privacy and protected inspection, not encryption against a privileged database administrator. A principal with direct world-database access can inspect stored private data. Production authentication, authorization roles, encryption, and stronger external tamper anchors remain separate future hardening work.

No Thread Editor mutation or new editor authority is introduced by F.

## Hostile-review closure

The post-A-F hostile review strengthened the implementation without changing the central authority model. The review attacked caller escalation, stale applicability, consent representation, privacy, migration, replay, and semantic overclaiming. The authority core held; the fixes close downstream evidence and lifecycle gaps.

### Discharge is bidirectional evidence

`ObligationStore.recordRevision(...)` may not author `status = discharged`. Only the atomic structured freeze/discharge path may create that terminal social fact. Read-only inspection checks both directions:

```text
discharge witness -> exact terminal discharged revision
terminal discharged revision -> exactly one valid discharge witness
```

A terminal consequence with no causal witness is therefore corruption, not a valid obligation state.

### Applicability is re-derived during inspection

The read-only verifier does not merely recompute the digest of `decision_json`. It reruns `deterministicApplicability(...)` from the persisted obligation, request fingerprint, decision time, and legacy tombstone state, and requires the stored `result` and `reasonCode` to match. This remains effective even when no downstream authorization or discharge witness exists.

### Structured compulsion is the presentation authority

After the D cutover, legacy `authorization.obligationReferences` is intentionally empty for Structured Obligations. Downstream disclosure and human-readable/editor surfaces therefore consume the authoritative structured fields:

```text
authorization.participationBasis
authorization.applicability.applicabilityId
authorization.applicability.obligationId
```

A compelled episode is displayed and disclosed as compelled participation, not as willing acceptance and not as “not recorded.” The SQL rule that keeps legacy prose references empty remains intact.

### Authority withdrawn after execution is an interrupted historical episode

If a structured obligation is revised, revoked, expires, or becomes tombstoned after Actor execution has begun, freeze correctly refuses to consume stale authority. Fibre must also avoid leaving the episode permanently active or erasing the fact that execution occurred.

For the narrow v1 case:

```text
structured obligation_override authorization
  -> Actor run exists
  -> Goal Guardian pass exists
  -> governing authority is no longer current/live
  -> no freeze, consumption, or discharge exists
  -> atomic authority-withdrawal closure
  -> runtime aborted
  -> lease released with governing_authority_withdrawn
  -> authorization remains unconsumed
  -> obligation remains undischargeable under that episode
  -> interrupted execution remains append-only, inspectable history
```

The append-only record is `structured_authority_withdrawal_closures` with `obw_<64 hex>` identity. It binds the authorization, applicability, authorized obligation revision, current withdrawal-causing revision/state, Actor output, Guardian pass, operation lineage, and closure time. Exact retry is idempotent; a second operation cannot reuse the same session. The closure is rejected while authority is still live.

### Direct post-#35 closure — interrupted compelled episode persistence and history visibility

The focused hostile re-review found that the authority-withdrawal mechanism could still lose its semantic fact if nobody closed it before the physical thaw lease expired. The direct no-PR follow-up closes that gap without changing #35 authority semantics.

The stronger lifecycle invariant is:

> **An executed episode cannot disappear merely because the authority that initiated it later disappears.**

For a structured compelled runtime with Actor evidence and a Goal Guardian pass, lazy lease reclamation now checks whether the governing authority was already stale at the lease boundary. If so, a later thaw fails closed instead of rewriting the episode as generic `lease_expired`. The prior episode must first close as `governing_authority_withdrawn`.

Closure may occur after physical lease expiry, but Fibre evaluates withdrawal eligibility at:

```text
eligibilityAt = min(closedAt, lease.expiresAt)
```

This prevents retroactive relabeling: an authority change that occurs only after an otherwise ordinary timeout cannot transform that earlier timeout into an authority-withdrawal episode.

A new history-profile-v2 withdrawal closes atomically as:

```text
Actor evidence + Guardian pass
  -> authority stale by causal boundary
  -> append COMPELLED_EPISODE_INTERRUPTED Thread event
  -> advance Thread version/provenance only
  -> append normal command witness for replay integrity
  -> append structured authority-withdrawal closure
  -> abort runtime
  -> release lease with governing_authority_withdrawn
```

The public life event deliberately carries only:

```text
episodeKind      = compelled_participation
outcome          = interrupted
reasonCode       = governing_authority_withdrawn
guardianDecision = pass
```

It contains no obligation ID, applicability ID, authorization ID, session ID, closure ID, private stance, material terms, or private rationale. The full causal evidence remains private/admin inspection data.

Withdrawal closures are now enumerable per Thread through the private inspection route and offline inspector. `verifyThread(...)` reports both causal-chain integrity and whether each new history-profile-v2 closure has its exact replayable Thread event. Pre-follow-up #35 withdrawal rows remain readable and are explicitly counted as legacy closures without a history event rather than being rewritten.

This is intentionally distinct from historical `runtime_abandons`, whose meaning remains `guardian_rejected`. Fibre does not falsify a Guardian pass into a rejection merely to obtain lifecycle closure.

### Additional hostile-review hardening

- `verifyFreezeIntegrity(...)` now requires exactly one Structured Obligation discharge for `obligation_override` freeze and zero for willing freeze;
- expected obligation/applicability conflict and not-found outcomes are mapped to bounded 4xx responses instead of false 500 integrity incidents;
- top-level Thread snapshots are exact-keyed so public state cannot spoof `obl_`-shaped authoritative vocabulary;
- same-version additive schema repair plus legacy tombstone derivation is transactional;
- freeze verifies guarded runtime/lease update counts and reconstructs its persisted result before commit, avoiding a committed mutation being reported as a post-commit decode failure.

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
    -> if Actor executed and Guardian passed, governing_authority_withdrawn closes the runtime truthfully
    -> authorization remains unconsumed and interrupted execution remains inspectable

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
    -> full private inspection view replays identically

public or unauthenticated inspection attempt
    -> no private obligation evidence

non-GET inspection attempt
    -> no mutation surface

coherently re-signed discharge-row tamper
    -> cross-chain integrity failure
```

## Non-goals for v1

- no claim that arbitrary natural-language obligation scope is semantically understood;
- no caller-authored applicability result;
- no LLM requirement for applicability;
- no authority from unresolved-intention membership;
- no general recurring-obligation occurrence model;
- no claim that runtime completion semantically proves arbitrary satisfaction criteria;
- no public obligation-detail surface;
- no database-at-rest confidentiality claim;
- no production principal/role authorization model;
- no score movement merely for richer representation, authority plumbing, or inspection;
- no rewriting private refusal into willing acceptance.

## Implementation status

### A — domain/schema/migration — LANDED

Domain validation, append-only tables, deterministic policy, consumed-legacy tombstones, fail-closed migration, and storage backstops are implemented.

### B — ObligationStore/revision integrity — LANDED

Transactional append/exact retry, full-chain current resolution, exact revision/digest binding, stable aggregate identity/terminal-state rules, and concurrency/restart/corruption/adversarial coverage are implemented.

### C — persisted Fibre-owned applicability — LANDED

Persisted request/snapshot verification, Fibre-owned current-revision resolution, deterministic applicability within one serialized write interval, caller-output exclusion, decision/digest verification, SQL binding backstops, restart idempotency, historical decision preservation, and unrelated/unknown/foreign/corrupt-witness/concurrency/legacy-spend coverage are implemented.

### D — runtime authorization cutover + applicability binding — LANDED

The canonical server uses causal participation profile v4, rejects prose obligation authority, persists C from a stable nomination, distinguishes willing from compelled authorization, binds applicability ID/digest plus exact obligation revision/digest, and transactionally revalidates current authority at runtime insertion.

### E — freeze/discharge cutover — LANDED

Freeze profile v2 atomically closes one-shot Structured Obligation authority through an immediate terminal `discharged` revision plus immutable causal discharge witness. It revalidates current authority at freeze, preserves private stance and historical M1 event semantics, refuses descriptive recurrence auto-discharge, survives restart, and rolls back completely if the obligation advances before freeze.

### F — inspection + restart/replay/privacy/adversarial closure — LANDED

Structured inspection profile v1 adds shared read-only cross-chain verification, private GET-only kernel inspection, a first-class offline administrative inspector, exact restart/replay equality, public-route non-disclosure checks, and coherent re-signed tamper detection.

A-F plus hostile-review closure completed PR #35 Structured Obligation v1, which is now merged. The direct interrupted-compelled-history follow-up closes lease-expiry/history/enumeration visibility without consuming a PR number and without awarding personhood-score movement.

The next numbered PR remains **#36 — M2 Identity & Embodiment Contract**.