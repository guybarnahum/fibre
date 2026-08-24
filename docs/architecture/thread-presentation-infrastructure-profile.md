---
id: architecture-thread-presentation-infrastructure-profile-v0-1
status: proposed
last-reviewed: 2026-08-24
canonical: false
---

# Thread presentation infrastructure profile

## Purpose

Define the infrastructure **capability profile** required by `PresentationServer`.

This document does not define a presentation-specific infrastructure driver. Fibre has one provider-neutral [`InfraDriver`](infrastructure-driver.md) abstraction for backend services.

The dependency direction is:

```text
Thread presentation semantics
        |
        v
PresentationServer
        |
        v
InfraDriver
        |
        +--> cloudflare-v1       # first implementation
        +--> aws-*               # future
        +--> gcp-*               # future
        `--> azure-*             # future
```

Provider-specific resources remain implementation mechanisms. They are never Thread authority and never appear in presentation semantic records merely because a driver uses them.

## Presentation capability profile

`PresentationServer` requires a subset of `InfraDriver` capabilities:

```text
PRESENTATION_INFRA_PROFILE {
  streams:
    per-channel total order
    idempotent admission
    durable-before-observable
    replay after cursor
    snapshot-required recovery

  objects:
    immutable/versioned writes
    digest verification
    stable Fibre objectRef identity

  catalog:
    cross-Thread presentation lookup/index
    no authority over per-Thread stream ordering

  realtime:
    fanout only after durable stream admission
    reconnect/resume
    backpressure/disconnect handling

  queues/workflows?:
    optional asynchronous snapshot/media/archive work
}
```

This is a profile over `InfraDriver`, not a separate driver family.

The presentation application must fail fast if the selected driver cannot provide these guarantees.

## Ordered presentation stream

The `streams` capability is the durable truth for the public/authorized presentation event order of one logical presentation channel.

Required behavior remains conceptually:

```text
getHead(streamId)
append(streamId, event, idempotencyKey, expectedSequence?)
readAfter(streamId, sequence, limit)
publishSnapshot(streamId, snapshotPointer, expectedSequence?)
getSnapshotPointer(streamId)
```

The exact executable API belongs to the general `InfraDriver` implementation work and may evolve while the presentation stack is built.

Required invariants:

1. `sequence` is monotonically increasing within one presentation channel.
2. duplicate event/idempotency admission cannot create two logical events;
3. an event is durably admitted before any viewer may observe it;
4. replay after a cursor is exact and ordered;
5. concurrent appenders cannot allocate competing sequence values;
6. snapshot metadata is tied to a known stream position;
7. unavailable retained history produces an explicit snapshot-required recovery condition;
8. provider restart/failover cannot change Fibre logical event identity/order.

The presentation cursor names a public presentation-stream position, not authoritative Thread-history position.

## Realtime delivery

Realtime delivery is not event authority.

> A realtime transport may only publish a presentation event after the ordered-stream capability has durably admitted it.

WebSocket is the preferred first transport because Thread interaction is bidirectional, but `ThreadPresentationEvent` semantics must remain independent of WebSocket framing.

The viewer may therefore consume the same semantic stream over a future WebSocket, SSE + HTTP ingress, managed realtime service, or another conforming transport.

## Immutable presentation objects

Presentation snapshots, packet bundles and media use the general `objects` capability.

Fibre records stable logical `objectRef` values rather than provider URLs or bucket/container keys.

Published object versions/digests are immutable. Generated images/audio/video remain presentation reconstruction and never acquire Thread-life authority through object storage.

## Presentation catalog

The `catalog` capability supports cross-Thread discovery and latest-publication metadata.

It is not the per-Thread ordering authority and may lag a stream head where explicitly permitted.

The catalog contains only presentation-safe/indexable projection fields. It must not become a shadow database of private Thread state.

## Cloudflare mapping

The first production `InfraDriver` mapping is identified by the real adapter compatibility key `cloudflare-v1`:

| Presentation requirement | `cloudflare-v1` mechanism |
| --- | --- |
| HTTP/runtime gateway | Workers |
| ordered channel + replay | one SQLite-backed Durable Object per presentation channel |
| realtime fanout | Durable Object WebSockets / hibernation |
| immutable snapshot/media bytes | R2 |
| global/queryable presentation catalog | D1 |
| static viewer assets | Worker Static Assets |
| optional async work | Queues / Workflows |

Cloudflare Durable Object IDs, D1 row IDs, R2 keys, deployment names and socket IDs remain driver-private operational details.

See [`thread-presentation-cloudflare-stream.md`](thread-presentation-cloudflare-stream.md) for the concrete first-provider topology.

## Conformance tests

The presentation profile adds application-specific tests on top of the general `InfraDriver` capability suites:

- concurrent presentation appends produce one total order;
- duplicate presentation events remain idempotent;
- no viewer sees an event before durable admission;
- reconnect after cursor produces ordered replay without invented continuity;
- old cursor yields snapshot-required recovery;
- two viewers observe the same logical event order;
- immutable snapshot/media overwrite fails;
- catalog lag cannot alter stream truth;
- no provider-native ID enters `ThreadPresentationPacket` or `ThreadPresentationEvent`;
- swapping local/in-memory and Cloudflare drivers does not change normalized packet/event semantics;
- React components contain no provider branching.

## Presentation server owns semantics

`InfraDriver` must not decide:

- whether a private Fibre fact may be disclosed;
- whether an event is memory, meaning, belief or history;
- whether generated media is reconstruction;
- whether a Genesis candidate may appear live;
- what a Thread may say publicly;
- whether a location is exact, coarse or hidden.

`PresentationServer` receives/constructs an authorized projection and uses infrastructure only to store, order and deliver it.

The application construction shape is:

```text
const infra = createCloudflareInfra(env)
const server = createPresentationServer({ infra })
```

not:

```text
createPresentationServer({ presentationInfra })
```

The same `InfraDriver` abstraction should later be reused by World Kernel, Genesis and other Fibre backend services as their actual infrastructure needs are implemented and tested.
