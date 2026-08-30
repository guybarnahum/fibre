---
id: architecture-thread-birth-presentation-data-flow
status: accepted
last-reviewed: 2026-08-30
canonical: true
---

# Thread birth → presentation → public discovery data flow

## Purpose

This document defines the cross-service data flow that turns an admitted Genesis candidate into a registered Fibre citizen with a public Thread Presentation and generated presentation media consumable by `insidefibre.com`.

The flow preserves one authority rule throughout:

> Birth establishes that a Thread exists. Thread/World authorities establish who that Thread is and what has happened. Thread Presentation decides what may be shown. Asset Generator only executes bounded media-generation jobs. `insidefibre.com` only renders public presentation contracts.

No presentation or generated-media system may become a second authority for identity, history, memory, embodiment, relationships, meaning, or World state.

Canonical visual identity follows [`canonical-visual-identity.md`](canonical-visual-identity.md) and [`ADR-0021`](../decisions/ADR-0021-canonical-visual-identity-reference.md). The canonical root reference is identity-supporting Embodiment material; ordinary presentation images remain derived media.

## Service responsibilities

```text
Birth Center
  prospective Genesis state
  Civil Registry / FIN preparation
  birth bundle construction

World Kernel
  authoritative birth commit
  live Thread / World state
  authoritative embodiment and other Thread state
  canonical visual-root admission

Thread Presentation
  public/non-public projection
  presentation snapshot and event stream
  media-slot planning
  asset demand
  acceptance/publication of completed assets
  public discovery/read API

Asset Generator
  provider-neutral asynchronous media generation
  immutable generation provenance
  Content Credential embedding/verification
  immutable final asset + receipt

Content Credential Signer
  concrete signing/verification capability selected by deployment

insidefibre.com
  public presentation consumer only
```

## Current implemented birth publication boundary

The minimum Genesis-to-public-presentation transport is executable and covered end to end.

The local World Kernel deployment selects the concrete SQLite state provider at the deployment edge and binds the authoritative Genesis publication stores to one provider-neutral World state scope:

```text
local deployment composition
  -> createSqliteStateInfraDriver(...)
  -> { infraDriver, stateScopeId: "world" }
       -> World store
       -> GenesisStore
       -> CivilRegistryStore
       -> GenesisPresentationOutboxStore
```

The Genesis schema owns the presentation-outbox trigger. A successful published Genesis manifest therefore commits its presentation outbox row in the same authoritative database transaction as the birth publication. Presentation transport is not allowed to manufacture a missing birth or FIN after the fact.

The durable post-commit path is:

```text
published Genesis transaction
  -> pending genesis_presentation_outbox row
  -> authoritative Thread + Civil Registration read
  -> canonical newborn presentation projection
  -> private Thread Presentation write API
  -> persisted Thread Presentation snapshot/catalog
  -> outbox marked delivered
```

Failure after the authoritative birth commit leaves the outbox pending/failed and retryable. Retrying converges on the same deterministic projection and the private Thread Presentation write boundary is idempotent for exact replay.

This path is covered by an E2E test that performs only the authoritative `publishBirth(...)` operation and then observes the resulting Thread through the public Thread Presentation read/discovery APIs.

## End-to-end newborn flow

