# Fibre Services

`services/` is the primary provider-neutral runtime surface of Fibre. A directory here should represent a durable Fibre capability with a clear authority boundary, not the development milestone or cloud platform that happened to introduce it.

Provider-specific executable composition belongs under `deployments/`. Provider implementations of infrastructure guarantees belong under `packages/infra/`.

## Runtime map

- `world-kernel/` — authoritative Thread/World runtime, persistence, lifecycle, history, memory, meaning, obligations, and causal execution.
- `birth-center/` — Genesis candidate construction, admission, and atomic birth into the authoritative runtime.
- `thread-presentation/` — non-cognitive, human-facing projection of already-authorized Thread and World truth. This is the stable presentation integration boundary for external consumers.
- `asset-generator/` — provider-neutral execution of admissible media-generation briefs plus immutable generation provenance. It never decides what is true or publishable about a Thread.
- `c2pa-local/` — local Content Credential/C2PA support used by generated-asset publication paths.

A service may depend on another service's documented public entry point. External applications, including presentation webapps and deployment adapters, must not reach into sibling service internals simply because the implementation currently lives there.

## Deployment composition

The accepted dependency direction is:

```text
deployments -> services
deployments -> packages/infra
services    -> InfraDriver contracts
```

A service receives its infrastructure dependency rather than choosing Cloudflare, AWS, GCP, Azure or another platform itself. `packages/infra` implements reusable provider mappings and must not know which Fibre service is using them.

The versioned deployment manifests under `deployments/environments/` select the runtime provider and InfraDriver provider for each deployed service. See `../docs/decisions/ADR-0019-deployment-provider-selection.md` and `../docs/architecture/deployment-provider-selection.md`.

## Production persistence boundary

All services follow [`../docs/architecture/production-persistence.md`](../docs/architecture/production-persistence.md) and [`ADR-0017`](../docs/decisions/ADR-0017-provider-neutral-production-persistence.md).

The runtime dependency direction is:

```text
service/domain behavior
  -> semantic store/repository
  -> InfraDriver capability
  -> provider adapter/mechanism
```

Semantic stores remain responsible for Fibre meaning and invariants. `InfraDriver` provides provider-neutral persistence/runtime guarantees; it is not a generic Thread/World repository.

For new production work:

- transactional domain state must target `infra.state` once that capability's executable contract is available;
- generated immutable bytes and immutable byte-level receipts use `infra.objects`;
- ordered service/delivery streams use `infra.streams`;
- derived query indexes use `infra.catalog` and never replace semantic authority;
- asynchronous workflows, coordination, secrets and other infrastructure use the matching `InfraDriver` capability as it becomes executable;
- provider-native storage IDs, bucket keys, database IDs and paths stay inside infrastructure/provider adapters.

Do **not** introduce a new service-local SQLite authority, durable filesystem journal or direct cloud-storage/database SDK merely because it is convenient. Current World Kernel direct SQLite persistence and its durable model-invocation filesystem journal are explicit migration debt, not patterns to copy.

Repository fixtures, tests and disposable `.fibre/` development outputs are not production persistence. Tools may write those local artifacts directly. A service artifact that becomes part of a production Fibre world must cross the provider-neutral boundary appropriate to its role.

A complete Thread or World JSON object is a projection/export/snapshot, not the primary live authority.

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
