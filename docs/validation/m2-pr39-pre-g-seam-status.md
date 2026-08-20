---
id: m2-pr39-pre-g-seam-status
status: in_progress
last-reviewed: 2026-08-20
canonical: false
---

# Milestone #39 — Pre-G seam status

## Purpose

The Pre-G seam closes known doctrine, authority, regression, evidence-lifecycle, integration and documentation obligations from Slices A–F **before** Slice G freezes the final #39 cohort and protocol.

G's methodological boundary remains:

> **The test exists before the people.**

No Slice-G cohort WorldSpec, cohort genome, familiarity result, G/H model call or generated final-cohort life may exist until this seam closes.

This seam is cleanup/preflight work. It earns no Whole-Person standing and does not reopen the already-cleared C, D or F gates.

## Entry state

```text
Gate C  CLEAR
Gate D  CLEAR
Gate F  CLEAR
```

Gate-F closure: [`m2-pr39-slice-ef-gate-f-result.md`](m2-pr39-slice-ef-gate-f-result.md).

The Gate-F reviewed evidence head remains `f960e8851ac0eeb2d03b1830740e813beeb10184`. Failed and successful development evidence remains preserved; cleanup may not rewrite a burned protocol because a later result is preferable.

## Stage ledger

| Stage | Work | Status | Primary record / exit condition |
| --- | --- | --- | --- |
| 0 | Seal Gate F | **COMPLETE** | Gate-F verdict/evidence/carry-forwards durably recorded |
| 1 | Pass-C doctrine audit | **COMPLETE** | [`m2-pr39-pass-c-meaning-formation-semantics-audit.md`](m2-pr39-pass-c-meaning-formation-semantics-audit.md) |
| 2 | Memory/meaning instrumentation | **COMPLETE** | [`m2-pr39-memory-meaning-characterization.md`](m2-pr39-memory-meaning-characterization.md) |
| 3 | Slice-F canonical delegation | **COMPLETE** | [`m2-pr39-slice-f-canonical-publication-delegation.md`](m2-pr39-slice-f-canonical-publication-delegation.md) |
| 4 | Older C/D carry-forwards | **COMPLETE** | [`m2-pr39-pre-g-stage4-carry-forwards.md`](m2-pr39-pre-g-stage4-carry-forwards.md) |
| 5 | Test-value audit | **COMPLETE** | [`m2-pr39-pre-g-stage5-test-value-audit.md`](m2-pr39-pre-g-stage5-test-value-audit.md) |
| 6 | Retired experiment/artifact hygiene | **COMPLETE** | [`m2-pr39-pre-g-stage6-retired-experiment-hygiene.md`](m2-pr39-pre-g-stage6-retired-experiment-hygiene.md) |
| 7 | Documentation/plan reconciliation | **COMPLETE** | [`m2-pr39-pre-g-stage7-documentation-reconciliation.md`](m2-pr39-pre-g-stage7-documentation-reconciliation.md); maintainer context/document envelope green |
| 8 | Branch/repository + final integration hygiene | **IMPLEMENTED / FINAL LOCAL CLOSURE PENDING** | [`m2-pr39-pre-g-stage8-repository-integration-hygiene.md`](m2-pr39-pre-g-stage8-repository-integration-hygiene.md); code seam closed, exact local zero-call artifact + latest-head verification remain |
| 9 | Narrow Pre-G readiness review | **REVIEWED / HOLD — MECHANICAL ONLY** | [`m2-pr39-pre-g-stage9-readiness-review.md`](m2-pr39-pre-g-stage9-readiness-review.md); substantive review clear after relation-order fix; same local evidence/verification closure blocks G |

## Closed carry-forwards through Stage 7

The seam has established:

- canonical constitutive Pass-C prompts while preserving the burned N1/N2 historical prompt as evidence;
- `no_durable_meaning` as a legal first-class outcome;
- citation-share and funnel characterization that are measurement, never admission gates;
- one Slice-F semantic authority shared by proof helpers and atomic publication;
- load-bearing source-party/status/fork-prefix publication mutations;
- max-length Thread-ID safety across the Genesis birth path without changing ordinary deterministic IDs;
- historical autobiographical-memory read policy separated from current admission policy;
- a test-value audit that found no case for bulk semantic-test deletion;
- explicit `active`, `repro`, and `all` test lifecycles;
- byte-preserving relocation of retained scientific instruments plus compatibility regressions;
- Stage-6 active/repro/all/audit/check verification green;
- current-state, roadmap, storage and AI-context lifecycle reconciled;
- Stage-7 includes/context/validate/check verification green.

