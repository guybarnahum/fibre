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

The flat directory is replaced by explicit categories:

```text
tools/
  repo/
  inspect/
  editor/
  model/
  shared/
  genesis/
  gates/{guardian,history,causal}/
  repro/{m1,pr39-genome,pr39-e2,guardian,standing}/
  test-infra/
```

No production/domain/service file moves in this stage.

## Scientific relocation rule

Retained proof and experiment files were moved using their existing Git blob SHA. Their source bytes did not change during relocation.

The machine-readable record is:

`docs/validation/m2-pr39-pre-g-stage6-tool-relocation-manifest.json`

It records the pre-move commit, move commits, old/new prefixes and exact blob SHA for every retained M1, #39 genome-control, #39 E2, retired Guardian/standing and standing-archive file moved as scientific evidence.

This matters because a path change is repository hygiene; it must not become an opportunity to rewrite an observed protocol after seeing its result.

## Compatibility links

Many historical tools used `../services`, `../fixtures`, `../experiments` and similar repository-root relative imports while they lived directly under `tools/`.

To preserve the byte identity of retained instruments, Stage 6 adds narrow Git symlink bridges at category boundaries. Example:

```text
tools/repro/services -> ../../services
```

This allows a relocated historical file to keep the same source blob. The links are ignored by recursive test discovery because they are symlinks rather than directories.

New tooling must not depend on new compatibility bridges. They are a relocation mechanism, not a new architecture layer.

## Active versus reproducibility tests

`tools/test-infra/test-suite-lifecycle.mjs` recursively discovers the repository's test scopes and keeps an explicit path-level repro manifest.

```text
npm test            active regression/operator suite
npm run test:repro  retained proof/experiment reproducibility suite
npm run test:all    complete retained test envelope
```

A new test defaults to active unless explicitly classified as repro.

The repro suite now includes the retired #39 E2/genome-control lineage plus individually classified M1 and retired standing/Guardian proof tests. Current History/Guardian read-only gate and development regressions remain active.

## Test-value audit

The Stage-5 audit moved to `tools/test-infra/` and now recursively walks tool subdirectories. Physical organization therefore cannot make a test disappear from the audit merely by nesting it.

## npm/operator surface

Package entry points now name the physical category paths. Current operator commands remain exposed. Historical one-off E2 execution aliases remain absent; the retained files can still be invoked directly when reproducing a documented experiment.

## Evidence preserved

Stage 6 does not change the interpretation of any retained result:

- E2-V1 remains a failed fresh-world falsification;
- old N1 retains the memory-detection instrument defect;
- N1-on-A0 remains underpowered/non-dispositive;
- A2b remains development evidence rather than the production generator;
- N2 remains the corrected development evidence used in Gate-F closure;
- failed/burned artifacts remain in their existing artifact paths and are not regenerated.

## Verification required

Before Stage 6 becomes COMPLETE, the maintainer must verify the reorganized tree locally:

```bash
node --disable-warning=ExperimentalWarning --test tools/test-infra/test-suite-lifecycle.test.mjs
node --disable-warning=ExperimentalWarning --test tools/test-infra/test-value-audit.test.mjs
npm test
npm run test:repro
npm run test:all
npm run test:audit -- --check
npm run check
```

The test-case counts are not frozen. The required invariant is:

```text
active ∩ repro = ∅
active ∪ repro = all retained tests
all suites green
repository check green
```

No Slice-G world, genome, cohort or model call occurs in Stage 6.
