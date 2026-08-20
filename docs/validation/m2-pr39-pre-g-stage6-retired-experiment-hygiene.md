---
id: m2-pr39-pre-g-stage6-retired-experiment-hygiene
status: implemented_awaiting_verification
last-reviewed: 2026-08-20
canonical: false
---

# Milestone #39 — Pre-G Stage 6: retired experiment and artifact hygiene

## Purpose

Stage 6 separates three things that had accumulated together under `tools/`:

```text
current Fibre regression / operator tooling
retained scientific reproducibility code
sealed experiment artifacts and evidence
```

The problem was not that the historical experiments existed. Their retention is important: failed E2 mechanisms, the underpowered N1-A0 instrument, the corrected N2 protocol, and the fresh-world negative result are part of the scientific record.

The problem was that the repository presented those frozen one-off instruments as if they were ordinary current `genesis:*` tooling and executed every one of their protocol tests on every normal `npm test`.

Stage 6 changes lifecycle, not history.

## No artifact rewrite or relocation

Stage 6 does **not**:

- rewrite a burned artifact;
- regenerate E1, A0, H6, A2/A2b, N1, N1-A0, E2-V1, E2-V2, or N2;
- change a recorded digest, threshold, verdict, prompt, model result, or Gate-F conclusion;
- delete a failed experiment because a later mechanism performed better;
- move sealed experiment source files merely to make the directory look cleaner.

Historical files remain at their existing `tools/` paths because those paths are already named in validation documents and experiment records. Physical file movement would add churn without strengthening reproducibility.

## Explicit test lifecycle

`tools/test-suite-lifecycle.mjs` is the executable lifecycle manifest.

It defines an explicit list of **16** retained #39 reproducibility test files:

```text
genesis-genome-positive-control.test.mjs

genesis-rich-life-e2-a0-candidate-driver.test.mjs
genesis-rich-life-e2-a0.test.mjs
genesis-rich-life-e2-a2.test.mjs
genesis-rich-life-e2-a2b-driver.test.mjs
genesis-rich-life-e2-a2b.test.mjs
genesis-rich-life-e2-h6-participation.test.mjs
genesis-rich-life-e2-h6-probe.test.mjs
genesis-rich-life-e2-n1-a0.test.mjs
genesis-rich-life-e2-n1-driver.test.mjs
genesis-rich-life-e2-n1.test.mjs
genesis-rich-life-e2-n2.test.mjs
genesis-rich-life-e2-protocol-clear-amendments.test.mjs
genesis-rich-life-e2-v1.test.mjs
genesis-rich-life-e2-v2-affordance-preflight.test.mjs
genesis-rich-life-e2-worlds.test.mjs
```

The manifest is deliberately **explicit rather than pattern-based**.

That gives Fibre a fail-safe default:

> a newly added test is active unless a maintainer deliberately classifies it as retained reproducibility evidence.

A future test whose filename happens to contain `e2` or `experiment` cannot silently disappear from ordinary regression coverage.

## Active tests retained around the same domain

Stage 6 does not classify all Genesis/Rich-Life tooling as historical.

These remain active examples:

```text
genesis-memory-meaning-characterization.test.mjs
genesis-pass-a-dev.test.mjs
genesis-pass-c-semantics-audit.test.mjs
genesis-rich-life-dev.test.mjs
all packages/domain tests
all services/world-kernel tests
```

That distinction matters. The retired E2 protocol mechanics are scientific evidence; current Genesis authority, publication, memory, Pass-A/Pass-C doctrine, Rich-Life domain behavior, and hostile regression boundaries remain part of ordinary correctness.

## Test commands after Stage 6

`tools/run-test-suite.mjs` executes the manifest.

### Normal regression

```bash
npm test
```

Builds Fibre and runs the **active** suite only.

### Retained #39 experiment reproducibility

```bash
npm run test:repro
```

Builds Fibre and runs only the 16 explicitly retained protocol/experiment test files.

### Complete retained envelope

```bash
npm run test:all
```

Builds Fibre and runs active + reproducibility tests. This is the semantic successor to the pre-Stage-6 monolithic `npm test` command.

`npm run check` deliberately follows the normal active regression lifecycle. Pre-G seam verification additionally runs `test:repro` / `test:all` so historical evidence is shown to remain executable after the separation.

## Package command cleanup

Before Stage 6, `package.json` exposed one-off historical experiment runners alongside current Genesis development tools:

```text
genesis:genome-control
genesis:e2-h6-probe
genesis:e2-a0
genesis:e2-h6-participation
genesis:e2-a2
genesis:e2-a2b
genesis:e2-n1
genesis:e2-n1-a0
genesis:e2-n2
genesis:e2-v1
genesis:e2-v2-a0
```

Those npm aliases are removed.

Their source files are **not removed**. A researcher reproducing a sealed experiment can execute the historical file directly with the recorded provider/model/environment and protocol instructions.

Current package surfaces remain intentionally visible, including:

```text
genesis:pass-a-dev
genesis:rich-life-dev
model:smoke
history:dev
history:gate
guardian:dev
guardian:gate
inspect:*
editor
world-kernel
```

The repository therefore stops advertising superseded E2 experiments as current Genesis product commands while preserving the complete source record.

## Tool-directory documentation

`tools/README.md` now explains the lifecycle categories directly where developers encounter the files:

1. active repository/operator tools;
2. active development utilities;
3. read-only evidence inspectors;
4. historical demos/proofs;
5. retained #39 scientific reproducibility code.

This is the answer to the earlier ambiguity that `tools/` had become a flat catch-all directory.

## Why historical evidence inspectors remain active

Stage 6 does not automatically move every old milestone test into `test:repro`.

Tests that continuously verify committed sealed evidence, read-only inspectors, archive hashes, or live current boundaries can still protect the repository today even when the event they describe is historical.

The Stage-6 split therefore targets the clearly retired **#39 experiment/protocol machinery** identified by the Stage-5 audit. Broader cross-milestone archival restructuring would be scope expansion and is not required before Slice G.

## Stage-5 relationship

Stage 5 concluded that the suite was not inflated by broad byte-identical duplication. The major cleanup opportunity was lifecycle separation, especially the E2/A2/A2b/H6/N1/N2/V1/V2 lineage.

Stage 6 implements exactly that disposition.

The Stage-5 `test:audit` remains a repository-wide inventory of retained test source. After Stage 6, its total-file inventory should not be interpreted as the active `npm test` file count; Stage 7 will reconcile any remaining documentation/output wording that still describes the pre-split glob behavior.

## Verification requirement

Stage 6 becomes complete only after local maintainer evidence for all of:

```bash
node --disable-warning=ExperimentalWarning --test \
  tools/test-suite-lifecycle.test.mjs

npm test
npm run test:repro
npm run test:all
npm run test:audit -- --check
npm run check
```

Required properties:

```text
active suite                 green
repro suite                  green
all suite                    green
test audit                   mechanically clean
repository check             green
all = active + repro files   true by lifecycle regression
```

No specific runtime test-case counts are frozen in advance because Node's table/generated test behavior differs from static file membership. The local outputs are the verification evidence.

## Exit condition

Stage 6 closes when the lifecycle regression and all three suite modes are green and the repository still passes its normal check.
