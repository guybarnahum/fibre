---
id: architecture-presentation-asset-serving
status: proposed
last-reviewed: 2026-08-25
canonical: false
---

# Presentation asset serving

## Purpose

Define the provider-neutral boundary for resolving generated presentation assets after a Fibre presentation authority has accepted them for serving.

Asset generation, semantic publication and byte delivery remain separate:

```text
Asset Generator
    -> immutable object + provenance receipt

Thread Presentation publisher
    -> media.ready
    -> derived serving catalog projection

PublicPresentationAssetResolver
    -> verify current public presentation admission
    -> resolve immutable bytes through InfraDriver.objects

HTTP/deployment adapter
    -> GET /api/assets/:objectRef
```

The resolver is application code under `services/thread-presentation`. It contains no Cloudflare, R2, S3, Workers, AWS, GCP or Azure API dependency.

## Stable Fibre references

The public asset identifier is the Fibre `objectRef`.

Public consumers receive routes built from that logical identity:

```text
GET /api/assets/:objectRef
```

They do not receive:

```text
r2://...
s3://...
AWS ARNs
bucket keys
Cloudflare object URLs
provider generation URLs
```

Physical storage identity remains inside the selected `InfraDriver.objects` implementation.

## Resolution contract

The current public resolver requires:

```text
InfraDriver.catalog
InfraDriver.objects
PresentationReader.getSnapshot(channelId)
```

For the currently supported Thread Presentation media projection, resolution succeeds only when all of these remain true:

1. `media:<objectRef>` resolves to the expected `public_presentation_media` serving projection.
2. The serving projection is explicitly `publiclyVisible: true`.
3. The owning Thread presentation channel remains explicitly public.
4. The current Thread presentation snapshot still belongs to that Thread.
5. The current media packet still contains the same `mediaId` with the same role.
6. Identity-credential media remains allowed by the current identity card and its immutable `officialPhotoMediaRef`/visibility contract.
7. `InfraDriver.objects` still contains the immutable Fibre object under the same `objectRef` and digest.

Failure of an admission/visibility condition returns no public resolution. A published catalog/object digest disagreement is an integrity failure rather than a best-effort response.

## Authority boundary

The serving catalog is derived operational state. It is populated by the Thread Presentation publisher only after semantic `media.ready` admission.

An Asset Generator receipt, completed Workflow, completion Queue message, immutable object, or guessed objectRef does not by itself make an asset public.

The resolver never interprets generated media as identity, history, memory, meaning, embodiment or World evidence. It serves bytes that another Fibre domain has already admitted for presentation.

## Routes

The deployment-facing generic route is:

```text
GET /api/assets/:objectRef
```

The existing route remains a compatibility facade:

```text
GET /api/threads/:threadId/media/:objectRef
```

Both use the same provider-neutral resolver. The compatibility route supplies `expectedThreadId`, so it cannot be used to retrieve another Thread's asset by presenting a mismatched Thread path.

The generic route is exercised by the generated-media P3 proof. The Thread-specific route remains covered as a compatibility contract.

## Public versus private audience

This first serving contract resolves **public presentation assets only**.

Private/audience-scoped asset delivery is deliberately deferred until Fibre has an accepted authentication/audience principal boundary. The current implementation must fail closed for private identity-card media rather than invent a bearer URL, storage URL or deployment-specific authorization convention.

A future audience-aware resolver may extend the request context with an authenticated Fibre audience/principal and authorization decision, but it must continue to resolve bytes through stable Fibre object references and `InfraDriver` capabilities.

## Future entity kinds

The current serving projection is Thread Presentation media because Thread Presentation is the first publisher with generated media.

World/Experience or other presentation publishers may later add their own publication records. They should extend the provider-neutral resolution contract rather than adding cloud-specific object endpoints or bypassing Fibre publication authority.

## Provider portability

Deployment adapters translate the same resolution result into their transport:

```text
Cloudflare Worker -> Response
AWS runtime       -> HTTP response / streaming body
GCP runtime       -> HTTP response / streaming body
Azure runtime     -> HTTP response / streaming body
```

Changing the runtime or object-store provider must not change:

- `objectRef`;
- publication/visibility semantics;
- provenance classification;
- digest checks; or
- the meaning of the generic Fibre asset route.

This follows ADR-0019: services do not choose their cloud; deployment composition selects the runtime and `InfraDriver` implementation.
