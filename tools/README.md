# Fibre tools

`tools/` is operational and development machinery, not the primary runtime. Durable runtime capability belongs under `services/`; tools may inspect, validate, develop, migrate, reproduce, or operate that runtime.

New tools belong in a named capability directory. Do not add new flat files at the `tools/` root unless the file is an intentional compatibility wrapper that is documented and tested.

## Layout

```text
tools/
├── repo/             repository validation, context packs, include sync, git checks
├── inspect/          read-only human/operator inspection commands
├── editor/           Thread Editor server and editor-specific regressions
├── model/            model/provider smoke tooling
├── shared/           helpers used by more than one tool family
├── genesis/          current Genesis development, publication and recovery tooling
├── gates/
│   ├── guardian/     current Guardian development/read-only gate tooling
│   ├── history/      current history-causality development/read-only gate tooling
│   ├── causal/       current causal proof utilities
│   └── experiments/  retained frozen gate/benchmark instruments whose chronology is intentional
├── repro/
│   └── m1/           retained historical proof/demo instruments
└── test-infra/       active/repro/all suite discovery and test-value auditing
```

Historical experiment families removed from the working tree remain available through Git history and validation records. Do not keep a live source subtree solely because old code once imported it.

## Compatibility links

Some tool directories retain Git symlinks such as `tools/services`, `tools/gates/services`, or `tools/repro/services`. They are narrow relocation bridges for retained instruments, not additional ownership trees and not a pattern for new code.

Rules:

- new tools use their real repository-relative imports and do not depend on new compatibility bridges;
- active code must not depend on a retired experiment or repro subtree through a symlink;
- compatibility links are retained only while a current file still needs the old relative import shape;
- every tracked symlink must resolve; `npm run validate` enforces this;
- once the final consumer is migrated, remove the compatibility link rather than preserving it cosmetically.

## Names

Operational filenames should describe what the tool does. PR numbers, milestones, stages, slices, experimental passes, and `-vN` suffixes are acceptable only where chronology or compatibility is genuinely the subject of the artifact—for example a frozen gate instrument, migration, historical fixture, or serialized protocol compatibility check.

Current development tools that still carry milestone/PR terminology are cleanup debt, not naming precedent. Prefer semantic names for new current tooling.

## Test lifecycle

```bash
npm test            # active product/regression/operator suite
npm run test:repro  # deliberately retained reproducibility suite
npm run test:all    # complete retained test envelope
npm run test:audit -- --check
```

`tools/test-infra/test-suite-lifecycle.mjs` owns the explicit repro path manifest. Any newly added test defaults to **active** unless deliberately classified as reproducibility evidence.

The path itself is not scientific authority. Protocol documents, frozen artifacts, hashes and gate records remain authoritative for what an experiment proved or failed to prove.

## What belongs where

`repo/` owns repository mechanics and structural invariants. `inspect/` is read-only operator inspection. `editor/` owns Thread Editor serving and regressions. `model/` owns provider/model smoke checks. `shared/` holds cross-cutting tool helpers. `genesis/` contains current non-authoritative Genesis development and operator tooling. `gates/` contains current gate tooling and explicitly retained frozen gate instruments. `repro/` is reserved for the small set of historical instruments we intentionally keep executable. `test-infra/` owns test discovery and test-value mechanics.

## No evidence laundering

Moving or deleting executable experiment code does not change the standing of its evidence. Historical positive and negative results remain governed by their protocol documents, frozen artifacts, hashes, validation records and Git history. A current tool does not gain authority merely by living under `tools/`.
