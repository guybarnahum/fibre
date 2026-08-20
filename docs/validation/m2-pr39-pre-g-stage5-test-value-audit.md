---
id: m2-pr39-pre-g-stage5-test-value-audit
status: implemented_awaiting_final_verification
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
Node tests    579
pass          579
fail          0
npm run check green
```

`579` is a **runtime test-case count**, not a test-file count and not a value score.

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

## Mechanical cleanup

Two world-kernel files were executable-test-path tombstones with zero assertions:

```text
services/world-kernel/test/identity-domain-registry-v2.test.mjs
services/world-kernel/test/identity-registry-v2-repair.test.mjs
```

The first contained only a comment that canonical coverage had moved to `identity-domain-registry.test.mjs`.
The second contained only comments explaining that the pre-production migration path had intentionally been removed.

Both were deleted in Stage 5. Their removal changes the number of test **files** but not the runtime semantic test-case count.

No semantic test was deleted in Stage 5.

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

The family classification is a review aid, not a new source of truth about Fibre architecture.

### Maintainer inventory result

The maintainer ran the Stage-5 inventory after the two tombstones were removed. The stable inventory before the final import-keyword scanner correction reported:

```text
test files                    139
static declared test calls    573
test source bytes             1,087,516

scope                 files   static calls
------------------------------------------
domain                    3             34
world-kernel             91            389
tools                    45            150
```

The static count is close to, but intentionally not expected to equal, the runtime Node count.

Family distribution:

```text
causal-evidence                    9 files / 28 calls
dignity-guardian                   9 / 39
experimental-or-repo-tooling       5 / 13
genesis-core                       5 / 16
genesis-history                    7 / 20
genesis-memory                     6 / 43
genesis-memory-meaning             1 / 3
genesis-origin-source-integrity    3 / 12
genesis-pass-c                     1 / 4
genesis-rich-life                 26 / 56
genome                             2 / 8
identity-provenance                5 / 14
interiority-expression            11 / 48
memory                             2 / 13
model-adapters                     1 / 4
obligations                        6 / 46
other                              3 / 7
persistence-replay                 4 / 45
repo-tooling                       6 / 34
runtime-lifecycle                 15 / 67
situated-life                     11 / 23
thread-domain                      1 / 30
```

The only reported mechanical finding was a false-positive test-import alias inside the audit tool's own synthetic fixture. The scanner interpreted the assertion field `importedTestFiles:` as though it began with the JavaScript `import` keyword. The final Stage-5 scanner correction recognizes the keyword itself rather than any identifier with that prefix.

The earlier machine findings were otherwise:

```text
exact duplicate bodies     0
zero-declaration files      0
comment-only test files     0
duplicate literal titles    0
```

The final `test:audit --check` must be green after the import-keyword correction before this stage closes.

## Substantive value review

### 1. Domain and world-kernel suite — KEEP

The audit does **not** support a broad reduction of the portable-domain or world-kernel suite.

The 91 world-kernel files are large because Fibre has accumulated many materially distinct durable boundaries:

```text
persistence + replay
private participation state
runtime leases + freeze
expression + disclosure
Structured Obligations
identity + provenance
memory + reinterpretation
embodiment + situated life
symbolic genome
Genesis publication + Pass A/B/C
origin/source authority
```

Within those areas the suite repeatedly distinguishes normalizer, durable writer, historical reader, replay/tamper detection, transaction rollback, HTTP/private boundary, concurrency/idempotency, and hostile mutation cases.

Recent Pre-G work itself demonstrated why those layers are valuable:

- Slice-F canonical semantics existed, but publication-level mutations were missing until Stage 3;
- the Stage-4 long-ID integration test found a second generated-event-ID overflow after the originally known predicate overflow was fixed;
- historical memory needed separate write/read policy tests rather than one normalizer test.

Therefore the default disposition for domain/world-kernel tests is **KEEP** unless a future audit identifies a concrete same-boundary duplicate.

### 2. Current repository/operator tools — KEEP

Tests around current repository and operator surfaces remain useful everyday regressions, including:

```text
context-pack / markdown includes
repository validation
model adapter smoke behavior
provider progress
world/identity/Genesis inspection
Thread editor server/model/readability
```

These are not historical experiments merely because they live under `tools/`.

### 3. Sealed experimental and proof lineage — RETAIN FOR STAGE 6

The strongest source of lifecycle confusion is the flat `tools/` namespace, especially the #39 E2 lineage.

Examples include:

```text
E2 A0
H6 probe / participation
A2
A2b
N1 / N1-A0 and drivers
N2
E2-V1
E2-V2
D1/D2 world fixtures
protocol-clear amendment tests
```

These tests are **not valueless**. They freeze the exact instruments behind retained failed and successful evidence and are part of the falsification history that made Gate F credible.

But many are not everyday production regression tests either.

Stage-5 disposition:

```text
retain-for-stage6
```

Stage 6 should separate them from ordinary tooling and decide which execute under a dedicated reproducibility suite such as `test:repro`, while leaving the scientific artifacts, protocol hashes and enough executable code to reconstruct the evidence intact.

The same lifecycle review should consider older M1/history/Guardian/standing proof runners. Stage 5 does not bulk-move them because their active-vs-sealed role must be decided individually rather than inferred from age or filename.

### 4. Genesis Rich-Life family — MIXED; DO NOT BULK DELETE

`genesis-rich-life` is the largest named family at 26 files / 56 static calls, but the family classification combines two different lifecycles:

```text
current Rich-Life compiler/validator/repair invariants
        +
