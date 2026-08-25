# Fibre tools

`tools/` is operational and development machinery, not the primary runtime. Durable runtime capability belongs under `services/`; tools may inspect, validate, develop, migrate, reproduce, or operate that runtime.

New tools belong in a named capability directory. Do not add new flat files at the `tools/` root unless the file is an intentional compatibility wrapper that is documented and tested.

## Layout

```text
tools/
├── repository/       repository validation, context packs, include sync, git checks
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
├── replays/
│   └── m1/           retained historical proof/demo instruments
└── test-infra/       active/replay/all suite discovery and test-value auditing
```

Historical experiment families removed from the working tree remain available through Git history and validation records. Do not keep a live source subtree solely because old code once imported it.

## Cross-tree imports

A tool imports another tree through the root `package.json` `imports` map, not through a relative path that encodes its own depth:

```js
import { openWorldStore } from "#services/world-kernel/src/persistence.mjs";
import { lifecycleOutcome } from "#apps/thread-editor/editor-model.js";
import { runM1ReviewedProof } from "#tools/replays/m1/m1-reviewed-proof.mjs";
```

Declared prefixes are `#services/*`, `#apps/*`, `#packages/*`, `#fixtures/*`, `#tools/*` and `#repo-root`.

Subpath imports cover module specifiers only. `#` is a URL fragment inside `new URL(...)`, so a data read imports `repoFile` from `#repo-root` instead:

```js
import { repoFile } from "#repo-root";
const fixture = JSON.parse(readFileSync(repoFile("fixtures/threads/mina.thread.json"), "utf8"));
```

Rules:

- imports inside one capability directory stay relative; anything crossing a tree uses the map;
- a moved file keeps working without editing its imports, which is the point;
- the repository carries no relocation symlinks. `tools/test-infra/repository-import-map.test.mjs` enforces that, that every declared prefix resolves, and that every `#` specifier in the tree points at a real file.

## Names

Operational filenames should describe what the tool does. PR numbers, milestones, stages, slices, experimental passes, and `-vN` suffixes are acceptable only where chronology or compatibility is genuinely the subject of the artifact—for example a frozen gate instrument, migration, historical fixture, or serialized protocol compatibility check.

Current development tools that still carry milestone/PR terminology are cleanup debt, not naming precedent. Prefer semantic names for new current tooling.

## Test lifecycle

```bash
npm test            # active product/regression/operator suite
npm run test:replay # deliberately retained reproducibility suite
npm run test:all    # complete retained test envelope
npm run test:audit -- --check
```

`tools/test-infra/test-suite-lifecycle.mjs` owns the explicit replay path manifest. Any newly added test defaults to **active** unless deliberately classified as reproducibility evidence.

The path itself is not scientific authority. Protocol documents, frozen artifacts, hashes and gate records remain authoritative for what an experiment proved or failed to prove.

## What belongs where

`repository/` owns repository mechanics and structural invariants. `inspect/` is read-only operator inspection. `editor/` owns Thread Editor serving and regressions. `model/` owns provider/model smoke checks. `shared/` holds cross-cutting tool helpers, including the `#repo-root` resolver. `genesis/` contains current non-authoritative Genesis development and operator tooling. `gates/` contains current gate tooling and explicitly retained frozen gate instruments. `replays/` is reserved for the small set of historical instruments we intentionally keep executable. `test-infra/` owns test discovery and test-value mechanics.

`repository/` and `replays/` were previously named `repo/` and `repro/`. They act on different things — `repository/` checks that the repository is well-formed, `replays/` re-runs a closed milestone against the runtime — and the one-letter difference hid that.

## No evidence laundering

Moving or deleting executable experiment code does not change the standing of its evidence. Historical positive and negative results remain governed by their protocol documents, frozen artifacts, hashes, validation records and Git history. A current tool does not gain authority merely by living under `tools/`.
