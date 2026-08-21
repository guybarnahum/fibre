---
id: architecture-asset-generation-service-v0-1
status: proposed
last-reviewed: 2026-08-21
canonical: false
---

# Fibre asset generation service v0.1

## Purpose

Define a provider-neutral asynchronous service for generating presentation and other derived assets without making media-generation machinery part of Thread authority or part of a cloud-specific application contract.

Thread Presentation is the first caller. The service itself is general Fibre backend application infrastructure.

```text
application-domain projection
  Thread Presentation today
  other Fibre domains later
        |
        v
admissible AssetGenerationJob
        |
        v
AssetGenerationService
        |
        +--> InfraDriver.workflows
        |       durable asynchronous execution
        |
        +--> MediaGenerationProvider
        |       OpenAI / Google / Workers AI / other adapter
        |
        `--> InfraDriver.objects
                immutable media bytes
                immutable generation receipt
```

`InfraDriver` owns infrastructure guarantees. `MediaGenerationProvider` owns provider-specific generation behavior. The calling application domain owns the semantic decision that a particular asset may be generated and how the result may be presented.

## Why this is separate

Asset generation must not leak provider or orchestration concerns into `insidefibre.com`, `PresentationServer`, `WorldStore`, or a cloud driver. It needs:

- asynchronous and potentially long-running execution;
- retry/provider-failure handling;
- provider/model replacement;
- immutable output storage;
- generation provenance;
- deterministic job identity and deduplication;
- variants/candidate outputs;
- optional immutable reference assets for conditioning;
- image/audio/video evolution;
- content and authority restrictions;
- eventual review/approval workflows.

Provider calls therefore never run on the user-facing presentation request path.

## `AssetGenerationJob`

A job is a versioned, idempotent request to generate one asset:

```text
jobVersion
jobId
assetKind              image | audio | video
role                   caller-defined role
variant                named output/candidate variant
brief
  description
  constraints[]
inputReferences[]       semantic/source refs supplied by caller
referenceObjectRefs[]  immutable Fibre objects used as provider conditioning
outputObjectRef
receiptObjectRef
requestedAt
providerProfile         Fibre generation policy/profile
context                 opaque JSON owned by caller
```

`jobId` must be stable for the same semantic generation request. Reusing the same workflow instance ID with different input is a conflict.

`variant` allows multiple deliberate candidates without changing media-slot identity. `referenceObjectRefs` keeps identity-consistency, approved-reference, storyboard, and poster-to-video paths open without exposing cloud-native locators.

A reference object is generation input only. Its presence does not make it identity, embodiment, historical, memory, or meaning authority.

`providerProfile` names a Fibre profile, not a hard-coded cloud product/model. The receipt records the actual provider, model, request identifier, and configuration used.

## `AssetGenerationReceipt`

A completed workflow persists an immutable receipt independently of workflow execution retention.

Every receipt embeds the complete normalized `AssetGenerationJob`. This is required because operational workflow history must not be the only record of what prompt/constraints/references caused an asset.

Ready receipt:

```text
receiptVersion
jobId
job                     complete normalized job
status: ready
assetKind / role
objectRef
sha256
mediaType
width / height / duration
completedAt
generation
  provider
  model
  providerRequestId
  generatedAt
  configuration         exact material provider settings returned by adapter
inputReferences[]
context
unavailableReason: null
```

Unavailable receipt contains the same complete job but no fabricated media object or generation record, and records a terminal reason.

The receipt is the durable generation-provenance record. Workflow status is operational state.

## Provider boundary

`MediaGenerationProvider` is intentionally outside `InfraDriver`:

```text
InfraDriver
  Cloudflare / AWS / GCP / Azure

MediaGenerationProvider
  OpenAI / Google / Workers AI / other media provider
```

The v0.1 provider receives:

```text
assetKind
role
variant
brief
inputReferences
referenceObjects[]      resolved immutable object bytes + metadata
providerProfile
context
```

and returns bytes plus actual provider/model/request/configuration metadata.

This synchronous provider adapter is sufficient for the first still-image execution inside a durable workflow. Audio/video providers may later require submit/poll semantics. v0.1 does not make synchronous still generation a permanent constraint.

Provider credentials are provider secrets, not InfraDriver credentials.

## Thread Presentation adapter

Thread Presentation owns the first planner:

```text
ThreadPresentationPacket
ThreadMediaPacket
PresentationProvenance
        |
        v
ThreadPresentationAssetPlanner
        |
        +--> eligible AssetGenerationJobs
        `--> explicit deferred slots
```

The planner may use only presentation material admissible for the slot. It must not query hidden Thread state merely to make richer media.

### P2 Cần Thơ eligibility

The current golden Cần Thơ packet yields:

```text
11 still-image jobs
  5 place reconstructions
  6 memory reconstructions

3 deferred slots
  primary portrait -> deferred_missing_embodiment_brief
  primary voice    -> deferred_non_image_asset
  life film        -> deferred_non_image_asset
```

Current jobs use `variant: default` and `referenceObjectRefs: []`.

The primary portrait is deferred because #39 did not establish an authoritative or approved embodiment brief for this candidate. The planner must not solve that absence by asking a model to invent a canonical face.

## Reconstruction briefs

Place briefs state that output is generated reconstruction, not documentary evidence, and use only published place presentation text as factual grounding.

Memory briefs preserve:

