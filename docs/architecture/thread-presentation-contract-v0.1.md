---
id: architecture-thread-presentation-contract-v0-1
status: proposed
last-reviewed: 2026-08-21
canonical: false
---

# Thread Presentation Contract v0.1

## Purpose

This contract defines the first portable Fibre-owned projection for presenting a Thread or explicitly unpublished Genesis candidate to a human-facing consumer such as `insidefibre.com`.

It is **presentation infrastructure**, not a new Thread persistence authority.

The contract deliberately contains no live-encounter ontology. In particular, v0.1 does not define `ThreadEncounterSnapshot`, `DailyPlan`, `RecentLivedContext`, `UnsettledExperience`, `OpenInterpretiveQuestion`, or `onMyMind`.

The governing distinction is:

```text
Fibre authoritative life state
        ↓
versioned presentation projection
        ↓
consumer rendering
```

The consumer may render the projection. The consumer does not become an alternate Thread database.

## Implemented surfaces

The implementation is `services/world-kernel/src/thread-presentation-domain.mjs`.

P1 defines exactly three surfaces:

```text
ThreadPresentationPacket
ThreadMediaPacket
PresentationProvenance
```

The implementation uses strict exact-key normalization and cross-packet reference validation rather than persistence tables. Canonical SHA-256 digests can be produced for each normalized packet.

## ThreadPresentationPacket

Version:

```text
thread-presentation-packet-v0.1
```

Top-level shape:

```text
schemaVersion
manifest
subject
introduction
origins[]
places[]
relationships[]
life.timeline[]
memories[]
meanings[]
```

### Manifest

The manifest binds:

```text
presentationId
threadId
lifecycleStatus
fixture
generatedAt
mediaPacketId
provenancePacketId
```

`lifecycleStatus` may represent the existing Thread lifecycle states plus `genesis_candidate`.

An unpublished Genesis candidate is required to carry:

```text
lifecycleStatus: genesis_candidate
fixture: true
```

The validator rejects laundering an unpublished candidate into an apparently live/non-fixture presentation.

### Subject

The subject block contains:

```text
displayName      string | null
birthDate        YYYY-MM-DD | null
languages[]
homePlaceRef     ref | null
provenanceRef
```

`displayName: null` is legal. A viewer must not invent a public name merely because a layout expects one.

There is deliberately **no presentation-level `pronouns` primitive**. The exact-key validator rejects one. This does not claim that gendered self-description can never exist in Fibre; it prevents a public presentation schema from turning pronouns into an automatically inferred identity primitive.

The subject block is bound to a required provenance entry. P1 keeps source references centralized in that provenance record rather than duplicating a second source list on the subject itself.

### Introduction

The introduction is presentation text and carries:

```text
headline
summary
sourceReferences[]
provenanceRef
mediaRefs[]
```

An introduction may be Thread expression, Fibre projection, editorial presentation, or explicitly fixture material. It may not silently become autobiographical memory or remembered meaning.

### Origins, places, relationships and timeline

These are public/curated views over already existing or future authoritative sources.

Every displayed item carries:

```text
sourceReferences[]
provenanceRef
mediaRefs[]
```

Timeline entries additionally preserve event identity and occurrence time. Places and relationships are presentation views and do not establish competing place/relationship persistence authorities.

### Memory

A memory item preserves a separate presentation surface for:

```text
memoryRef
rememberedContent
uncertainty[]
formedAt
sourceReferences[]
meaningRefs[]
provenanceRef
mediaRefs[]
```

A memory item must resolve to `thread_memory` provenance. Historical/factual provenance may not masquerade as autobiographical retention.

### Remembered meaning

A meaning item preserves:

```text
meaningRef
summary
formedAt
memoryRefs[]
sourceReferences[]
supersedesMeaningRef?
provenanceRef
mediaRefs[]
```

A meaning item must resolve to `thread_meaning` provenance. Fibre/editorial summaries cannot masquerade as Thread-authored remembered meaning.

This keeps the accepted authority separation:

```text
history != memory != remembered meaning
```

## ThreadMediaPacket

Version:

```text
thread-media-packet-v0.1
```

A media packet is an index/plan over presentation assets, not evidence by itself.

Each media entry records:

