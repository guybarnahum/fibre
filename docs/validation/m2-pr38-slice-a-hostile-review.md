# PR #38 Slice A — hostile architecture review disposition

Original hostile-review checkpoint: `c057582a3660e05615300dbf86bdf74c1d47ffb4`

Amended re-review checkpoint: `76ea179c09d5ba5c2bf52e6feb7bde49ff19d08b`

Current disposition: **ACCEPTED AFTER AMENDMENT AND TARGETED RE-REVIEW. SLICE B MAY PROCEED.**

This document records architectural closure only. It does not declare PR #38 merge-ready and does not award causal standing or endogenous Development credit.

## Review thesis

The first hostile review found that Slice A had correctly versioned the identity registry per immutable row, but had not applied the same historical-version discipline to claim-admission policy. The then-current implementation re-ran the moving current atomic-claim policy while reading append-only historical rows. The reviewer also demonstrated that prose heuristics blocked formatting patterns more reliably than proposition composition.

The architectural correction was:

> Admission gates belong on the write path; historical reads validate the policy witness recorded with the immutable row.

## S1 closures

### Moving admission policy on the read path

**Closed.**

- `rehydrateIdentityAssertion()` is distinct from current admission.
- historical v2 rows dispatch through immutable `admission.claimDiscipline` recorded with the assertion.
- `assertCurrentClaimDiscipline()` is a write-time admission check.
- `admission.policy` records provenance/admission regime while `admission.claimDiscipline` records the claim-shape regime.
- policy evolution no longer retroactively invalidates immutable rows.

### Atomic composition

**Closed structurally and versionably.**

- v2 assertions require normalized `{subject,predicate,object}` `claimPredicate` structure.
- prose checks remain defense in depth.
- the current discipline is now `identity_atomic_material_proposition:2`, which closes the hostile repeated-conjunction bundle reproduced during re-review.
- historical `identity_atomic_material_proposition:1` rows remain permanently rehydratable under v1; v1 was not tightened retroactively.

This final residual is important evidence that the policy architecture works: tightening the standard became routine forward versioning rather than destruction of history.

## S2 closures

- `cultural_formation` is context-only in #38.
- behavioral escalation requires changed meaning and at least one new source reference.
- public v1 revisions also pass the single-proposition writer guard.
- coarse v1 domains superseded in v2 are unavailable for new v2 authoring.
- pure-v1 view/passport canonical shape and digests remain #37-stable.
- mixed/v2 views bind only registry domains actually used, preventing unrelated future registry additions from drifting existing artifacts.
- v2 assertion digest binds `registryVersion`; SQL pins registry version across claim revisions.
- integrity reporting derives admitted registries instead of hard-coding v1.
- mixed-registry inspection no longer renders `registry=vnull`; it reports the admitted set.
- `memory_interpretation` projects under `memory`, not `history`.
- unsupported historical registry values fail explicitly before schema repair mutation.

## Targeted re-review result

Claude independently re-ran the seven requested attacks against `76ea179...`:

1. policy-bump retro-invalidation — **CLOSED**
2. composition vs `claimPredicate` — **5/6 CLOSED; one residual downgraded to S3**
3. raw-SQL registry switching — **CLOSED**
4. pure-v1 digest stability — **CLOSED**
5. unrelated-domain digest stability — **CLOSED**
6. v1 authoring bypass — **CLOSED**
7. zero causal/endogenous credit — **CLOSED (0/0)**

The remaining composition residual has subsequently been closed through claim-discipline v2 without altering the v1 historical validator.

## Standing boundary

```text
acceptedCausalAssertions = 0
endogenousEvidenceAssertions = 0
```

Slice A does not award #40 causal individuality, #41 M2 standing, or #42 self-authored Development.

## Decision

**Slice A is accepted as the substrate for Slice B.**

The invariant carried forward is:

> Admission standards may evolve forward. Immutable history is interpreted under the standard that actually admitted it.
