---
id: m2-pr39-pre-g-stage5-test-value-audit
status: implemented_awaiting_inventory
last-reviewed: 2026-08-20
canonical: false
---

# Milestone #39 — Pre-G Stage 5: test-value audit

## Purpose

Stage 5 answers a narrow repository-quality question before Slice G:

> Do Fibre's tests protect distinct invariants and failure boundaries, or has historical development accumulated executable duplication that only makes the test count look larger?

The answer must not be inferred from the headline count alone.

Local maintainer verification immediately before Stage 5 established:

```text
Node tests    581
pass          581
fail          0
npm run check green
```

`581` is a **runtime test-case count**, not a test-file count and not a value score.

The repository's `npm test` command loads three top-level test scopes:

```text
packages/domain/test/*.test.mjs
services/world-kernel/test/*.test.mjs
tools/*.test.mjs
```

Those scopes deliberately mix several useful kinds of evidence: portable domain contracts, store/replay/transaction boundaries, hostile mutations, process/API integration, and experimental/protocol tooling.

Stage 5 therefore audits by **protected invariant and load-bearing boundary**, not by asking how many files or assertions can be removed.

## Decision rules

### KEEP

Keep a test when it protects a distinct invariant, mutation, boundary, historical regression, or scientific/protocol witness even if another test has similar setup or language.

Examples of intentionally distinct layers include:

```text
normalizer/domain rule
        != durable store rule
        != replay/integrity rule
        != publication transaction rule
        != API/process rule
        != hostile mutation proving the live call path
```

A passing unit test for a guard does not substitute for an integration test proving that the production publication/runtime path actually calls that guard.

### CONSOLIDATE

Consolidate only when two tests exercise the same invariant **at the same boundary with materially the same mutation and no distinct evidence role**.

Shared fixture/setup code may be consolidated without deleting the tests it supports.

### RETAIN OUTSIDE THE CURRENT MECHANISM

Development and experiment tests may protect reproducibility of failed or retired mechanisms rather than production behavior. Stage 5 does not erase them merely because the mechanism is no longer current.

Stage 6 owns the separation between:

```text
current mechanism
retained scientific evidence
retired execution scaffolding
```

Therefore Stage 5 may classify such tests as `retain-for-stage6` but does not delete them simply to reduce `npm test`.

### DELETE

Deletion is appropriate for mechanical non-tests such as:

- comment-only `*.test.mjs` tombstones;
- byte-identical duplicate test files;
- a compatibility alias whose only effect is importing another `*.test.mjs` that the same npm glob already executes independently.

A duplicate title is **not** enough to delete a test.

## First mechanical cleanup

Two world-kernel files were executable-test-path tombstones with zero assertions:

```text
services/world-kernel/test/identity-domain-registry-v2.test.mjs
services/world-kernel/test/identity-registry-v2-repair.test.mjs
```

The first contained only a comment that canonical coverage had moved to `identity-domain-registry.test.mjs`.
The second contained only comments explaining that the pre-production migration path had intentionally been removed.

Both were deleted in Stage 5. Their removal changes the number of test **files** but must not change the runtime test-case count.

No semantic test has been deleted in the first Stage-5 pass.

## Machine inventory

`tools/test-value-audit.mjs` enumerates exactly the three source globs used by `npm test` and records, per test file:

```text
scope
invariant family
source bytes
source SHA-256
static declared test-call count
literal test titles when extractable
imports of other *.test.mjs files
zero-declaration status
comment-only status
```

It also reports repository-wide signals:

```text
exact duplicate file bodies
duplicate test titles across files
test files importing other test files
zero-declaration test files
comment-only test files
```

The static declared-test count is intentionally labelled differently from the Node runtime count. Table-driven or generated tests can make the two differ.

The family classification is a review aid, not a new source of truth about Fibre architecture. It groups tests into areas such as Genesis core/history/memory/Rich Life/origin integrity, identity/provenance, memory, genome, runtime lifecycle, obligations, situated life, interiority/expression, dignity/guardian, persistence/replay, causal evidence, model adapters and repository tooling.

## Mechanical check policy

`test-value-audit.mjs --check` treats only these as blocking mechanical findings:

```text
byte-identical duplicate test-file bodies
test files importing another *.test.mjs
comment-only *.test.mjs tombstones
```

Duplicate titles and zero-declaration non-comment files are reported for human review but do not automatically fail the audit.

That asymmetry is deliberate. Fibre has repeatedly found defects only because a hostile integration test exercised a different load-bearing boundary from the corresponding unit rule.

## Required local inventory

Run after pulling the Stage-5 implementation:

```bash
npm run test:audit -- \
  --json /tmp/fibre-test-value-audit.json \
  --markdown /tmp/fibre-test-value-audit.md

npm run test:audit -- --check
```

Then inspect the compact summary:

```bash
node -e '
const x=require("/tmp/fibre-test-value-audit.json");
console.log({
  totals:x.totals,
  byScope:x.byScope,
  exactDuplicateBodies:x.hygiene.exactDuplicateBodies.length,
  testImportAliases:x.hygiene.testImportAliases.length,
  zeroDeclaredTests:x.hygiene.zeroDeclaredTests.length,
  commentOnlyTestFiles:x.hygiene.commentOnlyTestFiles.length,
  duplicateTitles:x.hygiene.duplicateTitles.length
});
console.log("zeroDeclared", x.hygiene.zeroDeclaredTests);
console.log("testImports", x.hygiene.testImportAliases);
console.log("exactDuplicates", x.hygiene.exactDuplicateBodies);
'
```

Stage 5 is not complete until those machine findings have been reviewed and each actionable item has an explicit `keep`, `consolidate`, `retain-for-stage6`, or `delete` disposition.

## Coverage-gap review

The inventory is necessary but not sufficient. Stage 5 also records gaps where the test portfolio does not yet prove the claimed boundary.

One already-known adjacent gap is intentionally visible rather than hidden by the Stage-4 success:

- Stage 4 now proves a 256-character Thread ID through Genesis seed publication, Pass-A life-event publication, replay, and identity bootstrap.
- Other runtime-derived IDs may have their own length composition rules. They are **not** implied proven by the Genesis regression merely because they share a Thread ID.
- This is not a blocker on Slice G's birth/cohort path unless G consumes one of those runtime boundaries, but the audit must not describe the full runtime ID space as covered.

Further gaps discovered from the machine inventory or manual family review must be appended here before Stage 5 closes.

## What Stage 5 does not do

Stage 5 does not:

- change a Gate-C/D/F verdict;
- change any burned model artifact or protocol result;
- remove failed experimental evidence;
- collapse domain/store/replay/API/hostile tests merely because they share a concept;
- use line coverage or raw test count as a proxy for correctness;
- author or run Slice-G cohort material.

## Exit condition

Stage 5 becomes complete only when:

```text
[ ] machine inventory run on the current branch
[ ] mechanical --check reviewed
[ ] every exact duplicate / test-import alias / zero-declaration file disposition explicit
[ ] major invariant families reviewed for distinct boundary value
[ ] coverage gaps written down
[ ] no meaningful hostile or authority-boundary regression deleted for count reduction
[ ] npm test green after any consolidation/deletion
[ ] npm run check green
```