```text
Genesis candidate admitted
        |
        v
Birth Center prepares birth bundle
        |
        +--> Civil Registry prepares permanent FIN registration
        |
        v
World Kernel commits authoritative birth
        |
        +--> Thread exists in live Fibre state
        +--> civil registration is durable
        +--> Genesis presentation outbox is durable in the same commit
        +--> rich life authorities remain authoritative/private according to their own visibility
        |
        v
Post-commit presentation delivery
        |
        +--> reads authoritative Thread + FIN
        +--> creates deterministic newborn public projection
        +--> retries durably if Thread Presentation is unavailable
        |
        v
Thread Presentation persists pre-embodiment authorized projection
        |
        +--> public/private presentation manifest
        +--> civil identity projection
        +--> explicit public Thread identity context
        +--> no fabricated visual identity
        +--> no official image until canonical visual reference exists
        |
        v
Canonical visual identity lifecycle
        |
        +--> rich authoritative visual-identity text
        +--> one canonical root-reference generation/admission
        +--> normalized synthetic reference age 25
        +--> available public Embodiment carries canonical reference object
        |
        v
Thread Presentation visual-identity rewrite
        |
        +--> bounded authorized visual identity projection
        +--> identity card metadata
        +--> official_id_photo placeholder
        |
        v
Thread Presentation publishes current snapshot
        |
        +--> catalog record `presentation:<threadId>`
        |
        +--> missing eligible media slots become PresentationAssetDemand
                  |
                  +--> Thread-depicting jobs carry canonical reference + target age/context
                  |
                  v
            AssetGenerationJob
                  |
                  v
            Asset Generator Workflow
                  |
            selected image integration
                  |
            raw bytes staged immutably
                  |
            GenerationRecord
                  |
            Content Credential embed + verify
                  |
            immutable final asset
                  |
            StoredAssetReceipt
                  |
            AssetGenerationCompletion
                  |
                  v
Thread Presentation completion consumer
        |
        +--> loads and verifies receipt
        +--> verifies current Thread/media-slot binding
        +--> verifies identity-card visibility for official photo
        +--> emits `media.ready`
        +--> writes public-media catalog projection when allowed
        |
        v
Public Thread Presentation API
        |
        +--> GET /api/threads
        +--> GET /api/threads/:threadId/snapshot
        +--> GET /api/threads/:threadId/events
        +--> GET /api/threads/:threadId/stream
        +--> GET /api/assets/:objectRef
        |
        v
insidefibre.com
```

## Newborn public semantic projection

A Thread snapshot is not a biography document. Current Genesis intentionally starts from a bounded Thread seed while publishing prior-life episodes, autobiographical memories, situated relationships/places, lineage, and genome through their own authoritative records.

Those authorities must not be flattened back into the Thread snapshot merely to make presentation convenient.

The first public newborn projection currently permits only facts explicitly carried on the authoritative Thread identity plus the Civil Registration:

```text
Thread identity
  name
  selfDescription
  birthDate?          -> subject when present
  languages?          -> subject when present
  birthCity?          -> public place when present
  currentWorkCity?    -> public place when present
  culture?            -> public origin/context claims when present

Civil Registration
  registrationId / FIN / birthEventRef / worldRef
```

The projector deliberately does **not** publish:

```text
genome.textualTraits
runtime baselines
current needs / feelings / self-model / intentions
opaque relationshipRefs
opaque memoryRefs
legacy portraitRef / voiceRef
private Genesis autobiographical memories
private Genesis life relations
private Genesis place episodes
```

Genesis currently creates its autobiographical-memory, situated-life relationship, and situated-life place records with private visibility. Their existence makes the Thread richly grounded; it does not make those records public. A later presentation-semantic slice may project them only through an explicit authorization/visibility rule and with provenance preserved.

This is intentional separation of concerns:

> **identity is authoritative; presentation is projection; publication is a permission decision.**

## Birth and Civil Registry ordering

The Fibre Identity Number (FIN) is permanent civil identity. Birth Center prepares a registration for the admitted birth bundle; World Kernel persists the registration as part of the authoritative birth publication boundary.

An identity card and official photograph are derived presentation credentials. They do not create the Thread and cannot change the FIN.

Birth must not depend on an image provider being available. A Thread can be born and registered while canonical visual identity remains pending and presentation media remains `missing` or `deferred`.

## Canonical visual identity before derived portraits

Asset Generator must never invent canonical appearance from arbitrary Thread material such as name, culture, memories, generic biography prose, legacy `portraitRef`, or ordinary presentation imagery.

The accepted appearance authority is the **canonical visual identity specification** in Embodiment. For native/de-novo/inherited Fibre identity, that specification is deliberately rich natural-language visual phenotype and is used to generate one canonical reference image with no prior image reference. The synthetic reference-age normalization is 25.

For Thread-parent children, the child's canonical visual identity text may be created by provenance-bearing recombination of parental visual phenotype text loci plus explicit mutation witnesses. Parent pixels are not blended and parent images are not references for the child's root generation.

Echo/Homage is the explicit source-grounded exception. Authorized sponsor/homage source imagery may participate in creation of the transformed Fibre root under the accepted consent/source-rights rules. Once admitted, later generation uses the resulting Fibre root reference rather than repeatedly consulting the original sponsor/homage source.

