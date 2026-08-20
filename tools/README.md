# Fibre tools

`tools/` is an implementation location, not one lifecycle class. Files here fall into distinct categories and should not be interpreted as equally current merely because they share a directory.

## 1. Active repository and operator tooling

Used during normal development or operation:

```text
build-context-pack.mjs
check-git-sync.mjs
context-pack-lib.mjs
markdown-includes-lib.mjs
sync-markdown-includes.mjs
validate-repo.mjs
validate-world-seed.mjs

test-value-audit.mjs
test-suite-lifecycle.mjs
run-test-suite.mjs

inspect-world-database.mjs
inspect-structured-obligations.mjs
inspect-thread-identity.mjs
inspect-genesis.mjs
inspect-symbolic-genome.mjs

serve-thread-editor.mjs
thread-editor-server.mjs
```

These support repository integrity, inspection, the Thread editor, or the current test lifecycle.

## 2. Active development utilities

Useful while developing current Fibre behavior but not themselves durable world authority:

```text
model-api-smoke.mjs
provider-progress.mjs
genesis-pass-a-dev.mjs
genesis-rich-life-dev.mjs
semantic-guardian-dev-cli.mjs
semantic-guardian-v4-counterfactual-dev.mjs
history-bends-judgment-dev-cli.mjs
```

Their outputs are development evidence unless a separately frozen protocol says otherwise.

## 3. Read-only evidence inspectors

These inspect already sealed evidence; they do not create a new gate result:

```text
semantic-guardian-sealed-inspector.mjs
history-bends-judgment-sealed-inspector.mjs
```

The corresponding `guardian:gate` and `history:gate` npm commands remain because they are useful read-only verification surfaces.

## 4. Historical demos and proofs

Milestone demonstrations/proofs remain available because they are useful regression and explanatory material, but their names already identify them as proof/demo surfaces rather than production services:

```text
m1-demo-editor.mjs
m1-demo-world-kernel.mjs
m1-expression-proof.mjs
m1-mina-round-trip.mjs
m1-reviewed-proof.mjs
m2-causal-wire-live-proof.mjs
```

Do not infer current architecture solely from a historical proof runner.

## 5. Retained #39 scientific reproducibility code

The E2 development lineage is intentionally retained even where a mechanism failed or was superseded:

```text
genesis-genome-positive-control.mjs
genesis-rich-life-e2-a0*.mjs
genesis-rich-life-e2-h6-*.mjs
genesis-rich-life-e2-a2*.mjs
genesis-rich-life-e2-n1*.mjs
genesis-rich-life-e2-n2*.mjs
genesis-rich-life-e2-v1*.mjs
genesis-rich-life-e2-v2*.mjs
genesis-rich-life-e2-worlds.mjs
```

These files are **not the current Genesis mechanism**. They are executable records of hypotheses, preflights, burned runs, protocol corrections, negative results, and the Gate-F development evidence.

They remain at their historical paths to avoid needless churn in sealed documentation and experiment references. Stage 6 separates their *execution lifecycle* rather than rewriting or relocating them.

The exact reproducibility-test membership is authoritative in:

```text
tools/test-suite-lifecycle.mjs
```

## Test lifecycle

Normal development:

```bash
npm test
```

runs the **active regression suite**: domain, world-kernel, and active tool tests.

Historical #39 experiment reproducibility:

```bash
npm run test:repro
```

runs only the explicitly retained retired/frozen experiment tests.

Complete repository test envelope:

```bash
npm run test:all
```

runs active + reproducibility tests and is the successor to the pre-Stage-6 monolithic `npm test` behavior.

New tests default to **active**. A test moves to reproducibility only through an explicit entry in `REPRO_TOOL_TEST_FILES`; filename pattern matching does not silently exclude future regressions.

## Package-script policy

`package.json` should expose current operational/dev surfaces and a small number of lifecycle commands. Historical E2 one-off model runners are deliberately **not** given ordinary `genesis:*` npm aliases after Stage 6; their source remains executable directly when reproducing a sealed experiment.

This keeps the command surface from presenting superseded experiments as current Fibre architecture while preserving the evidence itself.
