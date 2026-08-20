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
| 7 | Documentation/plan reconciliation | **IMPLEMENTED / AWAITING LOCAL VERIFICATION** | [`m2-pr39-pre-g-stage7-documentation-reconciliation.md`](m2-pr39-pre-g-stage7-documentation-reconciliation.md); current docs/context agree and repository context checks are green |
| 8 | Branch/repository + final integration hygiene | PENDING | close the genome/lineage birth-binding gap, reconcile latest `main`, preserve evidence hashes, full check green, clean tree, exact seam-closing head recorded |
| 9 | Narrow Pre-G readiness review | PENDING | hostile cleanup review finds no unsafe carry-forward before G |

## Closed carry-forwards through Stage 6

The seam has already established:

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
- a green maintainer verification envelope covering active, repro, all, audit and repository checks.

## Stage 7 reconciliation

Stage 7 makes the **current operating story** match the implemented branch while keeping historical evidence available in the appropriate context layer.

It reconciles root orientation, current state/priorities, persistent storage, roadmap numbering, AI-context lifecycle, the Stage-5/6 closure records and this seam ledger.

Stage 7 changes no Genesis compiler policy, model prompt/schema, world, genome, treatment assignment, rater, admission rule, experimental artifact or Gate-F result.

### Semantic reconciliation finding — genome/lineage birth binding remains open

The documentation audit found one real implementation carry-forward already named by the accepted symbolic-genome plan rather than a stale-document-only problem.

The accepted requirement is:

> synthetic-ancestor source owner IDs must be bound to admitted #38 `biological_parent` / `parent_genome_source` lineage evidence before a synthetic-lineage child becomes live.

Current code establishes the pieces separately:

- `SymbolicGenomeStore` verifies persisted genome ownership, source ownership/digests, deterministic crossover and mutation provenance;
- #38 life relations provide the durable `biological_parent` + `parent_genome_source` authority;
- the Rich-Life policy-side witness proves an in-memory recombined genome and deliberately removes genome material before Pass A;
- `GenesisManifest` records `genomeRef` and `parentOrAncestorRefs`.

But `GenesisStore.publishBirth()` currently does **not** resolve `manifest.genomeRef` against persisted symbolic-genome state or require the genome's source owner IDs to match admitted #38 parent-genome-source relations inside the live birth boundary.

Therefore this is a **G blocker**. Before the cohort/protocol freeze, publication must make at least these properties load-bearing:

```text
manifest.genomeRef resolves to a persisted symbolic genome
referenced genome belongs to the child Thread
referenced genome genesisId matches the birth genesisId
synthetic-lineage manifest parentOrAncestorRefs match the genome source owners
those synthetic-ancestor source owners match admitted #38 biological_parent + parent_genome_source relations
mismatch / missing genome / missing lineage leaves no live Thread
```

The exact transaction design is an implementation decision, but the child may not become live with an unverified genome/lineage provenance seam.

This finding does not invalidate Gate F's Echo/Homage/fork/source-rights result and does not alter Pass-A genome blindness. It closes the previously explicit unchecked Slice-E/birth completion item before G.

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
[~] canonical docs/context reconciled — Stage 7 implementation landed; local context/check verification pending
[ ] persisted symbolic genome is bound to child/genesis at birth
[ ] synthetic-lineage genome source owners are bound to admitted #38 parent-genome-source relations before live publication
[ ] latest main reconciled
[ ] full check green after final seam changes
[ ] evidence hashes confirmed stable after repository hygiene
[ ] clean tree and exact seam-closing HEAD recorded
[ ] narrow Pre-G readiness review CLEAR
[ ] no Slice-G cohort/model use occurred before seam closure
```

Only after all items are checked does work cross into Slice G.
