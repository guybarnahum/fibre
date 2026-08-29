---
id: architecture-production-persistence
status: accepted
last-reviewed: 2026-08-28
canonical: true
---

# Production persistence boundary

Fibre separates **semantic authority** from **physical persistence**.

The accepted rule is:

> **Every persistent production state or byte object created or consumed as durable state by a Fibre service crosses a provider-neutral `InfraDriver` capability.**

This rule applies across Fibre, not only to Thread Presentation. It applies to World Kernel, Birth Center/Genesis, Civil Registry, asset generation, presentation, future social/economic services, schedulers, runtime coordination, generated media and every other service that needs durable production infrastructure.

Repository fixtures, tests and disposable local development artifacts are not production persistence and do not need to be forced through `InfraDriver`.

## Dependency direction

`InfraDriver` does not replace Fibre's semantic stores.

The dependency direction is:

```text
Fibre domain authority / application service
        |
        v
semantic store or repository
  WorldStore
  GenesisStore
  CivilRegistryStore
  AutobiographicalMemoryStore
  SituatedLifeStore
  ...
        |
        v
InfraDriver capability
  state
  streams
  objects
  catalog
  workflows
  coordination
  secrets
  ...
        |
        v
provider adapter
  local
  Cloudflare
  future AWS/GCP/Azure/etc.
```

The semantic store decides what a Thread, birth, memory, relationship, civil registration or obligation means and which invariants make a write valid. `InfraDriver` supplies the persistence/runtime guarantee required to realize that semantic transaction. A provider adapter supplies the concrete mechanism.

Do not flatten this into generic infrastructure records such as `infra.put("thread", thread)`. The domain boundary remains load-bearing.

## Thread and World storage

A live Thread or World is not an authoritative JSON file.

A Thread is a logical aggregate reconstructed from durable authorities: current projection, append-only history, identity, lineage, places, memories, relationships, embodiment, civil identity, resources, permissions, obligations and other state. A World likewise has durable state and history beyond one serialized object.

Hydrated Thread/World JSON is useful as:

- an API projection;
- an export/import envelope;
- a snapshot;
- a fixture;
- a debug/inspection artifact;
- an immutable presentation input where explicitly authorized.

It is **not** the primary live authority merely because it is complete enough to render the entity at one instant.

The target production shape is therefore:

```text
domain stores -> infra.state -> provider transactional storage
                  |
                  +-> hydrate/export -> Thread/World JSON projection
```

not:

```text
thread.json -> authoritative Thread
world.json  -> authoritative World
```

## Generated and persisted artifact classes

Generated output is classified by what role it plays, not by which tool produced it.

| Artifact/state | Production persistence | Authority rule |
| --- | --- | --- |
| Live Thread/World state, identity, history, memory, relationships, Civil Registry, ledger/domain records | semantic store over `infra.state` | transactional/domain authority |
| Ordered admitted service events or delivery streams | `infra.streams` | ordered stream authority only for the declared stream |
| Generated media, memory visuals, embodiment media, presentation snapshots, immutable credential bytes | `infra.objects` | object store owns bytes; semantic status remains in domain records |
| Asset-generation receipts and immutable byte-level provenance witnesses | `infra.objects` unless a domain transaction requires a semantic record in `state` | receipt/provenance witness, not biography authority |
| Query/discovery indexes | `infra.catalog` | derived index, never a substitute for authoritative state |
| Long-running asynchronous execution | `infra.workflows` / `infra.queues` as required | execution witness; domain result still requires domain admission |
| Leases/coordination | `infra.coordination` when implemented | operational authority within its declared consistency scope |
| Production secrets/key material | `infra.secrets` when implemented | never ordinary repository or semantic state |
| Runtime telemetry | `infra.telemetry` when implemented | observational, not semantic life authority |
| Checked-in synthetic inputs | `fixtures/` in Git | test/development input, not live state |
| Disposable model runs, candidates, diagnostics, local births and development databases | `.fibre/` | local/development only |
| Current concise validation plans/outcomes | `docs/validation/` | documentation/evidence, not runtime state |
| Exceptional exact-byte evidence with a continuing reason to exist | `artifacts/validation/` | scientific/audit evidence only |

If an output crosses from development into production use, its persistence path must change accordingly. A file being produced under `.fibre/` is not a loophole for production services.

## Provider-neutral identities

Semantic records carry Fibre identities such as:

```text
threadId
worldId
eventId
registrationId
objectRef
streamId
snapshotDigest
```

Provider-native bucket keys, database IDs, Durable Object IDs, URLs, ARNs, region identifiers and filesystem paths stay inside adapters or explicitly classified operational metadata.

For example, `objectRef` may map internally to an R2 or S3 key. The mapping is an infrastructure detail; the provider key does not become the semantic identity of the asset.

## Cross-domain transactions remain atomic

The provider-neutral boundary must not split a Fibre transaction merely because semantic stores are separate objects.

Genesis birth is the strongest current example. Birth spans Thread publication, history, identity bootstrap, lineage/place state, memory obligations, Genesis manifest and Civil Registry registration. Those semantic responsibilities remain separate, but a successful live birth requires one shared transaction/consistency domain.

The intended future shape is conceptually:

```text
infra.state.transaction(tx => {
  WorldStore(tx)
  GenesisStore(tx)
  CivilRegistryStore(tx)
  SituatedLifeStore(tx)
  AutobiographicalMemoryStore(tx)
  ...
  publishBirth()
})
```

