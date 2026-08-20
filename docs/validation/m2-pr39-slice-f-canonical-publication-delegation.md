---
id: m2-pr39-slice-f-canonical-publication-delegation
status: implemented
last-reviewed: 2026-08-20
canonical: false
---

# Milestone #39 — Pre-G Stage 3: Slice-F canonical publication delegation

## Purpose

Pre-G Seam Stage 3 removes a semantic-drift class identified during the final Gate-F hostile review.

Before this stage, Slice F had two implementations of part of the same origin/source-integrity policy:

```text
store-backed Slice-F proof functions
        and
Genesis birth-publication checks
```

Both were correct at Gate-F closure, but publication independently reimplemented several semantic comparisons. A future edit could therefore weaken one path while leaving the other and the full suite green.

Stage 3 makes the Slice-F origin/source-integrity module the single semantic authority while preserving birth publication's existing transaction-local authority/history reads.

No Gate-F evidence, origin doctrine, publication transaction boundary, model cognition, or Slice-G material changes in this stage.

## Canonical pure witness assertions

`services/world-kernel/src/genesis-origin-source-integrity.mjs` now exports two pure semantic assertions:

```text
assertGenesisOriginAuthorityWitness(...)
assertForkBoundaryAgainstCanonicalEvents(...)
```

### Authority witness

The authority assertion owns the semantic match between an Echo/Homage fixture and an already-resolved durable authority record:

```text
expected authority kind
sourcePartyId
subjectStatus
```

The existing store-backed API:

```text
assertGenesisOriginAuthorityResolved(...)
```

still resolves through `GenesisOriginAuthorityStore`, then delegates the semantic decision to the pure witness assertion.

### Fork witness

The fork assertion owns the semantic match between a fork fixture and an already-resolved canonical source event sequence:

```text
divergence sequence exists
divergenceEventRef matches that canonical event
inheritedHistoryEventRefs equals the exact canonical prefix through divergence
```

The existing store-backed API:

```text
assertForkBoundaryAgainstCanonicalHistory(...)
```

still replays through the canonical `WorldStore`, then delegates to the pure event assertion.

Both pure assertions accept an error constructor so the same semantics can be used at different boundaries without changing the boundary's public error type. The normal Slice-F proof APIs continue to use `TypeError`; Genesis publication supplies `GenesisConflictError`.

## Publication transaction boundary

`services/world-kernel/src/genesis-store.mjs` still performs authority and source-history resolution **inside the birth transaction**.

That is deliberate. Stage 3 does not construct a second `WorldStore` or `GenesisOriginAuthorityStore` while publication is in progress and does not move source verification outside atomic birth.

The flow is now:

```text
BEGIN birth transaction
        ↓
resolve authority record transaction-locally
        ↓
canonical Slice-F authority assertion

or

resolve + replay source Thread transaction-locally
        ↓
canonical Slice-F fork assertion
        ↓
continue atomic birth
COMMIT
```

The transaction-local resolvers remain responsible for storage/canonical-integrity facts such as:

- authority record existence and digest/canonical JSON verification;
- source Thread event sequence, command witnesses, state hashes and projection agreement.

The Slice-F pure functions own the source/origin **semantic** decision over those resolved witnesses.

This separation avoids both forms of drift:

```text
storage proof duplicated in policy code       — avoided
semantic policy duplicated in publication     — removed
```

## Load-bearing publication mutations

A new integration regression file:

`services/world-kernel/test/genesis-slice-f-publication-delegation.test.mjs`

pushes the three hostile-review mutation gaps through `GenesisStore.publishBirth()` itself:

1. **Echo source-party mismatch** — a valid living-source consent record belongs to a different `sourcePartyId`; publication must reject.
2. **Homage subject-status mismatch** — a valid status attestation has the correct source party but attests `fictional` while the fixture says `deceased`; publication must reject.
3. **Noncanonical fork prefix** — the source Thread has two canonical events and the fixture ends at the correct divergence event but substitutes a fake earlier prefix event; publication must reject the prefix as noncanonical.

These are intentionally semantic mutations rather than merely missing-record cases. They fail only if publication actually enforces the canonical Slice-F meaning of the witness.

The pre-existing Gate-F integration tests remain in place for successful Echo/Homage/Thread-parent/Fork publication, missing authority, nonexistent fork source and manifest-reference mismatches.

## What Stage 3 does not change

Stage 3 does not:

- reopen or rerun Gate F;
- alter the accepted N2 result or any burned development artifact;
- weaken Echo consent or Homage status requirements;
- change Fork chronology rules;
- move authority/history verification outside atomic birth;
- create a new origin mode;
- make source biography into Thread autobiography;
- authorize any Slice-G cohort/world/model work.

## Verification requirement

Stage 3 becomes complete only after local maintainer verification of:

```text
services/world-kernel/test/genesis-slice-f-origin-source-integrity.test.mjs
services/world-kernel/test/genesis-slice-f-publication-enforcement.test.mjs
services/world-kernel/test/genesis-slice-f-publication-delegation.test.mjs

full npm test
npm run check
```

The new file adds three test cases. Test counts are secondary to the invariant: all three publication-level semantic mutations must reject while the previously cleared Slice-F paths remain green.
