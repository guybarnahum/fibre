---
id: validation-thread-presentation-asset-provenance-state
status: accepted
last-reviewed: 2026-08-21
canonical: false
---

# Thread presentation generated-asset provenance — state and next plan

## Accepted decision

Generated Fibre assets must carry redundant provenance:

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

Both belong in the immutable full Fibre provenance record.

The embedded Content Credential defaults to `digest_only` and carries hashes of both. Exact prompt text may be embedded only under an explicit `public_text` disclosure policy after checking that the entire text is public-safe.

Provider-hidden prompt rewriting is not observable and must not be claimed as preserved.

## Current code state

Maintainer reported all existing Fibre validation green after the provider-neutral async asset-generation foundation.

Implemented:

- `AssetGenerationService` async scheduling;
- general `InfraDriver.workflows` capability with memory driver;
- immutable object storage path;
- generation receipts with job/provider/model/configuration lineage;
- named variants and immutable reference-object inputs;
- Thread Presentation asset planner;
- 11 eligible Cần Thơ still-image jobs;
- explicit deferral of portrait for missing embodiment brief;
- explicit deferral of audio/video execution;
- presentation `media.ready` / `media.unavailable` event adapter;
- active-suite test discovery for asset-generator tests.

Not yet implemented:

- immutable `GenerationRecord` as a separately digested pre-C2PA record;
- exact rendered provider request capture;
- `ContentCredentialSigner` abstraction;
- C2PA claim creation/signing/embedding/validation;
- prompt-disclosure-policy validator;
- post-embedding final asset hash and `StoredAssetReceipt`;
- publication gate requiring valid credential + both immutable provenance records;
- Cloudflare Workflows/R2 production driver pieces;
- first real image provider;
- public generated-asset serving endpoint;
- durable soft binding/fingerprint recovery.

## Required next implementation sequence

```text
A. provenance contracts
   GenerationRecord
   StoredAssetReceipt
   prompt disclosure policy

B. provider request witness
   MediaGenerationProvider returns/records exact provider-facing request witness
   secrets stripped before persistence

C. ContentCredentialSigner
   build manifest
   sign
   embed
   validate

D. execution pipeline change
   raw provider bytes
      -> providerOutputDigest
      -> GenerationRecord
      -> C2PA embed/sign
      -> finalAssetDigest
      -> immutable final object
      -> StoredAssetReceipt

E. publication gate
   only final credentialed asset may become media.ready

F. Cloudflare v1
   workflows -> Cloudflare Workflows
   objects -> R2
   signing key -> secret/key facility

G. first provider vertical proof
   one eligible Cần Thơ place reconstruction
   -> real generation
   -> C2PA embedded
   -> R2
   -> verified receipt
   -> media.ready
   -> insidefibre render
```

## Validation requirements for the next slice

Tests must prove at minimum:

- exact semantic brief survives in `GenerationRecord`;
- exact provider-facing request survives after secrets are removed;
- semantic-brief and provider-request digests differ when adapter compilation changes text;
- default C2PA mode contains digests but not exact prompt text;
- `public_text` embeds exact text only after explicit disclosure authorization;
- private/restricted prompt content cannot enter public C2PA by default;
- provider raw-output digest differs legally from the final post-C2PA asset digest;
- final asset verifies against its embedded Content Credential;
- final asset links to the exact immutable `GenerationRecord` digest;
- stripping or corrupting the embedded credential blocks publication from that file;
- deleting catalog metadata does not destroy the immutable provenance link;
- a C2PA-valid generated reconstruction remains non-evidence for Thread history/memory/embodiment.

## Capability status

| Capability | Status |
| --- | --- |
| Full Fibre prompt/provider-request retention | Accepted / next implementation |
| C2PA embedded provenance | Accepted / next implementation |
| Exact prompt text in public C2PA | Conditional by disclosure policy |
| Prompt digests in public C2PA | Accepted default |
| C2PA as sole provenance store | Rejected |
| Side receipt as sole provenance store | Rejected |
| Generated asset as Thread-life evidence | Rejected |
| Durable soft-binding recovery | Deferred |

## P3 relationship

This work is a prerequisite for calling the first real generated-media Cloudflare vertical slice complete, but it does not require changing `insidefibre.com`'s packet/reducer contract. The viewer continues to consume Fibre object/media references and presentation events; provenance embedding is produced and verified on the Fibre/backend side.
