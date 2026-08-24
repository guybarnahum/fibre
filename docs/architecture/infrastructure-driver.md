---
id: architecture-infrastructure-driver-v0-1
status: proposed
last-reviewed: 2026-08-21
canonical: false
---

# Fibre infrastructure driver v0.1

## Purpose

Define one provider-neutral infrastructure boundary for Fibre backend services.

The first production implementation is Cloudflare-first, but Fibre backend logic should not depend directly on Cloudflare products. Presentation is the first vertical slice to use this boundary; it is not the owner of the abstraction.

The intended dependency direction is:

```text
Fibre domain authorities
        |
        v
Fibre application services
  World Kernel
  Genesis
  PresentationServer
  scheduler/runtime services
  future economy/social services
        |
        v
InfraDriver
  provider-neutral capability ports
        |
        +--> cloudflare-v1       # first production driver
        +--> aws-*               # future
        +--> gcp-*               # future
        `--> azure-*             # future
```

The infrastructure layer supplies durable/runtime guarantees. It never decides Fibre semantics.

## Why one `InfraDriver`

The same platform concerns recur across Fibre:

- transactional durable state;
- ordered event admission and replay;
- immutable objects and media;
- queryable indexes/catalogs;
- queues and asynchronous work;
- scheduling and workflows;
- realtime delivery;
- coordination/leases;
- secrets and key material;
- caching;
- observability.

Defining separate cloud abstractions for Presentation, World Kernel, Genesis, economy, social systems, and future services would duplicate the same portability problem and encourage inconsistent guarantees.

The top-level name is therefore simply:

```text
InfraDriver
```

not `PresentationInfraDriver`.

## Not a god interface

`InfraDriver` is an umbrella capability bundle, not one enormous interface that every service can use indiscriminately.

Conceptually:

```text
InfraDriver {
  driverId
  driverVersion
  capabilities

  state?          TransactionalStateDriver
  streams?        OrderedStreamDriver
  objects?        ObjectDriver
  catalog?        CatalogDriver
  realtime?       RealtimeDriver
  queues?         QueueDriver
  scheduler?      SchedulerDriver
  workflows?      WorkflowDriver
  coordination?   CoordinationDriver
  secrets?        SecretsDriver
  cache?          CacheDriver
  telemetry?      TelemetryDriver
}
```

Exact executable interfaces should be frozen only as vertical slices require them.

A service declares the capability profile it requires and fails fast if the selected driver cannot provide the necessary guarantees.

For example:

```text
PresentationServer requires:
  streams
  objects
  catalog
  realtime
  optional queues/workflows

World Kernel may require:
  state with stronger transactional guarantees
  objects for large immutable assets
  coordination/runtime leases

Media generation may require:
  objects
  queues
  workflows
  secrets
