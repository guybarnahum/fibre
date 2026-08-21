---
id: architecture-thread-presentation-infrastructure-driver-v0-1
status: proposed
last-reviewed: 2026-08-21
canonical: false
---

# Thread presentation infrastructure driver v0.1

## Purpose

Define a provider-neutral infrastructure boundary for the Thread presentation delivery plane.

The first implementation is Cloudflare-first, but Fibre must not make Cloudflare products part of the presentation domain contract. The same presentation server should be able to run later on AWS, Google Cloud, Azure, or another provider by replacing infrastructure drivers rather than changing Thread presentation semantics.

The governing split is:

```text
Fibre presentation semantics
  ThreadPresentationPacket
  ThreadMediaPacket
  PresentationProvenance
  ThreadPresentationEvent
  snapshot/cursor/replay rules
        |
        v
PresentationServer application layer
  projection/publication
  authorization/disclosure
  snapshot + stream orchestration
  HTTP / realtime protocol
        |
        v
PresentationInfraDriver ports
        |
        +--> Cloudflare driver v1       # first implementation
        +--> AWS driver                 # future
        +--> GCP driver                 # future
        `--> Azure driver               # future
```

Provider-specific resources are implementation mechanisms. They are never Thread authority and never appear in Fibre semantic records merely because a driver uses them.

## Design rule: abstract guarantees, not products

Do **not** define a fake cross-cloud abstraction such as `DurableObject`, `D1`, `R2`, `Lambda`, or `S3` in the domain.

Instead define the guarantees the presentation server needs:

- one ordered logical event stream per presentation channel;
- idempotent event admission;
- durable admission before external observation;
- replay after a logical cursor;
- gap detection and snapshot recovery;
- realtime fanout to zero or more viewers;
- immutable/versioned presentation objects;
- global/queryable catalog metadata;
- optional asynchronous work dispatch;
- explicit health/capability reporting.

A provider driver may implement several ports with one native product or one port with several native products.

## Driver bundle

Conceptually:

```text
PresentationInfraDriver {
  driverId
  driverVersion
  capabilities

  channels       PresentationChannelDriver
  objects        PresentationObjectDriver
  catalog        PresentationCatalogDriver
  realtime       PresentationRealtimeDriver
  asyncWork?     PresentationAsyncWorkDriver
}
```

This is an architectural shape, not yet a frozen JavaScript/TypeScript interface. P3 should implement the smallest executable form needed by the viewer/server vertical slice and then lock it with conformance tests.

The application layer depends on these logical ports. Provider entry points wire concrete implementations into the application.

## `PresentationChannelDriver`

Owns persistence semantics for one logical presentation stream.

Required operations/behavior, expressed conceptually:

```text
open(channelId)

getHead()
  -> current logical sequence
     current snapshot version/digest/objectRef

append(event, idempotencyKey, expectedSequence?)
  -> accepted sequence

readAfter(sequence, limit)
  -> events in strict sequence order

publishSnapshot(snapshotPointer, expectedSequence?)
  -> new stream head metadata

