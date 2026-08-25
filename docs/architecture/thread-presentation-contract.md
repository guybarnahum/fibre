---
id: architecture-thread-presentation-contract-v0-1
status: proposed
last-reviewed: 2026-08-25
canonical: false
---

# Thread Presentation Contract

## Purpose

This contract defines Fibre-owned portable projections for presenting a Thread or explicitly unpublished Genesis candidate to a human-facing consumer such as `insidefibre.com`.

It is **presentation infrastructure**, not a new Thread persistence authority.

The governing distinction remains:

```text
Fibre authoritative life / civil / embodiment state
        ↓
versioned authorized presentation projection
        ↓
consumer rendering
```

The consumer may render the projection. It does not become an alternate Thread, Civil Registry, embodiment, history, memory or meaning database.

The contract deliberately contains no live-encounter ontology. In particular it does not define `ThreadEncounterSnapshot`, `DailyPlan`, `RecentLivedContext`, `UnsettledExperience`, `OpenInterpretiveQuestion`, or `onMyMind`.

## Implemented surfaces

The stable external seam is `services/thread-presentation/src/index.mjs`. Packet normalization is currently physically implemented under World Kernel but external consumers must not import that private implementation directly.

Thread Presentation defines three packet surfaces:

```text
ThreadPresentationPacket
ThreadMediaPacket
PresentationProvenance
```

The implementation uses strict exact-key normalization and cross-packet reference validation rather than creating a second persistence authority. Canonical SHA-256 digests can be produced for each normalized packet.

## ThreadPresentationPacket compatibility

Supported versions:

```text
thread-presentation-packet-v0.1   legacy/current golden-fixture compatibility
thread-presentation-packet-v0.2   current identity-credential presentation contract
```

The v0.1 top-level shape remains:

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

V0.2 preserves all of those fields and adds three nullable blocks:

```text
civilIdentity
visualIdentity
identityCard
```

Existing v0.1 packets are not silently rewritten or upgraded.

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

The validator rejects laundering an unpublished candidate into an apparently live/non-fixture presentation. V0.2 additionally rejects live civil identity or an identity card on a `genesis_candidate` presentation.

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

### Introduction, origins, places, relationships and timeline

These are presentation views over already-authorized sources. Every displayed claim carries provenance and, where applicable, source/media references. Places and relationships do not establish competing persistence authorities.

### Memory and remembered meaning

Memory remains a separate presentation surface with remembered content, uncertainty, formation time and source linkage. A memory must resolve to `thread_memory` provenance.

Remembered meaning remains separate again and must resolve to `thread_meaning` provenance.

The accepted authority separation is unchanged:

```text
history != autobiographical memory != remembered meaning
```

### V0.2 civil identity

`civilIdentity` is a **read-only projection** of the Civil Registry record:

```text
fibreIdentityNumber
registrationId
registeredAt
birthEventRef
worldRef
issuer
sourceReferences[]
provenanceRef
```

It must use `authoritative_fact` provenance and `issuer = fibre_civil_registry`.

Thread Presentation may validate FIN display syntax (`XXXX-XX-XXXX`) but does not implement FIN generation, checksum calculation, allocation, uniqueness, collision handling, lookup authority, or registration persistence.

### V0.2 authorized visual identity

`visualIdentity` is a bounded presentation projection of already-admitted portrait embodiment:

```text
projectionVersion
authority = authorized_embodiment_projection
embodimentId
embodimentRevision
specificationDigest
subjectDescription
renderDescription
sourceReferences[]
permissionReferences[]
referenceObjectRefs[]
provenanceRef
```

It must use `fibre_projection` provenance. It is not embodiment authority. The upstream projection boundary is responsible for rights/visibility admission before these fields are exposed.

### V0.2 Fibre Identity Card

`identityCard` is a replaceable credential presentation record. It is specified in detail by [`fibre-identity-card.md`](fibre-identity-card.md).

Important invariants:

- card credential ID/serial/revision are distinct from FIN;
- the card contains no independently writable FIN field;
- card rendering resolves FIN through `civilIdentity`;
- card registration ID must match the civil registration;
- card name/birth-date display fields may not drift from the authorized subject projection;
- reissue may replace credential ID, serial and revision without changing FIN or civil registration;
- visibility is `public | restricted | private` and defaults closed (`private`) when omitted at the compatibility boundary;
- `officialPhotoMediaRef` must resolve to an image media item whose role is `official_id_photo`.

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