historical E2 experimental instruments
```

Current Rich-Life boundary tests remain active regression protection and must stay in the normal suite.
Historical E2 instrument tests are reproducibility candidates for Stage 6.

Therefore the family count itself is not evidence for consolidation.

### 5. No justified semantic deletions found

The mechanical audit found no byte-identical bodies and no duplicate literal titles across files. Manual family review found no class of same-boundary semantic duplicates safe to delete without a more invasive case-by-case proof.

Given the suite currently runs in only a few seconds, the expected engineering benefit of speculative semantic deletion is low while the regression risk is high.

Stage-5 decision:

> **Do not reduce the semantic suite merely to lower the count.**

The meaningful cleanup is lifecycle separation in Stage 6, not assertion deletion in Stage 5.

## Coverage-gap review

The audit is necessary but not sufficient. Stage 5 records gaps where the test portfolio does not yet prove a broader claim.

### G1 — max-length Thread IDs outside Genesis

Stage 4 proves a 256-character Thread ID through Genesis seed publication, Pass-A life-event publication, replay, and identity bootstrap.

Other runtime-derived IDs may have their own length composition rules. They are **not** implied proven by the Genesis regression merely because they share a Thread ID.

Disposition: recorded non-G blocker. Slice G must not silently consume an untested derived-ID path; later runtime work should add max-length regressions where those paths become relevant.

### G2 — active vs reproducibility suite is not mechanically separated

The root test command still executes every `tools/*.test.mjs`, so a sealed historical experiment and a current repository utility look identical to the runner.

This is not a correctness gap in an individual Fibre invariant, but it is a repository lifecycle gap and the main explanation for why the test/tool surface feels larger and less legible than it is.

Disposition: Stage 6 owner.

### G3 — family classification is heuristic

The Stage-5 family names are filename-derived review aids. They are not authoritative architecture metadata and should not become a policy mechanism.

In particular, the mixed Rich-Life family demonstrates that filename families cannot decide whether a test is active or reproducibility evidence.

Disposition: lifecycle decisions remain explicit/manual in Stage 6; do not turn the audit heuristic into test authority.

### G4 — test count does not prove mutation coverage

The audit can find exact duplication and lifecycle confusion, but it cannot prove that every consequential guard is load-bearing.

Fibre's existing rule remains the controlling standard: authority-, consent-, obligation-, identity-, ledger-, lifecycle-, and Genesis-critical guards need behavioral and live-call-path evidence, with targeted hostile mutation when consequential.

Disposition: keep adding narrow mutation tests when a review identifies a missing live boundary; do not use the 579/581 headline as coverage evidence.

## Mechanical check policy

`test-value-audit.mjs --check` treats only these as blocking mechanical findings:

```text
byte-identical duplicate test-file bodies
test files importing another *.test.mjs
comment-only *.test.mjs tombstones
```

Duplicate titles and zero-declaration non-comment files are reported for human review but do not automatically fail the audit.

That asymmetry is deliberate. Fibre has repeatedly found defects only because a hostile integration test exercised a different load-bearing boundary from the corresponding unit rule.

## What Stage 5 does not do

Stage 5 does not:

- change a Gate-C/D/F verdict;
- change any burned model artifact or protocol result;
- remove failed experimental evidence;
- collapse domain/store/replay/API/hostile tests merely because they share a concept;
- use line coverage or raw test count as a proxy for correctness;
- author or run Slice-G cohort material.

## Exit condition

Stage 5 becomes complete when the final local verification establishes:

```text
[x] machine inventory run on the current branch
[~] mechanical --check reviewed — one audit-fixture false positive fixed; final rerun pending
[x] every reported exact duplicate / alias / zero-declaration disposition explicit
[x] major invariant families reviewed for distinct boundary value
[x] coverage gaps written down
[x] no meaningful hostile or authority-boundary regression deleted for count reduction
[ ] npm test green after final audit correction
[ ] npm run check green
```

Expected interpretation after final verification:

- Stage 5 closes with essentially the semantic regression portfolio intact;
- Stage 6 performs the structural/lifecycle cleanup by separating retained experiments from current tooling/tests;
- a lower everyday test count in Stage 6, if achieved, means **better suite topology**, not discarded evidence.
