# Thread Presentation

This directory is the capability-level home for Fibre machinery that turns already-authorized Thread and World truth into durable human-facing presentation.

Thread Presentation is **non-cognitive**. It must not invent, reinterpret, or privately reason about a Thread, and it must not become a second authority for identity, memory, history, meaning, relationships, or world state. The canonical presentation contract is defined by [`../../docs/architecture/world-presentation.md`](../../docs/architecture/world-presentation.md).

The cross-service newborn/publication flow is defined by [`../../docs/architecture/thread-birth-presentation-data-flow.md`](../../docs/architecture/thread-birth-presentation-data-flow.md).

## Public consumer seam

External applications and sibling services should import the provider-neutral presentation contract from:

```js
import { normalizeThreadPresentationBundle } from "./services/thread-presentation/src/index.mjs";
```

The packet normalizers and digests currently delegate to the implementation in `world-kernel` because that is where the authoritative projection rules already run. That is an implementation detail. New consumers must not import `world-kernel/src/thread-presentation-*.mjs` directly; keeping the service entry point stable lets the implementation move here later without changing consumers such as a Thread Presentation webapp.

Serialized packet/version constants are compatibility identifiers. They justify versioning wire data, not milestone/version runtime filenames.

## Public discovery/read API

The provider-neutral HTTP read API exposes public presentation only:

```text
GET /api/threads
GET /api/threads/:threadId/snapshot
GET /api/threads/:threadId/events
GET /api/threads/:threadId/stream
GET /api/assets/:objectRef
GET /api/threads/:threadId/media/:objectRef
```

`GET /api/threads` is intentionally a small discovery contract. It lists only explicitly public Thread presentations and returns the Thread ID, lifecycle status and current snapshot witness. It does not duplicate the presentation bundle. Consumers such as `insidefibre.com` discover a Thread through the collection route and then load that Thread's current snapshot through the Thread-scoped route.

Discovery uses ordered prefix listing from `InfraDriver.catalog` and fails closed when the current snapshot is absent, belongs to a different Thread, or immutable identity-card visibility forbids public presentation.

## Civil Registry projection

Thread Presentation consumes Fibre civil identity through the existing Civil Registry read authority; it does not mint or persist FINs.

The public seam exports:

```js
readPresentationCivilIdentity({ civilRegistry, threadId, provenanceRef })
civilRegistrationToPresentationCivilIdentity(registration, { provenanceRef })
```

`civilRegistry` is expected to implement the real registry reader contract:

```js
getCivilRegistrationByThreadId(threadId, { required: false })
```

The returned record is first validated by the canonical `normalizeFibreCivilRegistration()` domain function. That preserves Civil Registry authority for FIN checksum policy, deterministic registration identity, registry version/policy, and registration digest. Only then is a bounded `presentation.civilIdentity` projection emitted.

An unregistered Thread returns `null`. Presentation never synthesizes a FIN. A returned registration whose `threadId` differs from the requested Thread is rejected.

The public projection intentionally does not copy registry implementation fields such as `registrationDigest` or `finPolicyRef`; those remain validation/authority metadata in the Civil Registry record rather than becoming a second registry representation.

## Provider-neutral public asset resolution

Thread Presentation owns the provider-neutral resolver for presentation assets that have already crossed a semantic publication boundary.

The public seam exports:

```js
createPublicPresentationAssetResolver({ infra, presentationReader })
threadPresentationChannelId(threadId)
```

The resolver uses only:

```text
InfraDriver.catalog
InfraDriver.objects
PresentationReader.getSnapshot(channelId)
```

It does not know whether objects live in R2, S3, GCS, Azure Blob Storage, a local test driver, or a hybrid deployment. It resolves only stable Fibre `objectRef` identities.

Resolution fails closed unless the serving catalog record is explicitly public, the owning Thread presentation remains public, the current media slot still agrees with the publication record, identity-card visibility still permits the asset, and the immutable object digest agrees with the publication projection.

An immutable generated object or Asset Generator receipt alone is never sufficient to serve media publicly. Asset Generator produces bytes and provenance; Thread Presentation publication decides whether those bytes become presentation media.

The generic delivery path is:

```text
GET /api/assets/:objectRef
```

and the older Thread-scoped path remains a compatibility facade:

```text
GET /api/threads/:threadId/media/:objectRef
```

Both use the same resolver. Private/audience-scoped serving remains deferred until Fibre has an authenticated audience/principal boundary; private identity-card media therefore remains closed rather than receiving a provider-specific bearer URL.

See [`../../docs/architecture/presentation-asset-serving.md`](../../docs/architecture/presentation-asset-serving.md).

## Related services and deployments

- [`../birth-center/`](../birth-center/) owns Civil Registry issuance at birth; the immutable registry is read through World Kernel's `CivilRegistryStore`.
- [`../asset-generator/`](../asset-generator/) executes generated-media briefs and records immutable generation provenance.
- [`../content-credential-signer/`](../content-credential-signer/) defines the provider-neutral Content Credential signer service.
- [`../../integrations/content-credentials/`](../../integrations/content-credentials/) contains concrete Content Credential integrations.
- [`../../infra/deployments/thread-presentation/cloudflare/`](../../infra/deployments/thread-presentation/cloudflare/) is the current Cloudflare delivery/read-model deployment adapter.
- [`../../fixtures/thread-presentation/`](../../fixtures/thread-presentation/) contains reusable presentation fixtures.

Thread Presentation decides what already-authorized material may enter a presentation and what reconstruction is requested. Asset Generator only executes the exact admissible brief it receives. A generated image never becomes biographical evidence merely because it looks plausible or was generated successfully.

## Richness contract

A valid packet can still be thin. Tests here therefore treat richness as a semantic consumer contract: a Thread projection should remain temporally continuous, socially and geographically situated, internally cross-linked, selective about memory versus history, and grounded when it presents meanings. Those checks complement, rather than replace, authority and causal tests in World Kernel and Birth Center.

Deployment-specific executable composition belongs under `infra/deployments/`. Do not duplicate cognition, Thread state, memory, identity, meaning, or world authorization there.
