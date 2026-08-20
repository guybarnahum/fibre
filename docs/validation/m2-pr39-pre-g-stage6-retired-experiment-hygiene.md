---
id: m2-pr39-pre-g-stage6-retired-experiment-hygiene
status: implemented_awaiting_verification
last-reviewed: 2026-08-20
canonical: false
---

# Milestone #39 — Pre-G Stage 6: tool and experiment lifecycle hygiene

## Purpose

Stage 6 makes repository lifecycle visible in the filesystem before Slice G. It separates current operational/development tooling from retained proof and experimental instruments **without deleting or rewriting failed evidence**.

Stage 5 established that the large suite was not broadly duplicated. The problem was that current tools, old proof runners and burned #39 instruments all occupied one flat `tools/` namespace.

## Physical organization

```text
tools/
  repo/
  inspect/
  editor/
  model/
  shared/
  genesis/
  gates/{guardian,history,causal}/
  repro/
    m1/
    pr39/{genome-control,e2}/
    guardian/
    standing/
  test-infra/
```

The #39 E2 source remains together under `repro/pr39/e2/`. N1/N2/V1/V2 deliberately form an import-linked historical instrument lineage; splitting them into phase directories would require dependency aliases that obscure rather than clarify provenance.

No production/domain/service file moves in this stage.

## Scientific relocation rule

Retained proof and experiment files were moved using their existing Git blob SHA. Their source bytes did not change during relocation.

The machine-readable record is:

`docs/validation/m2-pr39-pre-g-stage6-tool-relocation-manifest.json`

It records the pre-move commit, move commits, old/new prefixes and exact blob SHA for every retained M1, #39 genome-control, #39 E2, retired Guardian/standing and standing-archive file moved as scientific evidence.

A path change is repository hygiene; it must not become an opportunity to rewrite an observed protocol after seeing its result.

## Compatibility links

Historical tools used `../services`, `../fixtures`, `../experiments` and similar repository-root relative imports while they lived directly under `tools/`.

To preserve byte identity, Stage 6 adds narrow Git symlink bridges at category boundaries, including the nested `tools/repro/pr39/` boundary. Recursive test discovery ignores them because they are symlinks rather than directories.

Some existing active tests and retained repro instruments also imported former **file paths** directly. Those edges are preserved with narrow file-level relocation aliases. One exception is the historical `tools/m1-demo-world-kernel.mjs` executable path: it is a small compatibility wrapper rather than a symlink because its `isMain` guard must remain correct when Node executes the old path directly.

New tooling must not depend on new compatibility bridges. They are a relocation mechanism, not a new architecture layer.

## Active versus reproducibility tests

`tools/test-infra/test-suite-lifecycle.mjs` recursively discovers the repository test scopes and keeps an explicit path-level repro manifest.

```text
npm test            active regression/operator suite
npm run test:repro  retained proof/experiment reproducibility suite
npm run test:all    complete retained test envelope
```

A new test defaults to active unless explicitly classified as repro.

The repro suite includes the retired #39 E2/genome-control lineage plus individually classified M1 and retired standing/Guardian proof tests. Current History/Guardian read-only gate and development regressions remain active.

## Test-value audit

The Stage-5 audit moved to `tools/test-infra/` and recursively walks tool subdirectories. Physical organization therefore cannot make a test disappear from the audit merely by nesting it.

## Evidence preserved

Stage 6 does not change the interpretation of any retained result:

- E2-V1 remains a failed fresh-world falsification;
- old N1 retains the memory-detection instrument defect;
- N1-on-A0 remains underpowered/non-dispositive;
- A2b remains development evidence rather than the production generator;
- N2 remains the corrected development evidence used in Gate-F closure;
- failed/burned artifacts remain in their existing artifact paths and are not regenerated.

## First relocation verification — failed for path compatibility

The first maintainer verification at `b22434dba442693629193e581ae15928a653df51` was intentionally retained as evidence rather than dismissed as cleanup noise.

The suite-classification/audit infrastructure itself passed, but execution exposed missing relocation edges:

```text
suite/audit targeted tests    4/4 pass
active suite                  511/523 pass, 12 fail
repro suite                   28/31 pass, 3 fail
all suite                     539/554 pass, 15 fail
test-value audit              mechanically clean
```

Every reported failure was a module-resolution or executable-path failure caused by the Stage-6 move. The failures covered:

- active Slice-E tests importing former root-level E2/dev tool paths;
- process tests spawning the historical root-level M1 world-kernel executable;
- active editor/inspection/Pass-C tests expecting former sibling tool paths;
- retained Guardian standing tests expecting current Guardian development siblings;
- retained M1 proof/editor tests expecting editor/inspector siblings.

No failed assertion indicated a semantic/authority change in the moved implementations.

Corrections:

```text
304988ef9d957812a8999dbf6c14734ca7416e44  restore relocation compatibility edges
dc77e4cd4cdcd649b69b8dd345ce8a02fc33c279  make relocation compatibility load-bearing
dcf73bd6090cfab57fe2a2b79d5a658393b4940e  preserve historical M1 executable main semantics
```

`tools/test-infra/stage6-relocation-compatibility.test.mjs` now verifies the known file-level relocation graph is resolvable/importable. The retained scientific targets remain byte-identical; compatibility code lives outside those retained blobs.

Stage 6 remains `implemented_awaiting_verification` until the corrected tree passes the full verification envelope below.

## Verification required

Before Stage 6 becomes COMPLETE, the maintainer must verify:

```bash
node --disable-warning=ExperimentalWarning --test tools/test-infra/test-suite-lifecycle.test.mjs
node --disable-warning=ExperimentalWarning --test tools/test-infra/test-value-audit.test.mjs
node --disable-warning=ExperimentalWarning --test tools/test-infra/stage6-relocation-compatibility.test.mjs
npm test
npm run test:repro
npm run test:all
npm run test:audit -- --check
npm run check
```

Required invariant:

```text
active ∩ repro = ∅
active ∪ repro = all retained tests
all suites green
repository check green
```

No Slice-G world, genome, cohort or model call occurs in Stage 6.