```

These are **profiles over one `InfraDriver`**, not separate infrastructure-driver families.

## Abstract guarantees, not cloud products

Do not define genericized versions of vendor products such as:

```text
DurableObject
D1
R2
Lambda
DynamoDB
S3
Cloud Run
Pub/Sub
Cosmos DB
```

Instead define the guarantee Fibre needs.

Examples:

### Transactional state

A domain store may require some combination of:

- atomic multi-record mutation within a declared consistency scope;
- compare-and-set / expected-version protection;
- durable commit before acknowledgement;
- repeatable/read-consistent transaction semantics;
- migration/version support;
- deterministic failure on unsupported transaction scope.

The `state` port must advertise the guarantees it actually provides. It must never silently weaken an application requirement because a provider lacks an equivalent product.

### Ordered streams

A service may require:

- monotonic sequence within a logical stream;
- idempotent admission;
- durable admission before observation;
- exact replay after a cursor;
- gap detection;
- one ordering authority at a time.

### Objects

A service may require:

- immutable/versioned writes;
- content digests;
- stable Fibre `objectRef` identities;
- provider-independent metadata;
- authorized delivery resolution.

### Realtime

A service may require:

- fanout after durable event admission;
- reconnect/resume semantics;
- backpressure and disconnect handling;
- transport independence at the semantic-event layer.

The implementation may use WebSockets, SSE plus HTTP ingress, managed pub/sub delivery, or another mechanism.

## Capability negotiation

A driver exposes explicit capabilities rather than inviting optimistic feature detection.

Conceptually:

```text
infra.capabilities = {
  transactionalState: {...guarantees...},
  orderedStreams: {...guarantees...},
  immutableObjects: true,
  realtime: {...guarantees...},
  queues: true,
  scheduling: true,
  workflows: true,
  coordination: {...guarantees...},
  secrets: true,
  cache: true,
  telemetry: true
}
```

Application startup validates a required profile before serving traffic.

A missing or weaker capability is a deployment/configuration error, not permission to degrade Fibre invariants.

## Domain stores remain domain stores

`InfraDriver` does not replace semantic store interfaces.

For example:

```text
WorldStore
GenesisStore
AutobiographicalMemoryStore
SituatedLifeStore
StructuredObligationStore
```

remain Fibre/domain responsibilities.

A domain store may be implemented on top of `infra.state`, `infra.objects`, `infra.streams`, or another port, but the infra layer does not know what a memory, obligation, birth, relationship, or Thread is.

The boundary is:

```text
semantic persistence contract
        |
        v
domain store / repository adapter
        |
        v
InfraDriver capability
        |
        v
provider mechanism
```

This preserves the accepted storage rule that authority comes from Fibre records/provenance/replay contracts, not from a particular database product.

## What does not belong in `InfraDriver`

The driver should be almost all-purpose infrastructure, not an abstraction for every external dependency.

Keep these outside unless a later architecture decision explicitly moves them in:

- model semantics/provider selection (`ModelGateway` / model drivers);
- payment/economic-provider integrations;
- email/SMS/social-platform integrations;
- content-generation provider behavior;
- Fibre authorization/consent decisions;
- domain clocks or deterministic experiment time where application-level injection is required;
- Thread cognition, memory, meaning, identity, relationship, or obligation semantics.

A service may use both `InfraDriver` and another provider abstraction.

## Logical IDs, not provider IDs

Fibre semantic records use Fibre identities:

```text
threadId
eventId
commandId
objectRef
streamId
cursor
snapshotDigest
worldId
```

Provider-native identifiers such as bucket keys, region IDs, resource ARNs, Durable Object IDs, project IDs, socket IDs, deployment names, or database row IDs stay inside driver configuration/operational metadata.

If operational provenance needs a provider locator, it must be explicitly classified as operational metadata rather than semantic identity.

## Composite/hybrid drivers

`InfraDriver` need not imply that one cloud supplies every capability forever.

A future composition layer may assemble one logical driver from several implementations, for example:

```text
runtime/realtime   Cloudflare
objects            S3-compatible storage
analytics          another provider
```

or support migration between providers.

The application still sees one capability bundle.

Hybrid composition must preserve each port's conformance guarantees and must not create two simultaneous authorities for a logical ordered stream or transaction domain.

## First driver: `cloudflare-v1`

The first production driver maps Fibre capabilities approximately as follows:

| Infra capability | Cloudflare v1 mechanism |
| --- | --- |
| runtime / HTTP gateway | Workers |
| transactional state | D1 and/or SQLite-backed Durable Object storage according to required consistency scope |
| ordered per-entity/channel stream | SQLite-backed Durable Objects |
| realtime | Durable Object WebSockets / hibernation where appropriate |
| immutable objects | R2 |
| global/queryable catalog | D1 |
| queues | Cloudflare Queues |
| scheduler | Cron Triggers / Durable Object alarms / Workflows according to semantics |
| workflows | Cloudflare Workflows |
| coordination / leases | Durable Objects where the consistency scope fits |
| secrets | Worker secrets / Secrets Store as selected by the implementation |
| cache | Cache API / KV only where their weaker semantics are appropriate |
| telemetry | Workers observability / logging / metrics facilities |

This table is a mapping, not Fibre ontology.

In particular, the existence of D1 does not mean every Fibre transactional authority should automatically move to D1. Each domain adapter must first declare the transaction/consistency guarantees it needs and prove the Cloudflare mapping satisfies them.

## Future cloud mappings

AWS, GCP, and Azure drivers should be chosen capability-by-capability when implemented.

Do not pre-commit exact provider services merely to make a comparison table look complete. The portability contract is the Fibre guarantee and conformance test, not the vendor SKU.

A future driver may use a different topology from Cloudflare and still conform.

## Shared conformance strategy

Each capability port gets a reusable behavior suite.

Examples:

### `state`

- commit is durable before acknowledgement;
- failed transaction leaves no partial semantic write;
- expected-version conflict fails deterministically;
- advertised transaction scope is honored;
- migration/version behavior is repeatable.

### `streams`

- concurrent append yields one total order per stream;
- duplicate event admission is idempotent;
- replay is exact and ordered;
- restart/failover does not lose admitted events;
- unrecoverable old cursor returns an explicit recovery condition.

### `objects`

- immutable put succeeds once;
- conflicting overwrite fails;
- digest mismatch fails closed;
- logical object identity does not depend on provider URL/key.

### `realtime`

- no event appears before durable admission;
- reconnect/resume preserves logical order;
- multiple consumers observe the same admitted order;
- slow consumers cannot corrupt source ordering.

### portability

- provider-native IDs do not enter Fibre semantic records;
- swapping drivers does not change normalized domain/presentation payloads;
- application services do not import provider SDKs outside provider adapters/entry points.

## Driver profiles

Services should define small required profiles.

Conceptually:

```text
PRESENTATION_INFRA_PROFILE = {
  streams: ordered + replayable + idempotent,
  objects: immutable,
  catalog: queryable,
  realtime: resumable,
}

