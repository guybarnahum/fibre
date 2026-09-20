---
id: adr-0014
status: accepted
date: 2026-08-21
last-reviewed: 2026-09-20
---

# ADR-0014: Generated asset provenance

## Context

Fibre generates presentation media from approved semantic material. Generated assets are derived representations, not Thread-life evidence.

Fibre needs durable provenance that survives retries, provider replacement, storage migration, and publication replay without granting the generator semantic authority over its inputs.

FIN card work subsequently established a Fibre-native signed embedded-JSON proof mechanism for PNGs. That makes a separate media-signing trust stack unnecessary.

## Decision

1. **Every generated asset has complete immutable Fibre provenance.**
   Fibre persists the exact generation job, generation attempt, provider request witness, provider output digest, final bytes, and stored receipt.

2. **The detailed provenance authority is the Fibre record, not embedded metadata.**
   The immutable `GenerationRecord` preserves the normalized job, semantic brief, secret-stripped provider request, actual provider/model/request identifier, generation configuration, timestamps, and relevant digests.

3. **Publication fails closed on provenance integrity.**
   Thread Presentation must reload and verify the immutable receipt, generation record, generation attempt, staged provider bytes, exact final bytes, and current durable demand binding before emitting `media.ready`.

4. **Provider output is made durable before later retryable work.**
   Once provider bytes are durably staged, retries reuse those exact bytes and do not issue another nondeterministic provider request.

5. **Embedded signed proof is optional, not a second authority.**
   Generic generated media does not currently require an embedded signature. If Fibre chooses to embed signed provenance in a generated PNG, it must reuse or extract the same native mechanism proven by FIN card images:
   - canonical JSON assertion;
   - SHA-256 assertion digest;
   - Ed25519 signature;
   - Fibre proof envelope;
   - dedicated Fibre PNG chunk;
   - extraction, canonicality, signature, and raw-render digest verification before storage.

6. **Generated assets use an asset-specific assertion schema.**
   Reusing the FIN proof mechanism does not mean importing FIN identity semantics into Asset Generator. The generic cryptographic/PNG-envelope primitive may be shared; the assertion schema and signing authority must be explicit for generated media.

7. **Prompt retention and public disclosure remain separate decisions.**
   The exact Fibre semantic brief and secret-stripped provider request remain in durable Fibre provenance. Embedded proof, if enabled later, must not expose private prompt material by default.

8. **Provenance does not create Thread authority.**
   Verified generation lineage does not turn a generated representation into history, autobiographical memory, embodiment authority, Thread expression, or evidence for cognition.

## Current pipeline

```text
normalized generation job
        |
        v
provider request witness
        |
        v
provider operation / generation attempt
        |
        v
immutable staged provider bytes
        |
        +--> providerOutputDigest
        |
        v
immutable GenerationRecord
        |
        +--> generationRecordDigest
        |
        v
immutable final asset
        |
        +--> finalAssetDigest
        |
        v
immutable StoredAssetReceipt
        |
        v
independent publication verification
        |
        v
media.ready
```

If embedded Fibre proof is enabled for an asset class later, the embed/self-verification step occurs between the raw provider bytes and immutable final asset storage, and the receipt records the resulting final digest and proof linkage.

## Consequences

- Asset Generator has one provenance path rather than credentialed/uncredentialed modes.
- No external media signer service is part of the runtime or deployment topology.
- Provider adapters expose the exact request Fibre sent and actual provider/model metadata needed for provenance.
- A copied file may later carry a Fibre-native portable proof, but Fibre's immutable generation record remains the detailed provenance source.
- Removing or losing embedded metadata never erases Fibre's internal provenance.
- Signing-key location and rotation remain authority/deployment concerns, not Thread or presentation semantics.

## Relationship to FIN

FIN cards remain governed by FIA and their dedicated `fibre.fin-card-proof.v1` assertion schema. This ADR adopts the **proof mechanism** as the reference for future generated-media embedding; it does not make FIA the semantic authority for generated assets.

See [Generated asset provenance v2](../architecture/generated-asset-provenance.md).
