# PR #38 Slice B — hostile partial-review checkpoint

Status: **HOLD — do not freeze; Slice C remains blocked.**

Reviewed implementation checkpoint: `2d01566555d639bc01fffa5e96a7b426d1797f4e`

Reviewed validation: Actions run **2254**, `npm run check` passed, **406/406 tests**, repository validation clean. Green CI did not establish witness grounding or non-local ledger integrity.

Scope: Slice B only — lineage/family, geography, lived culture/language, embodiment, schema integration, and read-only inspection.

## Hostile-review verdict

Two of three thesis clauses failed:

- stereotype / cross-domain protection: **failed**;
- callers cannot manufacture evidence: **failed**;
- zero causal/endogenous standing inflation: **held**.

Unifying diagnosis: the record shapes and slot-stability rules are strong, but cited evidence is not resolved and situated-life integrity is only row-local.

## Blocking findings

### S1-A — unresolved witnesses

Situated-life `sourceReferences` are syntax-checked but not resolved against authoritative records. A fabricated event reference can therefore ground a biological-parent relation carrying `parent_genome_source`. The same missing gate affects identity authoring. Situated-life also needs an explicit retraction/currentness path so a bad relation is not permanent merely because its slot is stable.

Required closure: registry-driven witness requirements enforced inside the stores' existing write transactions; authoritative resolution of required Thread-event / relation-revision / place-revision witnesses; explicit non-current/retracted semantics for situated-life records.

### S1-B — local digest can be recomputed

The situated-life digest is derived only from the row. After append-only triggers are bypassed, a coordinated rewrite of canonical JSON, mirrored columns, and recomputed digest survives canonical inspection.

Required closure: chain each revision to its predecessor digest, persist and verify lineage heads, detect truncation/erasure, and change hostile tests to recompute the forged digest rather than leaving it stale. Migration/repair must never bless mixed NULL/non-NULL digest history.

### S1-C — cross-domain authoring bypass

Lived-evidence requirements currently live in helper services rather than the `IdentityStore.recordAssertion` authority gate. Direct v2 writes can bypass those helpers. `place_meaning` also inherited `candidate_causal`, creating a situated-life causal channel before #40.

Required closure: enforce registry-declared witness policy at `recordAssertion`; cap `place_meaning` at `context_only`; require a resolved place witness for place meaning; preserve `acceptedCausalAssertions = 0` and `endogenousEvidenceAssertions = 0`.

## S2 closure set before Slice C

- embodiment human-source rights evidence must be resolved and revision-monotonic;
- human-source derivative permission/source references may not disappear or swap silently;
- visibility may not widen without new authority;
- embodiment `specification` must be typed/non-empty enough to remain durable truth authority independent of cache pointers;
- `explicit_consent` cannot be satisfied by an unresolved string;
- same-version digest repair must fail closed on mixed NULL/non-NULL rows and fresh/upgraded schemas must converge on the same NOT NULL/CHECK invariants;
- birth geography must regain singleton/stable-place semantics suitable for #39;
- parent-genome eligibility must reject impossible party ontology and pathological cardinality before #39 consumes it.

## Preserved mechanisms

Keep these intact while closing the HOLD:

- embodiment representation-kind × truth-status bijection and cross-revision truth-class stability;
- relation slot stability, including the rule that non-biological relations cannot later become genome-eligible;
- cache/provider metadata is not truth authority;
- schema repair transactionality and restart convergence already demonstrated for the pre-closure path;
- #39 Genesis boundary remains clean: no genome payload/recombination/mutation/childhood machinery in #38;
- hard anti-inflation invariant remains:

```text
acceptedCausalAssertions = 0
endogenousEvidenceAssertions = 0
```

## Gate to resume Slice C

Slice B may be frozen only after the S1 closure is implemented, the S2 trust-boundary items above are closed or explicitly dispositioned, hostile reproductions fail for the intended architectural reason, exact-head CI is green, and a focused hostile re-review clears the grounding substrate.
