---
id: adr-0014
status: accepted
date: 2026-08-21
---

# ADR-0014: Generated asset provenance and embedded Content Credentials

## Context

Fibre is adding an asynchronous `AssetGenerationService` that can turn approved presentation material into generated images and, later, audio/video. Generated assets are derived presentation artifacts, not Thread-life evidence.

A sidecar provenance record alone is insufficient for long-term portability: an asset may be copied outside Fibre, an index may be lost, or an operational workflow record may expire. Conversely, embedding the complete internal generation record into a public asset can leak private Thread material, third-party information, internal object identities, or provider-only details.

Fibre therefore needs both durable external provenance and portable in-asset provenance.

## Decision

1. **Every generated Fibre asset has durable Fibre provenance and portable embedded provenance.**
   - Fibre persists a complete immutable generation record/receipt through `InfraDriver.objects`.
   - Publishable media embeds a signed C2PA / Content Credentials manifest, or a compatible successor standard if C2PA is replaced.
   - The exact supported C2PA specification version is implementation configuration, not Fibre domain doctrine.

2. **The full Fibre provenance record is the detailed provenance authority.** It preserves enough material to reconstruct what Fibre asked the provider to do, including:
   - the normalized `AssetGenerationJob`;
   - source snapshot/presentation references and digests;
   - the Fibre semantic generation brief / seed text;
   - the exact rendered provider prompt or provider request payload actually sent, to the extent Fibre controls and is permitted to retain it;
   - provider profile, variant, reference-object refs and relevant generation configuration;
   - actual provider, model, request identifier and generation timestamp;
   - the digest of provider-returned bytes before provenance embedding when available;
   - terminal or retryable failure information where applicable.

3. **C2PA carries a public-safe survival subset, not the entire private record by default.** The embedded credential must identify at least:
   - the asset as AI/generated media using the applicable standard digital-source designation;
   - Fibre as the claim generator/signer where operationally supported;
   - `generated_reconstruction` as the Fibre presentation provenance class where applicable;
   - asset/media identity and role;
   - actual provider/model when disclosure policy permits;
   - generation timestamp;
   - generation-record digest;
   - source presentation/snapshot digest(s) appropriate for public disclosure;
   - semantic-brief digest;
   - exact-provider-prompt/request digest;
   - reference-asset digests where applicable and safe to disclose.

4. **Exact prompt text is retained in Fibre provenance; embedding exact text is policy-controlled.**
   - The Fibre semantic brief and the exact provider prompt/request are distinct records and both are retained.
   - Default public C2PA policy is `digest_only`: embed their digests but not their full text.
   - A caller may explicitly choose `public_text` only when the prompt material is already authorized for public disclosure and contains no private/restricted third-party information.
   - Sensitive prompt material is never made public merely because the output asset is public.

5. **The final stored asset is hashed only after provenance embedding/signing.** To avoid a circular hash dependency, the pipeline is ordered:

```text
normalized generation job
        |
        v
provider request / exact prompt retained
        |
        v
provider returns raw bytes
        |
        +--> providerOutputDigest
        |
        v
immutable GenerationRecord
        |
        +--> generationRecordDigest
        |
        v
build + sign C2PA manifest containing generationRecordDigest
        |
        v
embed credential into asset
        |
        v
hash final credentialed asset
        |
        v
immutable final asset + StoredAssetReceipt
```

The `StoredAssetReceipt` links the final asset digest to the generation-record digest and credential information. Regeneration creates new immutable identities rather than rewriting an existing asset.

6. **Publication fails closed.** A generated asset is not publishable through Thread Presentation until:
   - the complete immutable generation record exists;
   - the embedded credential validates according to the configured signing policy;
   - the final asset digest has been computed after embedding;
   - the stored receipt links the final asset to the generation record.

7. **Embedded provenance does not create Thread authority.** A valid Fibre Content Credential proves provenance of the generated representation. It does not upgrade the representation into history, autobiographical memory, remembered meaning, embodiment authority, Thread expression, or evidence for cognition.

## Prompt and seed-text terminology

Fibre distinguishes:

```text
semantic brief / seed text
  Fibre-owned description + constraints produced by the calling adapter

provider prompt / request
  exact provider-facing input after adapter compilation/transformation

provider-hidden transformation
  provider-internal behavior Fibre cannot observe; not falsely claimed as retained
```

The first two are retained when Fibre controls them. Their digests are always eligible for the public-safe credential; their full text requires explicit disclosure policy.

## Consequences

- Losing a side catalog does not make a copied asset provenance-free; the asset carries a signed portable credential.
- Stripping embedded metadata does not erase Fibre's immutable generation record/receipt.
- Future durable soft bindings/fingerprints may help rediscover credentials after metadata stripping, but are deferred rather than required for v1.
- Prompt reproducibility does not require publicly leaking prompts.
- Provider adapters must expose the exact request Fibre sent and the actual provider/model metadata needed by the generation record.
- A future C2PA signer/key implementation may use infrastructure secret/key facilities, but signing-key location is not part of Thread or presentation semantics.

## Relationship to presentation authority

This ADR extends the presentation rule that generated media is `generated_reconstruction`. It does not alter the authority of history, memory, meaning, identity, embodiment, or Thread-authored expression.
