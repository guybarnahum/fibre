---
id: architecture-runtime-structure
status: accepted
last-reviewed: 2026-08-25
canonical: true
---

# Runtime repository structure

This document records the target physical structure for Fibre runtime code and the staged migration from the current repository. The goal is for the tree and import graph to state the same architecture as the semantic model: Fibre capabilities above explicit shared semantic and infrastructure boundaries, with provider composition at the edge.

It implements the ownership/import decision in [`../decisions/ADR-0018-runtime-dependency-boundaries.md`](../decisions/ADR-0018-runtime-dependency-boundaries.md) and complements the production-persistence rule in [`production-persistence.md`](production-persistence.md).

## Target dependency graph

```text
apps
  -> public Fibre service APIs

services
  -> @fibre/domain contracts where meaning is genuinely shared
  -> semantic stores / external-service ports
  -> @fibre/infra technical capabilities

domain
  -> pure shared Fibre semantic contracts

infra
  -> provider-neutral technical contracts
  -> provider adapters

deployment composition
  -> constructs services + provider drivers
```

Dependencies point downward. Provider adapters do not define Fibre meaning, and shared domain contracts do not become a second application layer.

## Target repository shape

The shape below is directional, not permission to create empty directories:

```text
apps/
  thread-editor/

domain/
  package.json              # @fibre/domain
  src/
    <only shared semantic contracts>

infra/
  package.json              # @fibre/infra
  src/
  cloudflare/
  test/

services/
  world-kernel/
  birth-center/
  thread-presentation/
  asset-generator/
  c2pa-local/

<deployment composition>/
  cloudflare/
    <only processes that actually exist>

tools/
fixtures/
schemas/
scenarios/
experiments/
docs/
```

There is intentionally no generic `packages/` layer. A directory communicates architectural ownership, not npm mechanics.

## Import discipline

Cross-owner runtime imports use stable package identities:

```text
@fibre/domain/...
@fibre/infra/...
@fibre/thread-presentation
@fibre/asset-generator
```

Do not import a sibling capability with `../../other-service/src/...`. Do not import `domain/src/...` or `infra/src/...` from outside those owners. `package.json#exports` is the public seam.

Inside one owner, direct `./` imports are preferred. Existing `../` imports that remain within one owner may be migrated incrementally, but new runtime code should not introduce parent traversal when an owner entry point can express the dependency. Repository validation enforces the cross-owner rule now and should tighten the local rule as the tree is reorganized.

## World Kernel

World Kernel remains the authoritative consistency boundary for Thread/world state. It does not need to become a fleet of network microservices.

Its internal structure should become capability-oriented over time—Thread/history, participation, runtime, obligations, identity, memory, situated life, civil registry, embodiment and persistence—while preserving Fibre's atomic transaction boundaries.

SQLite is currently an implementation choice and accepted migration debt under ADR-0017. Direct SQLite ownership moves behind semantic persistence adapters and an exercised `InfraDriver.state` contract only after that capability specifies the transaction guarantees Fibre actually requires.

Do not replace semantic stores with a generic key/value or SQL API.

## Thread Presentation

Thread Presentation owns presentation packet/stream contracts, presentation server behavior, civil-identity projection and presentation-specific asset planning/publication. World Kernel owns the truth being projected, not the implementation of the presentation application/transport capability.

Move pure presentation implementation and tests to `services/thread-presentation/` while preserving packet versions, hashes, event shapes and routes. Cross-domain tests that prove World Kernel meaning is projected correctly may remain integration tests in World Kernel.

## Birth Center / Genesis

Birth Center owns provisional candidate construction, provider-call recovery, generation/repair/admission workflow, civil-registry birth preparation and birth-bundle construction. World Kernel owns authoritative publication into canonical Thread/world authorities.

The desired seam is:

```text
Birth Center
  -> complete admitted birth bundle
  -> publishBirth(bundle)
  -> World Kernel atomic publication
```

Do not move or rename the current Genesis Pass A/B/C implementation while #39 is closing. Reorganize after the closing seam is proven.

## Asset Generator

Asset Generator owns provider-neutral generation briefs/jobs, generation execution and immutable generation provenance. Provider-specific runtime wiring is deployment composition. Content-generation providers remain separate from `InfraDriver` because they are external behavior providers, not generic infrastructure.

## Shared domain

`domain/` is deliberately small. Civil Identity currently qualifies because Birth Center, World Kernel and Thread Presentation all require the same normalization and representation contract.

The older TypeScript Thread/genomics/freeze prototype must be audited separately. Preserve any still-current invariant in the real owning capability, then remove disconnected parallel domain code rather than allowing `domain/` to become a historical grab bag.

## Infrastructure

`@fibre/infra` is the shared infrastructure boundary. Its current Presentation/Asset Generator slice covers streams, objects, catalog, realtime and workflows. The next major capability to earn generality is `state`.

The `state` port is designed from current World Kernel guarantees—atomic multi-record mutation inside a declared consistency scope, durable commit, read consistency, expected-version protection and schema/migration support—not from a genericized vendor database API.

## Implementation sequence

### Slice 1 — dependency truth

- establish ADR-0018 and this architecture contract on current `main`;
- collapse `packages/infra` into top-level `infra/` and consume it as `@fibre/infra`;
- collapse the real shared semantic contract into top-level `domain/` and consume it as `@fibre/domain/...`;
- retire the generic `packages/` bucket after its legacy domain prototype is dispositioned;
- make clean workspace installation part of CI;
- add mechanical validation against cross-owner relative/private imports.

No external runtime input/output change is intended.

### Slice 2 — capability ownership

- expose the complete public Thread Presentation surface;
- move pure Thread Presentation implementation/tests out of World Kernel;
- update Cloudflare presentation composition to consume `@fibre/thread-presentation`, `@fibre/asset-generator` and `@fibre/infra`;
- leave only deliberate compatibility seams while callers migrate, then delete them.

### Slice 3 — deployment truth

- separate provider/process composition from semantic services where it improves ownership clarity;
- move fixture-only Cloudflare/P3 endpoints into explicit e2e/dev harnesses while preserving the proof contract;
- do not create empty future provider directories.

### Slice 4 — state inversion

- specify executable `InfraDriver.state` guarantees under ADR-0017;
- add a local SQLite conformance implementation/tests;
- place World Kernel persistence adapters above `InfraDriver.state` without changing durable world schema or semantic store APIs;
- migrate one semantic store at a time under green replay/integrity tests.

### Slice 5 — World Kernel internal shape

- group the flat runtime source tree by capability without changing semantic authority;
- mirror tests to capability ownership;
- keep one transactional process where cross-domain atomicity requires it.

### Slice 6 — post-#39 Genesis ownership

- after #39 closes, move provisional Genesis construction/cognition/recovery into Birth Center;
- keep authoritative birth validation/publication in World Kernel;
- then retire milestone/pass/version runtime filenames where the final enduring capability names are known.

## Compatibility and proof discipline

Each slice keeps `npm run check`, repository validation and test-audit gates green. Structural moves demonstrate before/after equivalence through existing tests and add boundary tests where the architecture was previously only prose.

Runtime routes, packet schemas, durable record formats, environment inputs, hashes and semantic authority do not change merely because code moves.
