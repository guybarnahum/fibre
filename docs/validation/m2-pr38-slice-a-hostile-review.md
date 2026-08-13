# PR #38 Slice A — hostile architecture review disposition

Reviewed checkpoint: `c057582a3660e05615300dbf86bdf74c1d47ffb4`

Review verdict: **HOLD — 2 S1, 6 S2**.

This document records the actionable findings and the closure posture on the amended Slice-A head. It does not convert the external review into Fibre-owned standing evidence and does not declare #38 merge-ready.

## Review thesis

The reviewer found that Slice A had correctly versioned the identity registry per immutable row, but had not applied the same historical-version discipline to claim-admission policy. The then-current implementation re-ran the moving current atomic-claim policy while reading append-only historical rows. The reviewer also demonstrated that the prose heuristic blocked formatting patterns rather than reliably establishing proposition atomicity.

The required architectural correction was:

> admission gates belong on the write path; historical reads validate the policy witness recorded with the immutable row.

## S1 disposition

### S1-1 — moving admission policy on the read path

**Closed on amended Slice A.**

- `rehydrateIdentityAssertion()` is distinct from current admission.
- historical v2 rows dispatch through the immutable `admission.claimDiscipline` witness stored with the assertion.
- `assertCurrentClaimDiscipline()` is a write-time admission check for new rows.
- `identityAssertionDigest()` rehydrates under recorded historical semantics rather than comparing historical rows against the moving current-policy alias.
- `admission.policy` remains the provenance/admission regime; `admission.claimDiscipline` separately records the structural claim-discipline policy.

A future claim-discipline policy version can therefore coexist with rows admitted under `identity_atomic_material_proposition:1` without retroactively invalidating those rows.

### S1-2 — formatting heuristic did not establish atomic composition

**Closed structurally for v2 authoring; prose heuristic retained as defense in depth.**

- v2 assertions now require `claimPredicate` with normalized `{subject,predicate,object}` structure.
- predicate form is bounded and singular.
- subject/object components reject obvious compound proposition structure.
- prose checks were tightened for lowercase sentence continuation, semicolons, em/en dashes, and explicit bundles.
- claim predicate subject/predicate is stable across revisions of the same claim.

The `meaning` remains prompt-native elaboration; it is no longer the sole machine representation of proposition identity.

## S2 disposition

### S2-1 — behavioral escalation / cultural stereotype bypass

**Closed for Slice A.**

- `cultural_formation` is `context_only` in registry v2.
- revision escalation to `candidate_causal` requires both changed meaning and at least one new source reference.
- lineage/family/ancestral-origin/geography facts remain context-only where appropriate.

#38 still awards no accepted-causal credit.

### S2-2 — v1 public write bypass / superseded v1 domains

**Closed at the public authoring boundary.**

- `recordAssertion()` applies `assertSingleMaterialProposition()` before registry dispatch, including revisions of v1 claims.
- v2 marks coarse v1 authoring domains such as `lineage_family`, `upbringing_culture`, `geography`, `embodiment`, and `lived_episode` as superseded for new authoring, with explicit successor domains.
- immutable historical v1 rows remain readable under v1 semantics.

### S2-3 — pure-v1 view/passport digest drift

**Closed.**

- pure-v1 identity views retain the v1 canonical registry shape and `identity_view_transaction_time:1` derivation policy.
- mixed/v2 views use `identity_view_transaction_time:2`.
- pure-v1 passport shape preserves the v1 `registryVersion` / `registryDigest` binding.

### S2-4 — whole-registry digest causes additive-domain re-drift

**Closed for v2 canonical views.**

- mixed/v2 views bind only the registry/domain definitions actually referenced by assertions through per-domain `registryBindings`.
- adding an unrelated future domain does not by itself change an untouched Thread view digest.

### S2-5 — registry_version not digest-bound / SQL INSERT pin gap

**Closed.**

- v2 assertion digest payload includes `registryVersion`.
- SQL has `identity_assertions_registry_pin`, a `BEFORE INSERT` trigger that requires revisions >1 to inherit revision-1 `registry_version`.
- read failures are wrapped with assertion ID and recorded registry context before view construction.

Historical v1 assertion digest semantics remain unchanged.

### S2-6 — integrity attestation hard-coded registry v1

**Closed.**

- integrity derives admitted registry versions.
- singular `registryVersion` / `registryDigest` are emitted only when exactly one registry is present; mixed ledgers report the admitted registry set.
- derivation policy is taken from the actual passport/view.

## Additional review items closed early

The review also recommended several S3 fixes that were inexpensive before B/C volume:

- split `admission.policy` from `admission.claimDiscipline`;
- project `memory_interpretation` under `memory`, not `history`;
- refuse unsupported stored `registry_version` values during repair with an explicit `IntegrityError`;
- validate `claimId` before binding it to SQLite on the public writer path.

## Verified invariants retained

The hostile review explicitly verified these original Slice-A properties and the amended implementation preserves them:

- registry v2 is additive;
- frozen v1 rows remain historically routed to v1;
- schema repair is transactional and idempotent;
- no causal standing is awarded;
- no endogenous Development credit is awarded.

## Re-review posture

Slice A should not be treated as accepted merely because the fixes are present and CI is green. The amended head must be sent back through the same hostile architecture questions, especially:

1. policy-version bump does not brick historical rows;
2. compound claims cannot bypass structural v2 admission;
3. raw SQL cannot switch registry version within a claim lineage;
4. pure-v1 digests remain #37-stable;
5. unrelated registry additions do not drift existing v2 views;
6. v1 historical compatibility does not remain an idiomatic public authoring bypass;
7. `acceptedCausalAssertions = 0` and `endogenousEvidenceAssertions = 0` remain true.

Only after that re-review should Slice B begin writing lineage, geography, culture, and embodiment data at volume.