WORLD_KERNEL_INFRA_PROFILE = {
  state: required transaction/consistency semantics,
  objects: immutable large-object support,
  coordination: required lease/session semantics,
}
```

A profile is not a new driver type. It is a declaration of which `InfraDriver` ports and guarantees a service requires.

## Dependency injection

The desired application shape is:

```text
createPresentationServer({ infra })
createWorldKernel({ infra })
createGenesisService({ infra })
```

not:

```text
createPresentationServer({ presentationInfra })
```

Provider entry points are responsible for constructing the concrete driver:

```text
const infra = createCloudflareInfra(env)
const app = createPresentationServer({ infra })
```

A local/in-memory/test driver can implement the same required profiles for deterministic tests.

## Migration and portability

A provider migration must preserve Fibre logical identities and semantic records while permitting physical infrastructure identities to change.

Migration tools may export/import state, ordered logs, and immutable object bytes through explicit domain-safe procedures.

For ordered streams or transactional authorities, a migration must have exactly one active logical write authority at any instant. Dual-running implementations may mirror or validate, but must not independently allocate competing sequence/version authority.

## Relationship to presentation work

Presentation is the first consumer and should prove the pattern before broader backend migration.

P3 therefore uses:

```text
PresentationServer
        |
        v
InfraDriver
        |
        v
cloudflare-v1
```

The presentation-specific architecture document defines the **presentation capability profile and Cloudflare mapping**, not a separate `PresentationInfraDriver`.

Once the pattern and conformance harness are credible, later Fibre backend work may adopt the same `InfraDriver` incrementally. Existing SQLite domain stores should not be rewritten merely to satisfy an abstraction milestone.

## Adoption rule

Do not perform a broad infrastructure refactor before a vertical slice proves the abstraction.

Sequence:

```text
1. define InfraDriver architecture + capability/profile discipline
2. implement the minimum ports required by PresentationServer
3. implement local/in-memory conformance driver
4. implement cloudflare-v1 presentation profile
5. validate snapshot + stream end to end
6. reuse/extend the same InfraDriver for later backend services as concrete needs arise
```

The abstraction earns wider use by surviving real services, not by anticipating every future cloud product in advance.