## Stage 8 — genome/lineage integration

Stage 7 found one real G-blocker already required by the accepted symbolic-genome plan:

> synthetic-ancestor source owner IDs must be bound to admitted #38 `biological_parent` / `parent_genome_source` lineage evidence before a synthetic-lineage child becomes live.

Stage-8 implementation makes this load-bearing inside `GenesisStore.publishBirth()`.

For any referenced symbolic genome, publication verifies the persisted canonical bundle through the same transaction-level verifier as `SymbolicGenomeStore`, including child owner and `genesisId` binding.

For `synthetic_lineage`, publication additionally requires:

```text
recombined child genome
all source owners are synthetic_ancestor
ordered manifest.parentOrAncestorRefs == ordered genome source owners
exact matching revision-1 biological_parent / parent_genome_source relation set
relations are current, genesis_created and cite the birth seed event
```

The manifest/genome source sequence remains ordered authority. The #38 relation candidates are a relation set: their incoming array order is not semantic. Stage 9 caught and closed an incidental order dependency, and the positive regression now deliberately reverses the valid relation-candidate order.

Those relations are appended through the same #38 persistence primitive as `SituatedLifeStore`, including canonical lineage-head and relation-revision evidence witnesses.

The live-birth transaction fails closed on missing genome, wrong child, wrong Genesis, source substitution, missing lineage or post-lineage failure. A failed transaction leaves no live child/lineage/manifest. The immutable genome remains a pre-birth/provisional input rather than being rewritten or deleted.

Pass A remains genome blind.

Stage-8 record: [`m2-pr39-pre-g-stage8-repository-integration-hygiene.md`](m2-pr39-pre-g-stage8-repository-integration-hygiene.md).

## Stage 9 — hostile readiness review

Stage 9 found no remaining semantic/design blocker after closing the relation-array-order seam.

The review confirmed:

- Gate C, D and F remain the entry authority;
- EventStructurePool v2 is mechanically non-flat and has explicit developmental/access/context constraints without turning richness into an admission quota;
- Pass-B clean control, prior-treatment propagation and direct treatment remain distinct;
- no final G cohort artifact directory or Slice-G protocol/result document exists in the branch;
- `main` remained an ancestor of the branch (`behind 0`) during the review;
- no Whole-Person/#40/#41 standing claim is smuggled into #39.

The review is held only because the exact E2-V2 zero-model-call failure artifact still exists only in the maintainer's untracked working tree and because the final envelope must be rerun at the post-review head. See [`m2-pr39-pre-g-stage9-readiness-review.md`](m2-pr39-pre-g-stage9-readiness-review.md).

## Hard seam rules

Until this ledger becomes `status: complete` after Stage 9:

- do not author the five final Slice-G cohort WorldSpecs;
- do not assign final cohort genomes;
- do not run a G familiarity probe on cohort candidates;
- do not generate a G cohort life;
- do not execute a G/H model call;
- do not alter an A–F experimental result to make the narrative cleaner;
- do not treat cleanup as permission to weaken an already-cleared authority boundary.

Model-free code/test/doc work required to close the seam remains allowed.

## Seam exit checklist

```text
[x] Pass-C semantics audited and contract-conformant
[x] no_durable_meaning remains genuinely possible
[x] citation-share selectivity diagnostic available
[x] Slice-F duplicate semantic authority removed
[x] known Slice-F mutation gaps load-bearing
[x] max-length Thread-ID Genesis publication risk closed
[x] historical-memory read-policy drift closed
[x] test portfolio inventoried and value dispositions recorded
[x] retained experiments separated from current mechanism
[x] canonical docs/context reconciled and Stage-7 local verification green
[~] persisted symbolic genome bound to child/genesis at birth — implementation landed; prior targeted run green; latest-head verification pending
[~] synthetic-lineage source owners bound to #38 parent-genome-source relations — implementation landed; order-seam closed; latest-head verification pending
[x] latest main reconciled — behind 0 at Stage-9 review
[~] full active/repro/all/audit/document/repository verification — prior maintainer run green; rerun required at latest head
[~] evidence preservation — retained remote evidence unchanged; exact local E2-V2 zero-call artifact still must be committed
[ ] clean tree and exact verified seam-closing HEAD recorded
[~] narrow Pre-G readiness review — substantive CLEAR, mechanical HOLD on the two closure items above
[x] no Slice-G cohort/model use occurred before seam closure in the reviewed repository
```

Only after all items are checked does work cross into Slice G.
