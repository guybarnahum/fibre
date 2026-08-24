---
id: architecture-generated-asset-provenance-content-credentials-v1
status: accepted
last-reviewed: 2026-08-21
canonical: false
---

# Generated asset provenance and Content Credentials v1

## Purpose

Define how Fibre generated media survives copying, storage loss, provider replacement, and infrastructure migration without confusing representation provenance with Thread-life authority.

This architecture implements the decision in [`../decisions/ADR-0014-generated-asset-provenance.md`](../decisions/ADR-0014-generated-asset-provenance.md).

The central rule is:

> **Full reproducibility provenance lives in Fibre; a public-safe signed survival capsule travels with the asset. Neither makes the generated representation Thread-life evidence.**

## Provenance layers

```text
Layer 1 — final credentialed asset
  embedded C2PA / Content Credentials manifest
  portable outside Fibre

Layer 2 — immutable Fibre GenerationRecord + StoredAssetReceipt
  complete generation lineage and exact provider request
  authoritative detailed provenance record

Layer 3 — InfraDriver indexes/catalog metadata
  fast discovery and lookup
  replaceable/rebuildable
```

No layer is allowed to become a substitute for history, memory, meaning, embodiment, identity, or Thread expression.

## Why both embedded and side provenance

Side-only provenance fails when a file leaves Fibre or an index is lost.

Embedded-only provenance is also insufficient:

- platforms may strip metadata;
- a credential must not expose private prompt/source material by default;
- detailed provider/request records may be too large or sensitive for public media;
- operational and audit queries need stable Fibre-native immutable records.

The architecture therefore deliberately duplicates a bounded subset.

## Generation records

### Semantic brief / seed text

The semantic brief is the Fibre/application-owned generation intent supplied to `AssetGenerationService`.

For Thread Presentation this includes the packet-grounded textual description and generation constraints, for example:

```text
Generated reconstruction of an autobiographical memory...
rememberedContent...
uncertainty...
constraints:
  reconstruction, not documentary evidence
  do not turn uncertainty into exact detail
  do not invent a canonical face
```

This is retained exactly in the immutable generation record.

### Exact provider prompt/request

The media-provider adapter may compile the semantic brief into a provider-specific prompt/request. Fibre must preserve the exact provider-facing request that Fibre actually sent, subject to provider terms and secret stripping.

Examples include:

```text
renderedPrompt
negativePrompt
aspect ratio / dimensions
quality/style controls
seed if provider supports one
reference-image identities/digests
provider-specific generation parameters
```

The provider request record must exclude credentials, bearer tokens, signed URLs, ephemeral authorization headers, and other secrets.

Fibre does not claim visibility into provider-internal prompt rewriting or hidden inference transformations.

### GenerationRecord shape

Conceptually:

```text
GenerationRecord {
  schemaVersion
  generationRecordId
  job
    complete normalized AssetGenerationJob
  semanticBrief
  semanticBriefDigest
  providerRequest
  providerRequestDigest
  providerProfile
  actualProvider
  actualModel
  providerRequestId
  providerConfiguration
  generatedAt
  providerOutputDigest
  inputReferences[]
  referenceAssets[]
    objectRef
    digest
  provenanceClass
}
```

The record is immutable and content-digested before C2PA embedding.

## Embedded Content Credential

C2PA is an interoperability envelope, not Fibre semantic authority. Fibre should use standard assertions where they fit and a namespaced custom assertion for Fibre-specific linkage.

### Standard information

For generated media, the Content Credential should identify the media as AI/generated using the applicable standard digital-source type (currently `trainedAlgorithmicMedia` for generative media).

The credential should also carry ordinary claim-generator/signing information and relevant creation/action assertions supported by the implementation.

### Fibre custom assertion

A Fibre-specific assertion can use a namespaced label such as:

```text
com.insidefibre.generated-asset.v1
```

Conceptually it contains only the publishable survival subset:

```text
{
  provenanceClass: generated_reconstruction,
  mediaId,
  role,
  generationRecordDigest,
  semanticBriefDigest,
  providerRequestDigest,
  sourceSnapshotDigest,
  provider,
  model,
  generatedAt,
  referenceAssetDigests[],
  promptDisclosure: digest_only | public_text
}
```

Exact field encoding must follow the selected C2PA SDK/spec implementation and remains implementation detail.

## Prompt disclosure policy

The prompt itself is provenance, but it is not automatically public provenance.

### Required retention

Fibre retains:

```text
exact semantic brief / seed text
exact provider-facing prompt/request
```

whenever Fibre controls and is permitted to retain those values.

### Embedded disclosure modes

```text
digest_only   DEFAULT
  embed semanticBriefDigest + providerRequestDigest
  do not embed exact text

public_text
  embed approved exact semantic brief/provider prompt text
  legal only when the entire embedded text is independently authorized for public disclosure
```

