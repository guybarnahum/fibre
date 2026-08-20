---
id: m2-pr39-pre-g-stage8-repository-integration-hygiene
status: complete
last-reviewed: 2026-08-20
canonical: false
---

# Milestone #39 — Pre-G Stage 8: final integration and repository hygiene

## Verdict

**COMPLETE.**

Stage 8 closed the last known Pre-G implementation seam and produced a clean, verified birth boundary for synthetic-lineage Threads.

Maintainer-verified implementation/evidence head:

```text
a956c86b1392636988ee4ffc67b8630460c63c6d
Retain E2-V2 zero-call preflight failure evidence
```

The closure documentation commit is later and documentation-only; `a956c86` remains the exact tested code/evidence head.

## Stage-7 entry

Stage 7 had already completed documentation/context reconciliation and the maintainer reported green:

```bash
npm run includes:check
npm run context-pack
npm run validate
npm run check
```

Stage 8 then closed the accepted symbolic-genome/lineage obligation surfaced by Stage 7:

> A synthetic-lineage child may not become live until its persisted symbolic genome, the genome's exact source owners, the Genesis manifest, and admitted #38 `biological_parent` / `parent_genome_source` relations agree.

## Integration design

### 1. The genome remains a pre-birth immutable input

`SymbolicGenomeStore` persists the child's symbolic genome before live Thread publication. A birth transaction does **not** rewrite, copy or recreate that genome.

For a manifest carrying `genomeRef`, birth transaction-locally verifies:

```text
genomeRef resolves to canonical persisted symbolic-genome state
genome owner kind == thread
genome owner ID == manifest.threadId
genome genesisId == manifest.genesisId
recombined source refs/owners/digests replay exactly
inherited loci match their source text
mutated loci have exact mutation witnesses
```

The normal symbolic-genome store and Genesis publication use the same transaction verifier in `symbolic-genome-persistence.mjs`. Genesis does not maintain a second recombination/integrity implementation.

### 2. Synthetic-lineage source owners become #38 life authority

For `originMode=synthetic_lineage`, birth additionally requires:

```text
child genome originKind == recombined
all source owners == synthetic_ancestor
ordered manifest.parentOrAncestorRefs == ordered genome source-owner IDs
exactly one revision-1 biological_parent / parent_genome_source relation per source owner
relation belongs to the child
relation provenance == genesis_created
relation is current at birth
relation recordedAt == publication.publishedAt
relation sourceReferences includes the birth seed event
```

The manifest/genome source sequence is ordered authority. The #38 relation candidates are identity-addressed records, so their incoming array order is not semantic. Stage 9 caught and closed that incidental order dependency before the seam was opened.

The relations are written to the existing #38 `life_relation_records` authority using the same relation append/digest/head/witness primitive as `SituatedLifeStore`; Genesis does not own alternate lineage tables or a duplicate relation serialization path.

### 3. Atomic publication boundary

Inside `GenesisStore.publishBirth()`'s existing `BEGIN IMMEDIATE` transaction, publication orders the relevant steps as:

```text
source/origin checks
  -> child projection + seed event
  -> #37 identity bootstrap / visual obligations
  -> Pass-A life events
  -> persisted genome verification
  -> #38 synthetic parent-genome-source relations
  -> admitted autobiographical memories
  -> final Genesis manifest
  -> COMMIT
```

Any mismatch or injected failure rolls back the live child, seed/history rows, identity bootstrap, lineage relations, memories and manifest together.

The already-persisted symbolic genome is intentionally **not** rolled back by a failed birth. It remains frozen/provisional Genesis provenance; it does not by itself make the child live.

## Shared persistence authority

Stage 8 also removed duplicate persistence mechanics from the first implementation pass:

- `symbolic-genome-persistence.mjs` owns transaction-level canonical/digest/source/recombination verification used by both `SymbolicGenomeStore` and Genesis birth;
- `situated-life-persistence.mjs` owns relation row/head/evidence-witness append used by both `SituatedLifeStore` and Genesis birth;
- `genesis-birth-genome-lineage.mjs` owns only the cross-domain birth contract: child/genesis binding, synthetic-lineage owner matching, exact birth relation shape and atomic orchestration.

This preserves one semantic/persistence authority per domain.

## Load-bearing regression

`services/world-kernel/test/genesis-pre-g-stage8-genome-lineage-binding.test.mjs` covers:

1. successful persisted child-genome + two-parent #38 lineage publication;
2. successful publication when the valid relation candidates arrive in reverse array order;
3. missing `genomeRef` target;
4. genome owned by another Thread;
5. genome carrying another `genesisId`;
6. manifest parent/ancestor source-owner substitution;
7. #38 relation source-owner substitution;
8. missing one of the two required parent-genome-source relations;
9. injected failure after lineage insertion, proving child/relations/manifest rollback while the pre-birth genome remains intact.

These are publication-path mutations, not isolated helper tests.

## Evidence preservation and repository posture

The E2-V2 zero-model-call failure artifact that had existed only in the maintainer worktree is now preserved exactly in Git:

```text
artifacts/validation/m2-pr39/e2/
  fibre-m2-pr39-slice-e2-v2-a0-zero-call-preflight-failure-v1.json
```

It was committed without regeneration in:

```text
a956c86b1392636988ee4ffc67b8630460c63c6d
```

Remote verification at closure also confirmed:

```text
main    d413e5f8f59ec7da8448784a6143cff6b6fec558
behind  0
```

No retained A–F result was rewritten to improve the narrative.

## Maintainer verification

The maintainer reported the final seam envelope green at `a956c86`:

```bash
node --disable-warning=ExperimentalWarning --test \
  services/world-kernel/test/genesis-pre-g-stage8-genome-lineage-binding.test.mjs

npm test
npm run test:repro
npm run test:all
npm run test:audit -- --check
npm run includes:check
npm run context-pack
npm run validate
npm run check

git status --short
git rev-parse HEAD
git rev-parse origin/main
git merge-base --is-ancestor origin/main HEAD
```

Closure conditions are therefore satisfied:

```text
[x] Stage-8 targeted hostile regression green
[x] active suite green
[x] repro suite green
[x] complete retained envelope green
[x] test-value audit green
[x] document/context/repository checks green
[x] working tree clean at tested head
[x] latest origin/main is an ancestor of tested head
[x] failed E2-V2 zero-call artifact preserved exactly
[x] exact tested head recorded
```

## What Stage 8 does not claim

Stage 8 does not:

- expose genome content to Pass A;
- change Pass-B treatment or Pass-C blindness;
- change a final G WorldSpec, cohort genome, rater or G/H outcome;
- make a synthetic ancestor a fake live Thread;
- convert genome ownership into relationship authority without #38 relation records;
- alter Gate C, D or F evidence;
- earn Whole-Person or causal-individuality credit;
- execute a provider/model call.

Stage 8 is COMPLETE. Stage 9 records the hostile readiness review that clears the Pre-G seam for Slice G.