---
id: m2-pr39-pre-g-stage8-repository-integration-hygiene
status: implemented_awaiting_verification
last-reviewed: 2026-08-20
canonical: false
---

# Milestone #39 — Pre-G Stage 8: final integration and repository hygiene

## Purpose

Stage 8 closes the last known Pre-G implementation seam and prepares one clean, fully verified branch for the narrow Stage-9 readiness review.

Stage 7 surfaced a real accepted-plan obligation:

> A synthetic-lineage child may not become live until its persisted symbolic genome, the genome's exact source owners, the Genesis manifest, and admitted #38 `biological_parent` / `parent_genome_source` relations agree.

Stage 8 makes that relationship load-bearing without exposing genome content to Pass A and without creating a parallel Genesis relationship authority.

## Stage-7 entry

The maintainer reported the Stage-7 documentation/context envelope green:

```bash
npm run includes:check
npm run context-pack
npm run validate
npm run check
```

Stage 7 is therefore COMPLETE before this Stage-8 closure record.

## Integration design

### 1. The genome remains a pre-birth immutable input

`SymbolicGenomeStore` continues to persist the child's symbolic genome before live Thread publication. A birth transaction does **not** rewrite, copy or recreate that genome.

For a manifest carrying `genomeRef`, birth now transaction-locally verifies:

```text
genomeRef resolves to canonical persisted symbolic-genome state
genome owner kind == thread
genome owner ID == manifest.threadId
genome genesisId == manifest.genesisId
recombined source refs/owners/digests replay exactly
inherited loci match their source text
mutated loci have exact mutation witnesses
```

The normal symbolic-genome store and Genesis publication use the same shared transaction verifier in `symbolic-genome-persistence.mjs`. Genesis does not maintain a second recombination/integrity implementation.

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

The relations are written to the existing #38 `life_relation_records` authority. They use the same shared relation append/digest/head/witness primitive as `SituatedLifeStore`; Genesis does not own alternate lineage tables or a duplicate relation serialization path.

The existing #38 trigger still creates the canonical `situated_evidence_witnesses` relation-revision reference, and the shared persistence primitive verifies that witness exists and agrees with the inserted record.

### 3. Atomic publication boundary

Inside the existing `GenesisStore.publishBirth()` `BEGIN IMMEDIATE` transaction, publication now orders the relevant steps as:

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

The already-persisted symbolic genome is intentionally **not** rolled back by a failed birth. It remains a frozen/provisional input that may be inspected as failed Genesis provenance; it does not by itself make the child live.

## Shared persistence authority

The first implementation pass proved the required semantics but duplicated some persistence mechanics inside the birth adapter. Stage 8 tightened that before closure:

- `symbolic-genome-persistence.mjs` now owns transaction-level canonical/digest/source/recombination verification used by both `SymbolicGenomeStore` and Genesis birth;
- `situated-life-persistence.mjs` now owns relation row/head/evidence-witness append used by both `SituatedLifeStore` and Genesis birth;
- `genesis-birth-genome-lineage.mjs` owns only the **cross-domain birth contract**: child/genesis binding, synthetic-lineage owner matching, exact birth relation shape, and atomic orchestration.

This keeps the Stage-3 principle intact: one semantic/persistence authority per domain, with Genesis delegating rather than reimplementing it.

## Load-bearing regression

`services/world-kernel/test/genesis-pre-g-stage8-genome-lineage-binding.test.mjs` is an active regression covering:

1. successful persisted child-genome + two-parent #38 lineage publication;
2. missing `genomeRef` target;
3. genome owned by another Thread;
4. genome carrying another `genesisId`;
5. manifest parent/ancestor source-owner substitution;
6. #38 relation source-owner substitution;
7. missing one of the two required parent-genome-source relations;
8. injected failure **after lineage insertion**, proving child/relations/manifest rollback while the pre-birth genome remains intact.

These are publication-path mutations, not isolated helper tests.

## Repository/main posture

During Stage-8 implementation the branch comparison remained:

```text
main    d413e5f8f59ec7da8448784a6143cff6b6fec558
behind  0
```

No merge from `main` was required at that check. Stage 8 must repeat the comparison immediately before final closure because repository hygiene is a moving boundary.

No retained A-F scientific artifact or `tools/repro/` instrument was edited by this integration work.

## What Stage 8 does not change

Stage 8 does not:

- expose genome content to Pass A;
- change Pass-B treatment or Pass-C blindness;
- change a WorldSpec, cohort genome, rater or G/H protocol;
- make a synthetic ancestor a fake live Thread;
- convert genome ownership into relationship authority without the #38 relation record;
- alter Gate C, D or F evidence;
- earn Whole-Person or causal-individuality credit;
- execute a provider/model call.

## Verification required

Stage 8 remains `implemented_awaiting_verification` until the maintainer verifies the exact resulting branch:

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

Required closure:

```text
Stage-8 targeted hostile regression green
active suite green
repro suite green
complete retained envelope green
test-value audit green
document/context/repository checks green
working tree clean
latest origin/main is an ancestor of the Stage-8 head
no retained scientific evidence changed unintentionally
exact verified Stage-8 head recorded
```

Only after that local envelope is green may Stage 8 become COMPLETE. Stage 9 then performs the narrow hostile Pre-G readiness review before any Slice-G cohort/model activity.