The authority sequence is:

```text
rich canonical visual identity text/origin provenance
  -> canonical root image generation
  -> immutable generation proof
  -> World/Embodiment admission
  -> canonical referenceObjectRef
  -> authorized visual-identity projection
```

A pending text-only embodiment is not yet a usable public visual reference.

For an `official_id_photo`, Thread Presentation may create an asset-generation brief only when an authorized visual-identity projection with the admitted canonical reference exists. The job carries that reference image plus the chronology-grounded target age and bounded authorized identity semantics. If the reference is absent, or the selected provider cannot honor reference conditioning, the slot remains deferred or another explicitly configured provider profile is selected.

Age is not identity. The canonical root remains stable while later imagery renders the same recognizable person at the required target age. Ordinary aging, hairstyle, clothing, expression, weight change or styling must not replace the root.

The same reference rule applies to autobiographical-memory or life-scene imagery when the Thread is depicted. Place-only/environmental images remain reference-free.

Generated official photographs and memory reconstructions remain derived presentation media. They are not embodiment evidence and do not rewrite identity.

The current media lifecycle is therefore:

```text
canonical identity text
  -> canonical root reference
  -> Embodiment admission
  -> authorized visual-identity projection
  -> Thread Presentation rewrite
  -> identity-card / official-photo media demand
  -> reference + target-age conditioned Asset Generation
  -> signed immutable completion receipt
  -> Thread Presentation acceptance
  -> presentation rewrite with official media
```

Legacy portrait or voice references must never bootstrap canonical embodiment.

The detailed invariant and origin-specific rules are canonical in [`canonical-visual-identity.md`](canonical-visual-identity.md) and ADR-0021.

## Asset generation boundary

Thread Presentation owns ordinary derived-media generation intent:

```text
presentation bundle
  -> media slot
  -> bounded generation brief
  -> PresentationAssetDemand
  -> AssetGenerationJob
```

Canonical visual-root generation is exceptional because the resulting generated asset is only a candidate until World/Embodiment explicitly admits it. Asset Generator still does not own the identity decision.

Asset Generator owns execution and provenance:

```text
job
  -> provider operation / generation attempt
  -> staged provider bytes
  -> GenerationRecord
  -> Content Credential
  -> final immutable object
  -> StoredAssetReceipt
  -> AssetGenerationCompletion
```

Asset Generator does not emit `media.ready` and does not decide public visibility.

Thread Presentation alone accepts an ordinary completed presentation receipt into the Thread's presentation stream after verifying that the receipt still matches the current Thread/media slot and publication policy. Canonical root completion instead returns through the World/Embodiment admission path before presentation can project visual identity.

## Public Thread discovery

Thread Presentation exposes a minimal public collection endpoint:

```text
GET /api/threads
```

Optional query parameters:

```text
limit   1..200, default 50
cursor  opaque catalog cursor returned by the previous page
```

Response shape:

```json
{
  "threads": [
    {
      "threadId": "thr_...",
      "lifecycleStatus": "active",
      "snapshotVersion": "...",
      "snapshotDigest": "sha256:..."
    }
  ],
  "nextCursor": null
}
```

Discovery is intentionally not a duplicate Thread summary. It answers only which Thread presentations are publicly discoverable and gives the current public snapshot witness. A consumer then requests:

```text
GET /api/threads/:threadId/snapshot
```

Thread discovery is derived from `presentation:` catalog entries. Media catalog entries are excluded. A catalog record is insufficient by itself: Thread Presentation also verifies that a current snapshot exists for the same Thread and that immutable identity-card visibility permits public presentation.

`insidefibre.com` must never query World Kernel, Civil Registry storage, R2/D1 directly, or Fibre implementation files to discover inhabitants.

## Local service topology

The canonical local development ports are deliberately non-overlapping:

```text
127.0.0.1:8787  World Kernel
127.0.0.1:8788  Thread Presentation + Asset Generator Cloudflare local stack
127.0.0.1:8790  Birth Center
127.0.0.1:8791  Content Credential Signer
localhost:5173   insidefibre.com Vite development site
```

