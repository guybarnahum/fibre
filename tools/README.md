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
│   ├── pr39/
│   │   ├── genome-control/  retained #39 symbolic-genome control instrument
│   │   └── e2/              retained #39 E2/A0/H6/A2/A2b/N1/N2/V1/V2 lineage
│   ├── guardian/     retired Guardian/standing execution scaffolding
│   └── standing/     retained standing evidence checks
└── test-infra/       active/repro/all suite discovery and test-value auditing
```

The #39 E2 files remain one evidence-family directory rather than being split into `a0/`, `n1/`, `n2/`, etc. Those instruments deliberately import one another as a frozen lineage; splitting their source would require a forest of aliases and make provenance harder to inspect. The filenames still expose the experimental sequence.

## Compatibility boundary links

The category roots also contain a small number of Git symlinks such as `tools/services`, `tools/gates/services`, `tools/repro/services`, and `tools/repro/pr39/services`.

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
Repository validation, generated context, Markdown includes and git synchronization.

### `inspect/`
Read-only database/Thread/Genesis/genome/obligation inspection intended for humans or operators.

### `editor/`
Thread Editor serving and editor readability/model/server regressions.

### `model/` and `shared/`
Provider/model smoke checks live under `model/`. Cross-cutting helpers such as provider progress live under `shared/`.

### `genesis/`
Current non-evidentiary Genesis development tools and measurement-only characterization. Burned E2 protocols do not live here.

### `gates/`
Current development or read-only inspection surfaces for established gate systems. A path here is not authority to run a new standing cycle; the corresponding protocol still controls.

### `repro/`
Historical proof and experiment instruments retained because Fibre preserves negative as well as positive evidence. A file under `repro/` may be executable, but it is not the current production mechanism.

### `test-infra/`
Repository mechanics for discovering active/repro/all suites and auditing test value. These files are active regressions.

## No evidence laundering

Moving a file does not change what it means. In particular:

- failed E2-V1 remains failed;
- old N1 remains an instrument with the known memory-detection defect;
- N1-on-A0 remains underpowered and non-dispositive;
- N2 remains the corrected development instrument that closed Gate F;
- no moved tool or test becomes production policy merely because it still executes.

See `docs/validation/m2-pr39-pre-g-stage6-tool-relocation-manifest.json` for the blob-preserving scientific relocation record.