A future `restricted_reference` mode may allow a credential to reference access-controlled external provenance, but it is not required for v1.

Prompt-publication decisions are made before credential creation. They are not inferred from the fact that an output image is public.

For Thread Presentation, `digest_only` is the default even when the source packet is public, because the provider prompt may contain reconstruction instructions or future reference material that should not become permanent public metadata by accident.

## Hash/sign/store sequence

Embedding provenance changes the media bytes. Therefore Fibre must not treat the provider-returned asset digest as the final public asset digest.

Required sequence:

```text
1. normalize deterministic AssetGenerationJob
2. record semantic brief
3. render exact provider request
4. provider generates raw output bytes
5. hash provider raw output -> providerOutputDigest
6. construct immutable GenerationRecord
7. hash GenerationRecord -> generationRecordDigest
8. construct public-safe C2PA manifest
9. sign and embed C2PA into asset
10. hash final credentialed bytes -> finalAssetDigest
11. store final bytes immutably through InfraDriver.objects
12. persist immutable StoredAssetReceipt
13. only then publish media.ready / new media snapshot
```

This avoids a circular dependency in which an asset contains a receipt digest whose creation itself changes the asset digest.

### StoredAssetReceipt

Conceptually:

```text
StoredAssetReceipt {
  schemaVersion
  generationRecordRef
  generationRecordDigest
  finalObjectRef
  finalAssetDigest
  mediaType
  dimensions / duration
  c2pa
    manifestDigest
    signerIdentity/ref
    validationStatus
    promptDisclosure
  completedAt
}
```

The final asset and both records are immutable. Regeneration produces new identities.

## Publication gate

A generated asset is not publishable when any of these is missing:

```text
immutable GenerationRecord
valid embedded credential under configured policy
final post-embedding asset digest
immutable StoredAssetReceipt linking asset to GenerationRecord
```

For Thread Presentation, `media.ready` must refer to the final credentialed object, never the raw provider output.

## C2PA loss and recovery

Embedded metadata can be removed by re-encoding or deliberate stripping. This architecture does not assume otherwise.

If the credential is removed:

- Fibre still has the content-addressed generation record and stored receipt;
- a Fibre-served original can still be verified;
- external copies without credential no longer carry self-contained hard-binding provenance.

Future work may add durable credentials / soft bindings such as fingerprint or watermark-based rediscovery. This is **Deferred**, not rejected.

## Infrastructure and provider boundaries

```text
AssetGenerationService
       |
       +--> MediaGenerationProvider
       |      raw provider output + exact request witness
       |
       +--> ContentCredentialSigner
       |      C2PA manifest/sign/embed/validate
       |
       `--> InfraDriver
              workflows
              objects
              secrets/key access where applicable
```

`ContentCredentialSigner` should remain replaceable and provider-neutral. The signing certificate/key mechanism must not leak into Thread or presentation contracts.

Cloudflare v1 may use Worker/Workflow execution plus R2 for stored objects and a Cloudflare-supported secret facility for signing key material. AWS/GCP/Azure drivers may realize the same contracts differently.

## Thread authority boundary

A generated image can be faithful, useful, signed, and fully reproducible while remaining only a representation.

The following inference is forbidden:

```text
valid Fibre C2PA credential
        !=
proof that depicted event visually happened
        !=
embodiment authority
        !=
Thread memory evidence
        !=
Thread meaning
```

For memory reconstruction, the underlying autobiographical-memory record remains the memory authority. The image is a generated representation of that record.

## Current implementation state — 2026-08-21

Already implemented and maintainer-validated before this decision:

- provider-neutral asynchronous `AssetGenerationService`;
- `InfraDriver.workflows` memory implementation;
- immutable asset-generation job/receipt foundation;
- exact Fibre semantic briefs for eligible Cần Thơ place/memory slots;
- provider/model/configuration provenance in receipts;
- deterministic asset planning;
- reference-object and variant extension path;
- `media.ready` / `media.unavailable` presentation event adapter;
- Cần Thơ planner: 11 eligible stills, portrait/voice/video deferred.

Accepted here but **not yet implemented**:

- split `GenerationRecord` from final `StoredAssetReceipt`;
- exact provider-facing request capture;
- C2PA manifest generation/signing/embedding/validation;
- prompt disclosure policy enforcement;
- final post-C2PA digest publication gate;
- C2PA-aware image-serving validation;
- durable soft-binding/fingerprint recovery.

The next implementation should land these provenance primitives before the first real production image-provider/Cloudflare asset-generation vertical slice is called complete.

## Standards notes

C2PA permits signed assertions about asset origin/transformation, custom namespaced assertion data, and generative-AI output provenance. The standard also allows generative output credentials to include prompts; Fibre deliberately treats exact prompt disclosure as a policy decision rather than a default.
