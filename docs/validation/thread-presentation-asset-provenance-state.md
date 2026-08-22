---
id: validation-thread-presentation-asset-provenance-state
status: accepted
last-reviewed: 2026-08-21
canonical: false
---

# Thread presentation generated-asset provenance — current state

## Accepted decision

Generated Fibre assets carry redundant provenance:

```text
final asset
  -> embedded signed C2PA / Content Credential

Fibre object store
  -> immutable full GenerationRecord
  -> immutable StoredAssetReceipt

catalog/index
  -> replaceable lookup metadata
```

See [`../decisions/ADR-0014-generated-asset-provenance.md`](../decisions/ADR-0014-generated-asset-provenance.md) and [`../architecture/generated-asset-provenance-and-content-credentials-v1.md`](../architecture/generated-asset-provenance-and-content-credentials-v1.md).

## Prompt retention policy

Fibre retains two distinct textual witnesses:

1. **semantic brief / seed text** — the Fibre-owned description and constraints supplied by the calling adapter;
2. **exact provider prompt/request** — the provider-facing input after adapter compilation/transformation.

Both live in the immutable full Fibre provenance record.

The embedded Content Credential defaults to `digest_only` and carries hashes of both. Exact prompt text may be embedded only under an explicit `public_text` disclosure policy after checking that the entire text is public-safe.

Provider-hidden prompt rewriting is not observable and must not be claimed as preserved.

## Current code state

Maintainer validation was green through the provider-neutral async asset-generation foundation and the local Cloudflare snapshot/replay/WebSocket runtime. The branch now additionally implements the blocking final-P3 generated-media path and awaits maintainer execution of that real-provider proof.

Implemented:

- `AssetGenerationService` async scheduling through `InfraDriver.workflows`;
- general `InfraDriver` memory driver and `cloudflare-v1` implementation;
- Cloudflare R2 immutable object port;
- Cloudflare Workflows adapter with durable job-input/start witnesses;
- per-channel SQLite Durable Object ordered stream and WebSocket Hibernation path;
- D1 catalog/public-serving projection;
- immutable `GenerationRecord` before credential embedding;
- exact semantic brief and exact provider-request witness retention;
- witnessed media-provider v0.2 contract with secrets-removed invariant;
- prompt-disclosure-policy validator (`digest_only` / authorized `public_text`);
- `ContentCredentialSigner` adapter contract;
- post-embedding final asset digest and immutable `StoredAssetReceipt`;
- publication gate that re-verifies stored asset + GenerationRecord + credential before `media.ready`;
- guarded generated-media serving endpoint with no generic R2 read path;
- Thread Presentation asset planner with 11 eligible Cần Thơ still-image jobs;
- explicit portrait deferral for missing embodiment brief;
- explicit audio/video deferral;
- OpenAI image-provider adapter pinned to `gpt-image-2-2026-04-21` for the P3 proof;
- exact OpenAI request witness without authorization secret;
- local-only actual C2PA Node sidecar using official `@contentauth/c2pa-node`;
- C2PA custom Fibre assertion and `trainedAlgorithmicMedia` creation intent;
- Cloudflare `P3AssetGenerationWorkflow` that generates, credentials, stores, verifies, and publishes one asset asynchronously;
- final proof harness for `media_place_market`;
- insidefibre viewer support for Fibre HTTP/WebSocket snapshot + stream and `media.ready` overlays.

## Final P3 proof now pending maintainer execution

See [`thread-presentation-p3-final-proof.md`](thread-presentation-p3-final-proof.md).

The blocking runtime sequence is:

```text
Cần Thơ market presentation text
   -> OpenAI GPT Image 2
   -> raw provider bytes
   -> providerOutputDigest
   -> immutable GenerationRecord
   -> real C2PA embed/sign/verify
   -> finalAssetDigest
   -> immutable final R2 object
   -> immutable StoredAssetReceipt
   -> credential re-verification
   -> media.ready sequence 1
   -> guarded public media projection
   -> insidefibre render
```

Until that maintainer run succeeds, this state must not be described as an earned end-to-end generated-media capability.

## Local C2PA proof boundary

The official Node C2PA SDK supports buffer signing and validation. Cloudflare-native byte-oriented verification is not yet available through the upstream browser/WASM API used for non-Node runtimes. The P3 proof therefore runs the real C2PA SDK in an isolated local Node sidecar behind `ContentCredentialSigner`.

That sidecar proves:

- actual C2PA embedding into final image bytes;
- actual SDK re-reading/validation of the embedded manifest;
- preservation of the Fibre custom assertion;
- public `digest_only` prompt policy.

Its short-lived self-signed development certificate is **not production trust evidence**. Production credential trust/KMS/HSM/service-binding design remains later deployment work and does not change the Fibre provenance contracts.

## Still deferred after P3

- production/staging Cloudflare resource provisioning and IDs;
- production C2PA signing trust/key custody;
- Cloudflare-native C2PA byte verification when upstream-supported;
- durable soft-binding/fingerprint recovery after metadata stripping;
- bulk generation of the remaining eligible Cần Thơ stills;
- visual embodiment reconstruction brief and portrait generation;
- image-edit/reference-image provider profile;
- voice/video execution;
- automatic compaction of ready media overlays into a newly published `ThreadMediaPacket` snapshot;
- general public interaction/message ingress.

## Capability status

| Capability | Status |
| --- | --- |
| Full Fibre semantic-brief retention | Implemented / maintainer-tested foundation |
| Exact provider-request retention | Implemented / final P3 proof pending |
| Prompt digests in public C2PA | Implemented default / final P3 proof pending |
| Exact prompt text in public C2PA | Conditional by disclosure policy |
| C2PA embedded provenance contract | Implemented |
| Actual C2PA Node adapter | Implemented local proof / final P3 proof pending |
| Production C2PA trust | Deferred |
| Cloudflare async asset Workflow | Implemented local runtime / final P3 proof pending |
| OpenAI GPT Image 2 adapter | Implemented / real call pending final P3 proof |
| C2PA as sole provenance store | Rejected |
| Side receipt as sole provenance store | Rejected |
| Generated asset as Thread-life evidence | Rejected |
| Durable soft-binding recovery | Deferred |

## P3 relationship

This is the last backend/media proof required before P4. It does not create new Thread authority or live-life ontology. `insidefibre.com` consumes Fibre's snapshot/event/media protocol and applies media availability as a reducer overlay; the underlying presentation snapshot remains immutable.