```text
historical event != autobiographical memory != generated reconstruction
```

They use remembered content and explicit uncertainty. Uncertainty cannot become precise visual fact merely because an image model wants detail. When embodiment is absent, a memory reconstruction must not establish a canonical facial likeness.

Remembered meaning is not automatically visual fact and is not used merely to make a scene more narratively coherent.

## Execution flow

```text
1. caller validates its source packet/projection
2. caller creates deterministic AssetGenerationJob
3. AssetGenerationService starts InfraDriver workflow instance
4. request path returns; no media generation occurs inline
5. workflow resolves approved referenceObjectRefs through InfraDriver.objects
6. workflow invokes MediaGenerationProvider
7. retryable provider/runtime failure remains workflow failure/retry
8. successful bytes are SHA-256 addressed and written immutably
9. immutable receipt containing the complete job + actual generation metadata is written
10. calling domain validates/consumes the receipt
11. calling domain publishes its own semantic update
```

For Thread Presentation, step 11 becomes a legal `media.ready` or `media.unavailable` presentation event. The presentation adapter validates the complete receipt before emitting an event. AssetGenerationService itself does not author presentation semantics.

A later presentation snapshot may incorporate the receipt into a new `ThreadMediaPacket`. The original snapshot is never rewritten in place.

## Cloudflare v1 mapping

First deployment:

```text
InfraDriver.workflows  -> Cloudflare Workflows
InfraDriver.objects    -> R2
optional fan-out       -> Cloudflare Queues
provider adapter       -> provider binding/API independently of InfraDriver
```

Cloudflare Workflows is suitable because image generation can become multi-step/retryable and later voice/video may require waits, polling, approval, or transforms. Queues may provide fan-out/backpressure but are not semantic provenance.

Cloudflare workflow IDs, R2 keys, binding names, account IDs, and deployment credentials must not leak into Thread or presentation semantic contracts. Fibre object refs remain stable application identities and the driver maps them to provider resources.

## Storage and publication

Generated bytes are immutable. Regeneration or another candidate uses a new deterministic job/output identity rather than overwrite.

The receipt is also immutable and preserves:

- complete normalized job and brief;
- source/input references;
- immutable conditioning/reference-object identities;
- named variant;
- provider profile requested;
- actual provider/model/request/configuration;
- generation time;
- output byte digest;
- caller context;
- terminal unavailable reason where applicable.

The public viewer receives Fibre/application object references or serving URLs minted by the presentation service, never an `r2://` or provider-native identifier.

## Authority boundary

Generated media:

- does not become historical evidence;
- does not become autobiographical memory;
- does not become remembered meaning;
- does not become embodiment authority merely because a portrait looks plausible;
- does not feed back into Thread cognition as evidence through this path;
- may be deleted/replaced without rewriting Thread life.

For H-v2 candidates, all generated media remains `generated_reconstruction` inside an explicit fixture boundary.

This service proves asynchronous generation, provenance, immutable storage, and publication plumbing. It does not prove autonomous life, embodiment, identity, memory, or personhood causality.

## Failure semantics

Distinguish:

```text
retryable operational/provider failure
  -> workflow retries; no terminal unavailable receipt yet

terminal unsupported capability / policy refusal / invalid admissible brief
  -> unavailable receipt; no fabricated media object

successful generation
  -> immutable bytes + ready receipt
```

Do not convert a transient outage into permanent `unavailable`, and do not retry deterministic policy refusal indefinitely. The exact provider-error taxonomy remains deferred until the first real provider adapter.

## Portability/conformance requirements

Every production InfraDriver used here must prove:

- workflow start is idempotent for identical ID/input;
- conflicting ID reuse fails closed;
- workflow input is JSON/replay safe;
- immutable objects cannot be silently overwritten;
- stored digest identifies persisted bytes;
- no provider-native resource ID becomes a Fibre semantic identity.

Every MediaGenerationProvider adapter must prove:

- it receives only the approved brief/references;
- immutable reference objects are resolved explicitly rather than guessed from locators;
- actual provider/model/configuration metadata is returned;
- binary output has a declared media type;
- unsupported asset kinds fail without fabricated output;
- provider response metadata cannot silently become Thread evidence.

## Current implementation status

Implemented on `agent/thread-presentation-milestones-v1`:

- general `InfraDriver.workflows.start/get` contract;
- in-memory workflow implementation and conflict semantics;
- `AssetGenerationJob` / `AssetGenerationReceipt` contracts;
- complete job preservation in immutable receipts;
- variants and immutable reference-object inputs;
- `MediaGenerationProvider` v0.1 contract;
- generic scheduling and workflow execution helper;
- immutable media + immutable receipt storage;
- provider/model/configuration provenance;
- Cần Thơ presentation asset planner;
- validated `media.ready` / `media.unavailable` receipt-to-event adapter;
- active tests for request-path asynchrony, immutable outputs/references, provenance, unsupported capability, packet-grounded planning, deterministic IDs, and event legality.

Not yet implemented:

- Cloudflare `workflows` driver;
- Cloudflare R2 `objects` driver;
- a real image-generation provider adapter;
- terminal-vs-retryable provider error taxonomy;
- public generated-asset serving endpoint;
- approved embodiment reconstruction brief / portrait generation;
- audio/video execution;
- automatic publication of a new media snapshot after receipt completion.

Those are the next implementation steps; their absence must not be described as completed media generation.
