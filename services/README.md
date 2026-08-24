# Fibre Services

`services/` is the primary runtime surface of Fibre. A directory here should represent a durable capability or a deployment adapter with a clear authority boundary, not the development milestone that happened to introduce it.

## Runtime map

- `world-kernel/` — authoritative Thread/World runtime, persistence, lifecycle, history, memory, meaning, obligations, and causal execution.
- `birth-center/` — Genesis candidate construction, admission, and atomic birth into the authoritative runtime.
- `thread-presentation/` — non-cognitive, human-facing projection of already-authorized Thread and World truth. This is the stable presentation integration boundary for external consumers.
- `asset-generator/` — provider-neutral execution of admissible media-generation briefs plus immutable generation provenance. It never decides what is true or publishable about a Thread.
- `presentation-cloudflare/` — Cloudflare-specific delivery/read-model adapter for Thread Presentation.
- `c2pa-local/` — local Content Credential/C2PA support used by generated-asset publication paths.

A service may depend on another service's documented public entry point. External applications, including presentation webapps, must not reach into sibling service internals simply because the implementation currently lives there.

## Presentation and generated visuals

The intended boundary is:

1. Fibre authorities establish Thread and World truth.
2. Thread Presentation selects an authorized public projection and identifies presentation/media needs without inventing biography or meaning.
3. Asset Generator receives an explicit textual generation brief plus exact input references and executes it with a replaceable provider.
4. Generated media returns with provenance and remains reconstruction/presentation material unless another Fibre authority establishes a different status.
5. A delivery adapter may publish only what the presentation contract permits.

`thread-presentation/src/index.mjs` and `asset-generator/src/index.mjs` are the provider-neutral consumer seams. Consumers should import through those entry points rather than from `world-kernel/src/*` or implementation-specific files.

## Richness is a runtime contract

Schema validity and property count are necessary but not sufficient for a Fibre entity to be rich. Tests for major entities should exercise the dimensions in `docs/foundations/rich-life.md`: specificity, coherence, meaningful consequence, social embeddedness, temporal continuity, situatedness, distinct texture, and enough abundance for a life rather than a profile card.

When a runtime change touches a major Fibre entity, add or extend semantic richness coverage for that entity. The expected set includes at least Thread/person, experience/history event, world/place, relationship, memory, meaning, embodiment, and genome/lineage where applicable.

Good richness tests check relationships among fields and downstream meaning: references resolve, events span real time and places, relationships participate in life, memories remain selective rather than mirroring history, meanings are grounded in memories, world context changes what can happen, and identity/state can alter later behavior. Field-count-only tests do not establish richness.

Presentation-level richness tests are a consumer contract. They do not replace causal or authority tests in the domain that owns the entity.

## Runtime naming rule

Durable runtime directories and source files are named for what they do.

Names containing PR numbers, milestones (`m1`, `m2`, ...), stages, slices, Pass A/B/C labels, or implementation-version suffixes (`-v2`, `-v3`, ...) are not normal runtime names. They require an explicit reason because they usually preserve development chronology instead of architecture.

Versioning is legitimate when it names a real compatibility boundary: a serialized wire/schema/protocol value, a persistent external key, or simultaneously supported frozen implementations that genuinely must coexist. Prefer keeping such versions in contract data and constants rather than source filenames.

Experiments, fixtures, validation evidence, migrations, and historical gates may retain milestone/version terminology when their location makes the chronology intentional. That exception does not make the same naming acceptable under active runtime `src/` trees.

Existing violations are cleanup debt, not precedent. They are inventoried in `runtime-name-debt.md` and should be removed or renamed behind green tests rather than copied into new work.
