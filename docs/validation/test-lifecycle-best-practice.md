---
id: fibre-test-lifecycle-best-practice
status: accepted
last-reviewed: 2026-08-23
canonical: true
---

# Test lifecycle best practice

Fibre should preserve strong regression coverage without allowing milestone-specific validation scaffolding to accumulate indefinitely in the ordinary active test suite.

Every non-trivial test should be understood as belonging to one of three lifecycle classes:

- **permanent** — protects a durable Fibre invariant or architectural contract expected to survive across milestones;
- **regression** — preserves a specific bug, bypass, integrity failure, or other failure mode that must not return;
- **milestone** — validates a particular milestone, experiment, gate, protocol packet, temporary compatibility boundary, or development phase.

The lifecycle class does **not** determine whether a test runs. All active tests continue to run normally while they are relevant. In particular, a milestone-scoped test is not a weaker or optional test; its marker records when it should be reconsidered.

## Recommended source marker

Use a compact comment block near the top of a test file when the lifecycle would not otherwise be obvious:

```js
// fibre-test-lifecycle: milestone
// fibre-test-scope: pr39
// fibre-test-purpose: replacement-v2-r1-validation
// fibre-test-disposition: remove-or-consolidate-after-pr39
```

For permanent tests:

```js
// fibre-test-lifecycle: permanent
// fibre-test-purpose: history-is-never-silently-rewritten
```

For regression tests:

```js
// fibre-test-lifecycle: regression
// fibre-test-purpose: replacement-core-import-authority-bypass
```

The marker is descriptive metadata, not a mechanism for changing test execution.

## Classification guidance

Prefer **permanent** when the test protects a stable rule such as:

- historical state cannot be silently rewritten;
- authoritative publication is atomic at its declared transaction boundary;
- a model cannot directly author fields owned by Fibre's deterministic authority;
- provenance and identity bindings remain valid;
- a Thread-owned semantic field remains load-bearing at its declared consumer.

Prefer **regression** when the test exists because a concrete defect or bypass was found and the same class of failure must remain impossible. Regression tests should normally survive the milestone that discovered them, although several tests for the same exploit class may later be consolidated into one stronger test.

Prefer **milestone** when the test primarily asserts temporary or experiment-specific state, for example:

- a particular gate is currently HOLD or CLEAR;
- a protocol has an exact temporary window count, path, SHA, witness, or packet shape;
- a migration or compatibility bridge exists only during one milestone;
- a frozen experiment or review phase requires an exact operational boundary that will cease to be live after the milestone closes.

Do not label a durable invariant `milestone` merely because it was introduced during that milestone.

## Milestone closeout

Closing a milestone should include an explicit test-lifecycle review for tests scoped to that milestone. For every milestone-scoped test, choose one of these dispositions:

1. **Delete** — the temporary state it guarded no longer exists and no durable invariant would be lost.
2. **Consolidate** — merge duplicated phase-specific cases into a smaller permanent or regression test that protects the underlying invariant.
3. **Promote to permanent** — the test turned out to describe a durable architectural contract.
4. **Promote to regression** — the test captures a concrete failure class that must never recur.
5. **Retain as milestone-scoped** — only when the milestone is intentionally still active; update the scope if responsibility has moved to a later milestone.

The goal is not to minimize test count for its own sake. The goal is to maximize durable signal per active test and make temporary validation debt visible and easy to remove.

## Repository practice

- New milestone-specific test files should carry lifecycle metadata when practical.
- Existing tests do not need a mass rewrite merely to satisfy this convention; add metadata when a test is materially changed or during a planned lifecycle-cleanup pass.
- Do not change the active test runner to skip milestone tests automatically.
- Do not delete hostile-review regressions merely because the original review is complete; first identify the durable invariant or exploit class they protect.
- Exact protocol/witness tests may remain in validation tooling or frozen verifiers after they leave the ordinary active suite when historical reproducibility still matters.
- When a milestone produces many related tests, prefer a later consolidation pass over continuously adding near-duplicate assertions.

## Future automation

A lightweight repository checker may eventually inventory lifecycle metadata and report counts such as:

```text
permanent    412
regression   173
milestone    136

milestone by scope:
  pr37        18
  pr38        11
  pr39       107
```

Such tooling should report lifecycle debt and missing closeout review; it should not silently change which tests execute.
