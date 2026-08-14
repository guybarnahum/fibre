---
id: validation-m2-pr38-slice-a-hostile-review-closure
status: active
last-reviewed: 2026-08-13
canonical: true
---

# PR #38 Slice A — hostile review closure

This addendum supersedes the pre-review Slice-A implementation details in `m2-pr38-implementation-plan.md` wherever they conflict. The broader #38 scope and B/C/D plan remain unchanged.

## Review verdict received

The early hostile architecture review held Slice A with two S1 and six S2 findings. Its central diagnosis was correct:

> #37 versioned the registry so future registry evolution could not retroactively invalidate immutable rows, but Slice A had not applied the same rule to claim-admission policy.

The review also demonstrated that the original natural-language atomicity checker blocked formatting patterns rather than composition and therefore could not safely become an immutable-ledger admission boundary.

No Slice B/C/D bulk writer may start until the reworked Slice A passes hostile re-review.

## Frozen design after closure

### Historical validation is not current admission

`normalizeIdentityAssertion()` is the current/write admission path.

`rehydrateIdentityAssertion()` is the historical/read path.

A historical v2 assertion is validated under the exact claim-discipline witness stored in that assertion. A future current-policy change cannot retroactively subject existing rows to the new policy.

`admission` now separates two concerns:

```text
admission.policy
    = why / under what Fibre admission or provenance regime the row entered

admission.claimDiscipline
    = which immutable claim-shape policy admitted this row
```

The first recorded claim-discipline is:

```text
identity_atomic_material_proposition:1
```

Historical validators are retained by exact policy identity/version. The current policy is only used when admitting new v2 writes.

### Atomicity is structural

Every new v2 identity assertion requires:

```text
claimPredicate = {
  subject,
  predicate,
  object
}
```

The predicate is a short normalized one-predicate identifier. Subject and object each identify one side of that proposition. The human-readable `meaning` elaborates the same proposition; it is not the sole atomicity boundary.

The prose checker remains defense in depth and rejects the hostile composition forms demonstrated in review, including multi-sentence lowercase continuation, semicolon bundles, em/en-dash bundles, lists/paragraphs, and explicit conjunction-style bundle markers.

A future stronger prose checker may govern new writes without invalidating old rows because historical rows dispatch against their recorded discipline implementation/version.

### v1 is historical, not a bulk-authoring escape hatch

Existing v1 claims remain v1 forever and remain byte/digest compatible with #37.

The public `recordAssertion()` surface applies the one-material-proposition prose backstop to writes regardless of whether the existing claim is pinned to v1 or v2.

Registry v2 marks broad inherited v1 authoring domains as superseded where #38 provides narrower domains. New v2 authoring is steered to the split claim domains rather than creating new broad biography-style records.

This does not rewrite historical v1 assertions.

### Registry identity is durable and bounded

For v2 assertions, `registryVersion` participates in the assertion digest binding.

SQL independently enforces that revisions after revision 1 retain the same `registry_version` through `identity_assertions_registry_pin`.

Pure-v1 views and passports preserve #37 derivation-policy-v1 shape and digest semantics.

Mixed/v2 views use `identity_view_transaction_time:2` and bind only the exact registry/domain definitions referenced by that view. Adding an unrelated domain to the registry must not re-digest an untouched Thread merely because the global registry grew.

### Behavioral escalation stays outside Slice A

Lineage/family facts and `cultural_formation` are `context_only` in Slice A. They cannot become causal merely from ancestry, demographic labels, or cultural classification.

Where an existing domain permits movement to `candidate_causal`, a revision attempting escalation must carry changed meaning and at least one source reference absent from its predecessor. This is still not accepted causal standing.

The #38 invariant remains:

```text
acceptedCausalAssertions = 0
endogenousEvidenceAssertions = 0
```

### Memory is not history at the projection boundary

`memory_interpretation` projects under `memory`, not `history`.

Slice C still owns the richer autobiographical-memory epistemic aggregate and the durable separation among historical evidence, autobiographical recollection, contradiction, and later reinterpretation.

### Schema repair fails before destructive ambiguity

An exact #37 schema-v6 identity table remains repairable transactionally and provenance-preservingly.

The repaired table restores:

- v1+v2 registry constraints;
- `identity_assertions_registry_pin`;
- append-only update/delete triggers;
- identity indexes;
- foreign-key integrity.

If an old table contains a `registry_version` outside the supported historical set, repair fails before table replacement and names the offending version. It does not repeatedly enter an opaque partial-repair path.

## Regressions required at this checkpoint

The exact-head test suite must prove at least:

- frozen registry v1 remains unchanged;
- historical discipline dispatches by recorded policy witness;
- current admission is separate from historical rehydration;
- `claimPredicate` is mandatory for new v2 writes;
- hostile semicolon/lowercase/em-dash/list composition examples are rejected;
- public v1 revisions cannot become biography-blob bypasses;
- exact #37 schema repair preserves v1 rows and then admits a structural v2 claim;
- raw SQL cannot switch a later claim revision from registry v2 to v1;
- unsupported historical registry values fail explicitly before repair mutation;
- pure-v1 view/passport derivation remains v1-compatible;
- mixed/v2 views bind used domain definitions without a whole-registry digest dependency;
- integrity/CLI reports derive the actually admitted registries;
- causal and endogenous counts remain zero.

## Re-review gate

Before Slice B begins, hostile re-review should attempt to falsify:

1. Future claim-discipline versions cannot brick already-admitted rows.
2. A normal writer cannot persist a compound biography through `claimPredicate` plus prose backstop.
3. Raw SQL cannot change registry semantics inside an existing claim history.
4. Adding unrelated registry domains does not re-drift untouched mixed/v2 identity views.
5. Broad v1 claims are not a practical bulk-authoring escape route.
6. Culture, lineage, ancestry, geography, or embodiment cannot acquire causal standing in Slice A.
7. Schema-v6 repair remains atomic and diagnosable under hostile failure.
8. #39 retains a clean separate Genesis boundary for parent genomes, recombination/variation, childhood history, and childhood memories.

Only after this gate clears should #38 proceed to Slice B volume.