```text
mediaId
kind: image | audio | video
role
status: placeholder | pending | ready | unavailable
locator?
mediaType?
sha256?
width?
height?
durationMs?
posterRef?
unavailableReason?
sourceReferences[]
provenanceRef
generation?
```

The validator allows a fully useful presentation bundle whose media remains entirely placeholder/pending.

A generated asset carries replaceable provider/model generation provenance. Any asset with a generation record is required to use `generated_reconstruction` provenance. It cannot be presented under `authoritative_fact` provenance.

Video may reference an image poster. The poster must resolve to an image asset.

Transport/storage location remains replaceable; `locator` is opaque to this domain contract.

## PresentationProvenance

Version:

```text
presentation-provenance-v0.1
```

P1 recognizes these presentation authority classes:

```text
authoritative_fact
thread_memory
thread_meaning
thread_expression
belief
fibre_projection
editorial
generated_reconstruction
fixture
```

`thread_expression` is deliberately separate from generic Thread-authored private state. Audience-directed expression is governed by interest mediation and is not authoritative evidence of the private interior.

`belief` is reserved for the deferred epistemic-access work identified in P0. P1 does not create a `belief_about_own_past` authority; the enum preserves a compatible presentation path once that authority exists.

Every provenance entry carries one or more durable source references. Cross-packet validation requires presentation-item source references to be covered by the referenced provenance entry.

## Bundle integrity

`normalizeThreadPresentationBundle()` validates all three packets together.

It requires:

- one `threadId` across all packets;
- manifest references to the exact media and provenance packet IDs;
- every `provenanceRef` to resolve;
- every presentation `mediaRef` to resolve;
- generated media to use `generated_reconstruction` provenance;
- subject and timeline place references to resolve within the presentation place view;
- memory-to-meaning and meaning-to-memory references to resolve;
- superseded meaning references to resolve;
- video poster references to resolve to image media.

## Explicit negative boundary

The exact-key validator intentionally rejects these top-level additions to `ThreadPresentationPacket v0.1`:

```text
encounter
dailyPlan
recentLivedContext
onMyMind
```

The live encounter track remains `Deferred` under the P0 reconciliation. A website-only synthetic scenario may exist outside the Fibre packet for visual development, but such a scenario does not define Fibre ontology.

## Scientific isolation for H-v2 fixtures

The three completed H-v2 candidates may be used as presentation fixtures only.

For such a packet:

- candidate Genesis history/memory/meaning may be projected from already frozen artifacts;
- lifecycle must remain `genesis_candidate`;
- `fixture` must remain `true`;
- no post-Genesis life may be invented into the Fibre packet;
- presentation work may not tune Genesis, cohort selection, retries, genomes, worlds or #39 thresholds;
- generated images/voice/video remain presentation reconstruction, not H-v2 evidence.

## Causal-status declaration

All three P1 surfaces are currently **Stored-only / presentation-only projection infrastructure** for personhood-evidence purposes.

They can preserve and render existing Fibre authority, but the packets themselves do not change Thread cognition, judgment, relationships, resources, authorization or future possibility.

P1 therefore makes no claim of functional individuality or interiority.

The relevant causal work remains in #40/#41 and in the deferred live-encounter track.

## Acceptance tests

`services/world-kernel/test/thread-presentation-domain.test.mjs` covers at least:

1. unnamed Unicode Genesis candidate + `birthDate` + placeholder media validates;
2. `pronouns` is rejected as a presentation primitive;
3. encounter/day/recent/on-my-mind fields are rejected from v0.1;
4. `genesis_candidate` cannot be presented as a non-fixture;
5. memory cannot use factual provenance;
6. remembered meaning cannot use Fibre-projection provenance;
7. generated media cannot use factual provenance;
8. displayed source references must be covered by provenance;
9. cross-packet Thread identity and references are bound.

The test is automatically part of the active test suite because Fibre's test lifecycle discovers every `services/world-kernel/test/*.test.mjs` not explicitly classified as reproducibility-only.

## P1 exit

P1 is implementation-complete when the maintainer confirms:

```bash
node --test services/world-kernel/test/thread-presentation-domain.test.mjs
npm run includes:check
npm run validate
npm test
```

P2 may then build the comprehensive Cần Thơ golden packet against this contract.