getSnapshotPointer()
```

Required invariants:

1. `sequence` is monotonically increasing within one logical channel.
2. The same admitted `eventId` / idempotency key cannot create two logical events.
3. An event is durably admitted before any viewer may observe it.
4. `readAfter(N)` never reorders accepted events.
5. Concurrent appenders cannot assign the same sequence to different events.
6. Snapshot metadata is tied to a known logical stream position.
7. A driver that cannot replay a requested historical cursor returns `snapshot_required`; it never fabricates continuity.
8. Provider failover/restart may change physical instances but not logical channel/event identity.

The logical `channelId`, event IDs and sequence numbers are Fibre presentation identities. Native object IDs, partition keys, region IDs and database row IDs are driver-private.

## `PresentationRealtimeDriver`

Owns live session delivery, not durable event truth.

Conceptual responsibilities:

```text
accept/connect session
associate session with channel + authorized audience
resume after logical cursor
send event
broadcast admitted event
close / backpressure / heartbeat
```

Required invariant:

> Realtime transport may only publish an event after `PresentationChannelDriver` has durably admitted it.

WebSocket is the preferred first transport because Thread interaction is bidirectional. The semantic stream must not depend on WebSocket framing. A future driver may use WebSocket, SSE plus HTTP ingress, a managed pub/sub socket service, or another transport while preserving the same event contract.

Transport connection IDs are ephemeral and must not appear as Thread/presentation authority.

## `PresentationObjectDriver`

Stores immutable/versioned packet and media bytes.

Conceptual operations:

```text
putImmutable(objectRef, bytes, digest, metadata)
get(objectRef)
head(objectRef)
resolveDelivery(objectRef, audience)
```

Required invariants:

- Fibre uses stable logical `objectRef` values rather than `r2://`, `s3://`, `gs://`, Azure blob URLs, or provider bucket/container IDs in domain records;
- a published version/digest cannot be silently overwritten;
- digest mismatch fails closed;
- delivery URLs/tokens may be provider-specific and ephemeral but are not persisted as semantic identity;
- object storage owns bytes, not autobiographical/history/meaning authority.

This directly extends the accepted storage-model rule that production object storage remains replaceable behind stable Fibre object IDs.

## `PresentationCatalogDriver`

Provides cross-Thread discovery/index metadata.

Conceptual operations:

```text
upsertChannelProjection(metadata)
getChannel(channelId)
findByThread(threadId)
queryPublicIndex(query)
remove/revokeProjection(channelId)
```

Catalog freshness may lag a channel head where explicitly permitted. The catalog is therefore not the per-Thread sequence authority.

The catalog may contain only presentation-safe/indexable projection fields. It must not become a shadow database of private Thread state.

## `PresentationAsyncWorkDriver`

Optional port for jobs that need not execute synchronously with a viewer request, such as:

- snapshot materialization;
- media generation/processing;
- archival compaction;
- catalog enrichment;
- notification/publish fanout.

Conceptual operations may be as small as:

```text
enqueue(workItem)
schedule(workItem, at)
```

Work items reference stable Fibre presentation IDs/object refs. Provider queue/workflow execution IDs remain implementation metadata.

The first P3 vertical slice does not require this port to be complete.

## Presentation server owns semantics

The infrastructure driver must **not** decide:

- whether a private Fibre fact may be disclosed;
- whether an event is memory, meaning, belief or historical fact;
- whether a generated asset is reconstruction;
- whether a Genesis candidate may be presented as live;
- what a Thread is permitted to say;
- whether a source is authoritative;
- whether a location may be exact, coarse or hidden.

Those decisions belong to Fibre/presentation application contracts before the driver receives a public projection.

The driver transports and stores an already-authorized presentation artifact/event.

## Cloudflare driver v1

The first concrete driver maps the logical ports approximately as follows:

| Logical capability | Cloudflare v1 mechanism |
| --- | --- |
| application runtime / gateway | Workers |
| channel ordering + durable replay | one SQLite-backed Durable Object per presentation channel |
| realtime fanout | Durable Object WebSockets with hibernation where appropriate |
| immutable object bytes | R2 |
| global/queryable catalog | D1 |
| static viewer assets | Worker Static Assets |
| asynchronous work | Queues / Workflows when introduced |

The Durable Object is an implementation of channel coordination, not a Fibre domain object. A `durableObjectId` must never appear in `ThreadPresentationPacket`, `ThreadPresentationEvent`, or authoritative Thread state.

Likewise D1 row IDs, R2 keys, Worker deployment names and Cloudflare account/region metadata remain inside `drivers/cloudflare` configuration/metadata.

## Future provider mappings

These are capability mappings, not implementation commitments. Exact products should be selected when each driver is built and validated against the same conformance suite.