It must not silently degrade into separately committed store transactions.

## Current implementation status

The rule is accepted before migration is complete.

Already behind `InfraDriver`:

- Thread Presentation ordered streams, immutable snapshots, catalog and realtime delivery;
- Asset Generator workflow admission and immutable generated bytes/receipts;
- Cloudflare R2/Durable Object/D1 mappings used by those implemented ports.

Current migration debt:

1. **World Kernel semantic stores open SQLite directly.** This includes World/Thread state and the additive domain stores sharing that database consistency boundary. Direct SQLite is the current local implementation, not the target production dependency direction.
2. **The durable model-invocation journal writes a local filesystem journal directly.** It remains an explicit migration exception until a suitable Infra capability is adopted.
3. **`InfraDriver.state` exists in the capability vocabulary but has not yet earned an executable contract/production implementation.**

These are grandfathered migration boundaries, not precedent for new persistence code.

Local Birth Center/Genesis development work under `.fibre/`, test databases and local C2PA credentials are development tooling/profile state rather than production persistence and may continue to use the local filesystem directly.

## No-new-bypasses rule

From this decision forward:

- do not add a new direct SQLite authority in another service;
- do not add new durable filesystem persistence to service runtime code merely because `.fibre/` is convenient;
- do not import cloud storage/database SDKs into Fibre semantic service code as a shortcut around `InfraDriver`;
- do not put provider-native storage locators into semantic records;
- do not create service-specific cloud abstractions when an `InfraDriver` capability expresses the required guarantee;
- do not weaken a semantic transaction to fit an available cloud primitive.

Existing direct persistence is migration debt and should shrink behind tests. New capability work should use `InfraDriver` from the start unless an explicit accepted architecture decision records why it cannot.

Repository validation mechanically enforces the currently detectable subset of this rule and names the existing exceptions.

## First state-port proof

The next infrastructure proof should be the hardest transaction Fibre already needs rather than a toy key/value wrapper:

> **Implement the minimum executable `infra.state` contract needed to preserve atomic Genesis birth, including Civil Registry and initial Thread state.**

The state capability must prove, at minimum, the guarantees the birth transaction actually relies on:

- atomic multi-record mutation in one declared consistency scope;
- rollback with no partial live birth;
- durable commit before acknowledgement;
- expected-version/conflict protection where required;
- read consistency inside the transaction;
- deterministic migration/schema behavior;
- a way for multiple semantic stores to share the same transaction handle without merging their responsibilities.

A local SQLite implementation should remain available for deterministic development and tests. A production Cloudflare mapping should be selected only after its transaction semantics satisfy the same conformance suite. The Fibre guarantee, not a vendor product name, is the contract.

## Adoption discipline

Do not perform a broad rewrite merely to make diagrams uniform. Migrate persistence one vertical slice at a time behind conformance tests, keeping behavior unchanged.

The migration order should be driven by real transaction requirements. Genesis birth is the first state proof because it exercises the strongest current consistency boundary. Later World Kernel, runtime coordination, additional services and durable journals can move behind the same accepted infrastructure boundary as their required capability contracts become executable.

### Stop condition: architectural proof, not abstraction completion

Provider-neutral persistence is a **constraint on Fibre development**, not a competing product roadmap.

The migration is sufficiently proven for a given development phase when representative vertical slices demonstrate the guarantees that the next Fibre capability actually depends on. At that point, unrelated remaining direct-provider paths become tracked migration debt and do not automatically stay on the critical path.

In particular, do not continue migrating stores merely for symmetry after the relevant consistency, durability, replay and provider-neutral dependency boundaries have been demonstrated. Resume deferred migration when a concrete Fibre feature reaches that authority, an imminent production deployment requires it, a stronger cross-domain semantic transaction needs it, or a demonstrated correctness risk makes it necessary.

Every substantial persistence/Infra slice should therefore name four things before it displaces Fibre milestone work:

1. the concrete Fibre capability it enables or protects;
2. the semantic invariant or deployment blocker at risk;
3. the smallest representative proof required;
4. the stop condition after which further cleanup returns to the debt backlog.

If those cannot be stated concretely, the work should normally be deferred in favor of Fibre capability development.

This discipline is governed by [`../decisions/ADR-0018-vision-led-development-discipline.md`](../decisions/ADR-0018-vision-led-development-discipline.md).

## Relationship to other architecture

- [`storage-model.md`](storage-model.md) defines semantic storage authorities, append-only discipline, transaction boundaries and repository/world separation.
- [`infrastructure-driver.md`](infrastructure-driver.md) remains the evolving design for the umbrella provider-neutral capability bundle and concrete port contracts.
- [`../decisions/ADR-0017-provider-neutral-production-persistence.md`](../decisions/ADR-0017-provider-neutral-production-persistence.md) records the production boundary.
- [`../decisions/ADR-0018-vision-led-development-discipline.md`](../decisions/ADR-0018-vision-led-development-discipline.md) defines when further abstraction belongs on the critical path.

The short form is:

> **Domain stores own meaning. InfraDriver owns provider-neutral persistence guarantees. Provider adapters own physical mechanisms. Object storage owns bytes, not life. Git owns code, laws, fixtures and deliberately retained evidence — not living Fibre state. Infrastructure proves and protects the organism; it does not replace the organism roadmap.**