Roles are semantic presentation roles and remain extensible without creating another media protocol. V0.2 identity credentials use:

```text
official_id_photo
```

An official ID photo must be an image using `generated_reconstruction` provenance. It is derived presentation media and cannot become identity, embodiment, history, memory or meaning evidence.

A generated asset with a generation record is always required to use `generated_reconstruction` provenance. It cannot be presented under `authoritative_fact` provenance.

Transport/storage location remains replaceable; `locator` and served `objectRef` identities are Fibre-level opaque references, not cloud-storage URLs.

## PresentationProvenance

Version:

```text
presentation-provenance-v0.1
```

Recognized presentation authority classes remain:

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

`thread_expression` remains separate from generic Thread-authored private state. `belief` remains reserved for the accepted epistemic-access direction. Every provenance entry carries durable source references; cross-packet validation requires displayed claim references to be covered by the referenced provenance entry.

## Bundle integrity

`normalizeThreadPresentationBundle()` validates all packets together.

Common requirements include:

- one `threadId` across all packets;
- manifest references to the exact media and provenance packet IDs;
- every `provenanceRef` and presentation `mediaRef` resolves;
- generated media uses `generated_reconstruction` provenance;
- subject/timeline place references resolve;
- memory/meaning references resolve without collapsing authority;
- video poster references resolve to image media.

V0.2 additionally requires:

- civil identity uses factual provenance and the Fibre Civil Registry issuer;
- card registration/name/birth-date display cannot drift from its admitted source projections;
- card credential identity is distinct from FIN;
- the official-photo media reference resolves to `official_id_photo` image media;
- `official_id_photo` remains generated reconstruction;
- Genesis candidates cannot acquire live FIN/card identity through presentation.

## Presentation asset demand

Thread Presentation owns semantic asset demand. The generic Asset Generator never scans Fibre state to decide that a Thread needs an ID photo.

For `official_id_photo`:

```text
placeholder + admitted visualIdentity
    -> deterministic generation job

placeholder + no admitted visualIdentity
    -> deferred_missing_embodiment

pending
    -> generation_pending; no duplicate job

ready / unavailable
    -> no new job
```

The deterministic generation input binds to the authorized visual-identity projection rather than card issue/revision or unrelated presentation snapshot changes. Card reissue therefore does not regenerate the official photo when embodiment is unchanged.

The image-generation brief receives only bounded authorized visual material. FIN, card serial, history, memory, meaning and hidden Thread state do not enter the image prompt.

## Public delivery

The public presentation API remains read-only and cloud-provider-neutral. Clients resolve generated media only through the Fibre media endpoint; they do not receive R2/S3/provider-native object keys.

Identity credentials add a defense-in-depth rule: immutable card visibility governs public identity-card/photo access. A `private` or `restricted` card cannot become publicly readable merely because a mutable catalog row is accidentally marked public. The read path also checks the immutable `officialPhotoMediaRef`, so mislabeling the media role in the catalog does not bypass the card boundary.

## Explicit negative boundary

The exact-key validator still rejects live-encounter ontology such as:

```text
encounter
dailyPlan
recentLivedContext
onMyMind
```

Identity-card work also does **not** introduce:

- FIN issuance/checksum/registry authority;
- birth publication changes;
- embodiment authority;
- generated-media evidence;
- browser cloud-storage access;
- synchronous media generation as a birth requirement.

## Scientific and causal status

Thread Presentation remains **Stored-only / presentation-only** for personhood-evidence purposes.

Presentation can preserve/render civil identity and authorized embodiment projections, but neither the packet nor the identity card changes cognition, judgment, relationships, resources, permissions or future possibility. Generated official photography remains representation.

Existing H-v2 candidate fixtures remain presentation engineering input only and cannot receive live civil identity through this contract or become #39 scientific evidence.

## Tests

The active suite covers the legacy packet boundary plus v0.2 identity credentials, including:

- FIN is consumed but no minting API exists;
- reissue preserves civil FIN while changing card credential identity;
- candidate presentations cannot acquire live civil identity;
- official ID photo is generated-reconstruction image media;
- visual authority is required before ID-photo demand is scheduled;
- pending demand is not duplicated;
- image briefs are administrative rather than glamour portraits and bound mild awkwardness safely;
- card reissue/snapshot changes do not change an unchanged embodiment's generation workflow input;
- private card/photo access fails closed against public catalog mistakes.
