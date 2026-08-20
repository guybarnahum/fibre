# Fibre tools

`tools/` is organized by **operational role and evidence lifecycle**. Do not add new flat tool files at the directory root.

## Layout

```text
tools/
├── repo/             repository validation, context packs, include sync, git checks
├── inspect/          read-only human/operator inspection commands
├── editor/           Thread Editor server and editor-specific regressions
├── model/            model/provider smoke tooling
├── shared/           helpers used by more than one tool family
├── genesis/          current Genesis development and characterization tooling
├── gates/
│   ├── guardian/     current Guardian development/read-only gate tooling
│   ├── history/      current history-causality development/read-only gate tooling
│   └── causal/       current causal proof utilities
├── repro/
│   ├── m1/           retained M1 proof/demo instruments
│   ├── pr39-genome/  retained #39 genome-control instrument
│   ├── pr39-e2/      retained #39 E2/A0/H6/A2/A2b/N1/N2/V1/V2 instruments
│   ├── guardian/     retired Guardian/standing execution scaffolding
│   └── standing/     retained standing evidence checks
└── test-infra/       active/repro/all suite discovery and test-value auditing
```

## Compatibility boundary links

The category roots also contain a small number of Git symlinks such as `tools/services`, `tools/gates/services`, and `tools/repro/services`.

These are **relocation bridges**, not additional tool ownership trees. They exist because Stage 6 physically moved existing tools while deliberately preserving the bytes of retained scientific instruments. A historical file that originally imported `../services/...` can therefore keep the same source blob after relocation.

Rules:

- new tools must use their real repository-relative imports and must not depend on a new compatibility bridge;
- compatibility links must never be traversed by test discovery;
- retained experiment/proof files should remain byte-stable unless a new explicitly versioned instrument is created;
- deleting a compatibility link requires first proving that every file using it has been intentionally migrated.

## Test lifecycle

```bash
npm test            # active product/regression/operator suite
npm run test:repro  # retained scientific/proof reproducibility suite
npm run test:all    # complete retained test envelope
npm run test:audit -- --check
```

`tools/test-infra/test-suite-lifecycle.mjs` owns the explicit repro path manifest. Any newly added test defaults to **active** unless deliberately classified as reproducibility evidence.

The path itself is not scientific authority. Protocol documents, frozen artifacts, hashes and gate records remain authoritative for what an experiment proved or failed to prove.

## What belongs where

### `repo/`
Tools whose subject is the repository itself: validation, generated context, Markdown includes, git synchronization.

### `inspect/`
Read-only database/Thread/Genesis/genome/obligation inspection intended for humans or operators.

### `editor/`
Thread Editor serving and editor readability/model/server regressions.

### `model/` and `shared/`
Provider/model smoke checks live under `model/`. Cross-cutting implementation helpers such as the provider-progress heartbeat live under `shared/` rather than being duplicated across Genesis and gate tooling.

### `genesis/`
Current non-evidentiary Genesis development tools and measurement-only characterization. This directory is not where burned E2 protocols live.

### `gates/`
Current development or read-only inspection surfaces for established gate systems. A file here is not automatically authority to run a new standing cycle; the corresponding protocol still controls.

### `repro/`
Historical scientific/proof instruments retained because Fibre preserves negative as well as positive evidence. A file under `repro/` may be executable, but it is not the current production mechanism and must not silently become one.

### `test-infra/`
Repository mechanics for discovering the active/repro/all suites and auditing test value. These files are themselves active regressions.

## No evidence laundering

Moving a file does not change what it means. In particular:

- failed E2-V1 remains failed;
- old N1 remains an instrument with the known memory-detection defect;
- N1-on-A0 remains underpowered and non-dispositive;
- N2 remains the corrected development instrument that closed Gate F;
- no moved tool or test becomes production policy merely because it still executes.

See `docs/validation/m2-pr39-pre-g-stage6-tool-relocation-manifest.json` for the blob-preserving scientific relocation record.
