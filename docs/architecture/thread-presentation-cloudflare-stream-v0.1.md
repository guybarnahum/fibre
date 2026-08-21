---
id: architecture-thread-presentation-cloudflare-stream-v0-1
status: proposed
last-reviewed: 2026-08-21
canonical: false
---

# Thread presentation Cloudflare stream v0.1

## Purpose

Define the delivery architecture that connects Fibre-owned presentation projections to `insidefibre.com` as a rich, resumable, real-time stream.

The presentation packet remains the initial snapshot. It is not the long-lived interface.

```text
Fibre authoritative life
        |
        v
authorized presentation projection
        |
        +--> versioned snapshot bundle
        |
        `--> ordered presentation-event stream
                  |
                  v
          insidefibre reducer/viewer
```

The snapshot and event stream are presentation infrastructure only. Neither is an alternate Thread authority.

This document amends the implementation direction for P3/P7 and anticipates L7 without freezing the deferred live-encounter ontology.

## Cloudflare deployment lock

The first Thread presentation server is Cloudflare-first.

Use Cloudflare primitives for the delivery plane:

```text
Workers                 HTTP/API/auth/projection gateway
Durable Objects         per-Thread ordering + WebSocket fanout + replay cursor
DO SQLite storage       per-Thread presentation-event log / stream metadata
D1                      global/queryable presentation catalog and indexes
R2                      immutable snapshots, packet bundles, images, audio, video
Static Assets           insidefibre React/Vite application
Queues/Workflows        optional asynchronous projection/media/archive work
```

This is a deployment choice for the presentation plane, not a new Fibre domain authority. Domain contracts remain portable and must not contain Cloudflare-specific identifiers or semantics.

## Why a Durable Object per Thread presentation channel

A rich Thread viewer needs one serialized change stream for each Thread presentation channel:

- monotonically ordered events;
- replay from a cursor;
- gap detection;
- multiple connected viewers;
- bidirectional interaction;
- durable state across isolate eviction/restart;
- WebSocket hibernation when idle.

The coordination atom is therefore one Durable Object per public/authorized Thread presentation channel, addressed deterministically by Thread/presentation-channel identity.

Do not use one global Durable Object for all Threads.

D1 is not the sequencing authority for an individual Thread stream. D1 may index/query presentations globally, but per-Thread ordering and real-time fanout belong to the Thread presentation Durable Object.

## Storage responsibilities

### Durable Object SQLite — ordered presentation stream

Conceptual tables:

```text
stream_meta
  channel_id
  thread_id
  current_sequence
  current_snapshot_version
  current_snapshot_digest
  current_snapshot_r2_key

presentation_events
  sequence              INTEGER PRIMARY KEY
  event_id              UNIQUE
  schema_version
  kind
  occurred_at
  emitted_at
  provenance_ref
  source_refs_json
  payload_json
```

Exact schema is implementation detail. The invariants are:

- sequence is monotonic within one presentation channel;
- event identity is idempotent;
- the event is durably accepted before it is externally observable;
- replay returns events in sequence order;
- a cursor names an observed presentation-stream position, not authoritative Thread-history position.

The stream may eventually compact/archive old segments. If a requested cursor is older than retained replay state, the server returns a snapshot-required response rather than manufacturing continuity.

### R2 — immutable presentation objects

R2 stores content-addressed/versioned artifacts such as:

```text
threads/<thread-id>/snapshots/<version>/presentation.json
threads/<thread-id>/snapshots/<version>/media.json
threads/<thread-id>/snapshots/<version>/provenance.json
threads/<thread-id>/media/<digest>.<ext>
threads/<thread-id>/stream-archive/<range>.jsonl   # optional later archive
```

A snapshot is immutable once published under a version/digest. New Thread state produces a new projection/snapshot version; it does not mutate the old object in place.

Generated images/audio/video remain reconstruction presentation artifacts with the provenance rules already established by `ThreadMediaPacket`.

### D1 — global catalog, not per-Thread sequencing

D1 is appropriate for queryable presentation metadata across Threads, for example:

```text
presentation_channels
  channel_id
  thread_id
  lifecycle_status
  visibility
  latest_snapshot_version
  latest_snapshot_digest
  updated_at

public_thread_index
  presentation/search/discovery fields only