| Capability | AWS candidate | GCP candidate | Azure candidate |
| --- | --- | --- | --- |
| runtime/gateway | serverless/container + HTTP/WS gateway | serverless/container + HTTP/WS gateway | serverless/container + HTTP/WS gateway |
| ordered channel/replay | transactional/conditional per-channel store or coordinator | transactional per-channel store/coordinator | transactional per-channel store/coordinator |
| realtime fanout | managed WebSocket/pub-sub delivery | managed WebSocket/pub-sub delivery | managed WebSocket/pub-sub delivery |
| immutable objects | S3-class object storage | Cloud Storage | Blob Storage |
| catalog | relational/document/kv service | relational/document service | relational/document service |
| async work | queue/workflow services | queue/workflow services | queue/workflow services |

We intentionally do not force every provider to emulate Cloudflare Durable Objects. Each driver must satisfy the Fibre semantics; its internal topology may differ.

## Driver conformance suite

Portability is credible only if drivers are tested against behavior rather than interface shape.

Every production driver should pass one shared conformance suite covering at least:

### Channel correctness

- concurrent append yields one total order;
- duplicate event admission is idempotent;
- append is durable before broadcast;
- replay after cursor is exact and ordered;
- gap/retention loss produces `snapshot_required`;
- restart/eviction does not lose admitted events;
- snapshot pointer names a coherent stream position.

### Object correctness

- immutable put succeeds once;
- conflicting overwrite fails;
- digest mismatch fails;
- missing object is distinguishable from authorization denial;
- provider-specific locator is not required by the semantic packet.

### Catalog correctness

- channel lookup is stable by Fibre ID;
- index lag never changes per-channel sequence truth;
- private/non-indexable fields are not required for catalog operation.

### Realtime correctness

- no event is observed before durable admission;
- reconnect after cursor yields no gap/duplication beyond defined idempotent replay behavior;
- two viewers receive the same logical event order;
- a slow/disconnected viewer cannot corrupt channel order.

### Portability safety

- semantic fixture and normalized digests are identical regardless of driver;
- no provider-native identifier enters presentation semantic packets/events;
- changing driver does not require React component changes;
- changing driver does not alter provenance/authority classification.

## Driver selection and dependency direction

Runtime configuration chooses a driver outside the semantic/application core, for example conceptually:

```text
createPresentationServer({
  infra: createCloudflarePresentationInfra(env)
})
```

Later:

```text
createPresentationServer({
  infra: createAwsPresentationInfra(config)
})
```

The dependency direction is always:

```text
presentation domain <- presentation application <- driver implementation
```

Never:

```text
presentation domain -> Cloudflare SDK
```

Insidefibre React components should normally know neither which driver nor which cloud is serving them. They consume HTTP/realtime presentation protocols only.

## Migration between providers

A driver migration must preserve logical presentation identities:

```text
channelId
eventId
sequence
snapshotVersion
snapshotDigest
objectRef
presentation/media/provenance packet contents
```

A migration tool may export/import channel logs and object bytes while preserving those identities. Physical bucket keys, database primary keys, socket IDs and deployment IDs may change.

For a live migration, dual-publish/cutover strategy is implementation-specific. The safety criterion is that there is exactly one accepted logical ordering authority for a channel at any moment; two active drivers must never independently allocate competing sequences.

## P3 implementation rule

P3 should not build React code directly against R2/D1/Durable Object APIs.

P3 is split conceptually into:

```text
P3-A  generic snapshot viewer + reducer
P3-B  provider-neutral presentation-server interfaces/protocol
P3-C  Cloudflare driver v1 + deterministic stream fixture
```

The first Cloudflare implementation may be narrow, but it must be wired through the driver boundary from the beginning.

### P3 driver exit criterion

A local/in-memory test driver and the Cloudflare driver can both run the same presentation-server/reducer contract tests without changing semantic fixture data or viewer components.

The in-memory driver is test infrastructure, not a second production provider.

## Relationship to the live-encounter track

This abstraction does not accelerate or bypass L0-L6.

A driver may support a transport event name such as `meaning.revised` or `presence.changed`, but Fibre may emit that event only after the corresponding domain producer, authority and disclosure rules exist.

Infrastructure portability cannot manufacture personhood capability.