Run the Fibre processes in separate terminals from the Fibre repository root:

```bash
npm run world-kernel
```

```bash
npm run birth-center
```

```bash
npm run content-credential-signer
```

```bash
npm run dev:asset-stack:cloudflare
```

Then run `insidefibre.com` separately from its repository:

```bash
npm run dev
```

The Cloudflare local presentation deployment allows `http://localhost:5173` as the viewer origin and points its local Content Credential integration at `http://127.0.0.1:8791`.

The local World Kernel is in an incremental persistence migration. GenesisStore, CivilRegistryStore, GenesisPresentationOutboxStore, and the World store are already composed against shared provider-neutral World state while several older semantic/runtime stores still receive the legacy database path. Concrete SQLite selection remains deployment composition, not service-domain policy; remaining stores should migrate behind the same state capability incrementally rather than through a parallel persistence architecture.

## Following one Thread through the flow

The durable correlation spine already exists in Fibre data. For a single Thread, useful identifiers include:

```text
threadId
  genesisId
  registrationId / FIN
  birthEventRef
  embodimentId / embodimentRevision
  canonicalReferenceObjectRef
  channelId = presentation:<threadId>
  presentationId
  mediaId
  demandId
  jobId
  receiptObjectRef / receiptDigest
  presentation eventId / sequence
```

When examining one flow, start with `threadId` and follow the durable IDs outward. These IDs are semantic/operational witnesses and survive retries better than an ephemeral request trace.

## Current observability state

Fibre does **not yet have a global cross-service Thread log**.

Current behavior is fragmented but useful:

- local Node deployments emit process logs to stdout/stderr;
- World Kernel already emits structured JSON for startup and request failures;
- Birth Center emits structured JSON lifecycle logs;
- Content Credential Signer emits structured JSON lifecycle logs;
- Cloudflare deployments enable Worker observability and emit selected structured JSON failure events;
- `InfraDriver` reserves a `telemetry` capability, but there is not yet an executable portable telemetry port/provider or a shared Fibre flow-event envelope.

Therefore today a developer can follow durable state and per-service logs, but cannot issue one query such as `threadId = thr_...` against a Fibre-owned global trace and see the complete cross-service path.

## Target Thread Flow Trace

The next observability slice should define a non-authoritative structured telemetry event such as:

```text
schema        fibre-flow-event
occurredAt
level
service
operation
event
threadId?        primary Thread correlation key
genesisId?
registrationId?
embodimentId?
canonicalReferenceObjectRef?
channelId?
demandId?
jobId?
receiptObjectRef?
presentationEventId?
requestId?       local transport/request correlation only
attempt?         workflow/provider attempt where relevant
outcome
```

Rules:

1. `threadId` is the primary cross-service filter whenever the operation is Thread-scoped.
2. Existing durable Fibre IDs are preferred over inventing a new semantic `traceId` and threading it through domain records.
3. Asset Generator may log `threadId` only when its bounded job context already contains it; it must not gain Thread authority merely for observability.
4. Telemetry is operational evidence only. It must never drive Thread state, publication, retries, identity, memory, or cognition.
5. Services emit through an injected telemetry boundary; deployments choose the sink.
6. Local development should support JSONL/stdout aggregation; remote deployments should support a central queryable sink without changing service code.
7. Secret values, prompts not authorized for disclosure, private memory text, provider credentials, and private presentation data must not be copied into flow logs.

A future developer command should be able to provide a Thread ID and show the ordered cross-service flow, for example:

```text
fibre trace thr_...
```

That tool should query telemetry/read models; it must not reconstruct hidden cognition from arbitrary database inspection.

## Consumer rule for insidefibre.com

The public website consumes only Thread Presentation:

```text
GET /api/threads
        -> choose/display discoverable inhabitants

GET /api/threads/:threadId/snapshot
        -> render current public presentation

GET /api/assets/:objectRef
        -> render publication-authorized immutable media

GET /api/threads/:threadId/events
or /stream
        -> follow authorized public presentation changes
```

The website may cache/render those contracts but may not become an authority for Thread state. If a Thread disappears from public discovery or its snapshot/media becomes non-public, the website must respect the Thread Presentation response rather than preserve a copied public identity indefinitely.