```

D1 may be updated from the projection/publish path and may lag the per-Thread Durable Object briefly where eventual catalog freshness is acceptable.

D1 must not become the hidden source of autobiographical memory, meaning, location, relationship, or other Thread authority. It indexes public projections.

## Worker API boundary

The Cloudflare Worker is the public presentation gateway.

Initial conceptual routes:

```text
GET  /api/threads/:id/snapshot
GET  /api/threads/:id/media/:mediaId
GET  /api/threads/:id/events?after=<cursor>       # replay/fallback
WS   /api/threads/:id/stream?after=<cursor>       # live rich stream
POST /api/threads/:id/messages                    # optional HTTP ingress
```

Exact URLs may change. The contract is semantic, not path-dependent.

The Worker is responsible for:

- authentication/session handling where required;
- resolving public presentation channel identity;
- disclosure/authorization boundary enforcement before public delivery;
- routing live streams to the correct Durable Object;
- serving or proxying versioned snapshot/media artifacts from R2;
- returning explicit freshness/version/cursor metadata;
- never exposing private Fibre source state merely because it exists upstream.

## Static insidefibre application

`insidefibre.com` is already deployed as a Cloudflare Worker Static Assets SPA.

P3 should evolve that deployment rather than replace it:

```text
static asset paths        -> continue to use Worker Static Assets
/api/* and stream paths   -> Worker code
live channel              -> Durable Object WebSocket
snapshots/media           -> R2 through authorized Worker paths or safe public locators
```

The site should remain asset-first where possible so ordinary React/Vite assets stay cheap and cacheable. Only API/stream paths need to invoke application Worker code.

## Snapshot + stream contract

A viewer session starts from a coherent snapshot at a known cursor:

```text
ThreadPresentationSnapshot {
  presentation
  media
  provenance
  snapshotVersion
  snapshotDigest
  cursor
  generatedAt
}
```

The existing P1 three-packet bundle remains valid. The wrapper above is delivery metadata and does not change the P1 semantic authorities.

After the snapshot, the viewer consumes ordered presentation events.

Conceptual envelope:

```text
ThreadPresentationEvent {
  streamVersion
  eventId
  sequence
  threadId
  channelId
  occurredAt
  emittedAt
  kind
  provenanceRef
  sourceReferences[]
  payload
}
```

`occurredAt` and `emittedAt` are deliberately distinct. A remembered childhood event may be newly projected today; transport time is not lived-event time.

## Event kinds

The stream is richer than chat. Conversation is one event family among many.

Initial transport/viewer event vocabulary may include:

```text
conversation.message.started
conversation.message.delta
conversation.message.completed

presentation.snapshot.changed
media.ready
media.unavailable
```

Those can be exercised in P3 without claiming deferred live Thread capabilities.

Future event families become legal only when their Fibre producers/authorities exist:

```text
presence.changed
activity.changed
life.event.appended
memory.formed
memory.revised
meaning.formed
meaning.revised
relationship.changed
public_expression.published
lifecycle.changed
```

Defining a transport event name does not establish the corresponding Fibre capability. A future event is emitted only from an authorized projection of a real authority/producer.

## Semantic events, not raw database changes

Never stream raw Fibre DB mutations or generic internal JSON patches to the public viewer.

The boundary is:

```text
private/authoritative Fibre change
          |
          v
presentation projector + disclosure policy
          |
          v
authorized semantic presentation event
          |
          v
viewer
```

Examples:

- exact private location may project to city-level public presence;
- a private semantic-state change may produce no public event;
- a public expression event is Thread expression, not redacted private cognition;
- an internal memory revision may project to a public `meaning.revised` only if that meaning is authorized for the audience.

## Viewer reducer

`insidefibre.com` owns a reducer over presentation state.

```text
initial snapshot
      |
      v
viewer presentation state
      |
      +-- event N+1 --> reducer --> new rendered state
      +-- event N+2 --> reducer --> new rendered state
      `-- ...
```

The reducer must be deterministic for a given snapshot + ordered event sequence.

It must not infer missing Thread facts.

For structural changes that are unsafe or inefficient to patch incrementally, Fibre may emit:

```text
presentation.snapshot.changed
```

The viewer then fetches the referenced/current snapshot and resumes from its cursor.

This keeps the event contract semantic and avoids requiring every future presentation change to be representable as JSON Patch.

## Resume, replay, and gaps

Required behavior:

```text
connect with cursor C
  |
  +-- C retained -> replay C+1..N -> join live stream
  |
  `-- C unavailable/incompatible -> snapshot_required
                                  -> fetch latest snapshot at N
                                  -> resume after N
```

The viewer must detect:

- duplicated event IDs;
- out-of-order sequence;
- sequence gaps;
- unsupported stream versions;
- snapshot/event Thread or channel mismatch.

Duplicate delivery must be harmless.

## Persistence-before-broadcast

A presentation event that changes durable viewer-visible state must be committed to the per-Thread stream log before broadcast.

Do not tell viewers sequence N exists and only then attempt to persist it.

This supports deterministic replay and prevents a reconnect from observing a state that was visible live but absent from the durable presentation stream.

## Chat ingress and Thread changes

The real-time channel is bidirectional, but client commands and server presentation events remain distinct.

Conceptually:

```text
viewer -> command/input
  conversation.message.submit
  interaction.request

Fibre -> presentation events
  conversation.message.started
  conversation.message.delta
  conversation.message.completed
  [other authorized projected changes]
```

A visitor message is not itself authoritative Thread history merely because it entered through the presentation WebSocket. Fibre's ordinary authorization/history/cognition pipeline decides what authoritative consequences follow.

Likewise, a conversational response may coexist with other real changes:

```text
message output
memory formation
meaning revision
relationship update
location/activity update
```

The presentation server may deliver all of them on one ordered channel after the corresponding Fibre authorities have admitted them.

## Provenance and disclosure

Every semantic event that changes presented life state must retain enough provenance to distinguish its authority class.

Transport metadata does not replace `PresentationProvenance`.

The public stream must never expose:

- private semantic state merely because it changed;
- exact location when only coarse presence is authorized;
- restricted third-party details;
- internal model/tool prompts;
- mechanical eligibility/modulation as Thread self-knowledge;
- unreviewed generated reconstruction as historical evidence.

## Snapshot cadence

Do not write a new full snapshot for each message delta.

Snapshot creation should be based on semantic/public-state usefulness, for example:

- first publication;
- structural presentation change;
- compacting a long event tail;
- public memory/meaning/relationship/lifecycle change;
- explicit publication/review action;
- recovery checkpoint.

Conversation token/delta events may remain stream-only until a completed message or later snapshot policy includes the resulting public transcript.

Exact cadence is implementation policy, not canon.

## P3 scoping change

P3 should no longer be only a static packet renderer.

P3 now proves two consumer contracts:

1. **snapshot rendering** — load the Cần Thơ golden bundle and render it generically;
2. **stream reduction** — apply a deterministic canned presentation stream to that snapshot with reconnect/replay/gap tests.

P3 may initially stream only capabilities that are presentation-safe today, such as:

```text
conversation fixture output
media placeholder -> ready
snapshot invalidation/reload
```

P3 must not fake `presence.changed`, `memory.formed`, `meaning.revised`, or other deferred live events as Fibre-produced facts merely to demonstrate animation. Such event shapes may have contract tests, but real production emission remains gated by the L-track producer/authority milestones.

## P7 scoping change

P7 is no longer only static promotion.

P7 should establish the Fibre-owned publisher that can:

```text
project authoritative Fibre state
validate presentation bundle
store immutable snapshot in R2
advance per-Thread presentation stream cursor
publish semantic projection events
update D1 discovery/catalog metadata
```

Static reviewed promotion remains a valid fixture/review mode, but the production presentation architecture is snapshot + stream.

## Cloudflare failure boundaries

The architecture must tolerate:

- browser disconnect/reconnect;
- Durable Object eviction/hibernation;
- Worker deployment/restart;
- duplicate client retries;
- R2 object temporarily not yet cached at edge;
- D1 catalog lag;
- event replay cursor outside retention;
- unsupported snapshot/stream versions.

None of these may corrupt Fibre authoritative life state. Presentation delivery can fail or resynchronize without rewriting Thread authority.

## Security boundary

The presentation service is an internet-facing projection boundary.

Treat it as a separate capability from internal Fibre state access:

- least-privilege Worker bindings;
- public/authorized projection reads only;
- no direct browser access to D1/DO/private R2 buckets;
- explicit authorization on message/action ingress;
- rate limiting/abuse controls at the Worker boundary;
- public-media locators separated from private source artifacts;
- versioned audit/provenance references for released content.

## Acceptance tests before live integration

Before P3/P7 can claim stream readiness, test at minimum:

1. snapshot + cursor bootstraps deterministic viewer state;
2. N ordered events produce the same state after live delivery or replay;
3. duplicate event delivery is idempotent;
4. a sequence gap forces replay/resnapshot rather than silent continuation;
5. stale cursor forces snapshot recovery;
6. generated media readiness changes do not alter historical authority;
7. conversation deltas cannot mutate life/memory/meaning surfaces by themselves;
8. a future semantic event requires matching allowed provenance;
9. an unauthorized/private change yields no public event;
10. a new snapshot can supersede event-tail state without changing authoritative Fibre state.

## Causal-status declaration

The Cloudflare presentation stream is delivery infrastructure.

It can make already-authorized Thread changes visible in real time, but transport itself is not evidence that those Thread capabilities exist or have causal personhood standing.

A fixture WebSocket that displays `meaning.revised` would prove only that the viewer can render such an event. It would not prove that Fibre can legitimately produce a meaning revision.
