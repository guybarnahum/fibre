---
id: architecture-generated-asset-provenance-v2
status: accepted
last-reviewed: 2026-09-20
canonical: false
---

# Generated asset provenance v2

## Purpose

Define how Fibre generated media retains trustworthy generation lineage without confusing representation provenance with Thread-life authority.

This architecture implements [ADR-0014](../decisions/ADR-0014-generated-asset-provenance.md).

The central rule is:

> **Detailed provenance lives in Fibre. Embedded proof is optional and, when used, is Fibre-native. Neither makes generated media Thread-life evidence.**

## Current proof layers

```text
Layer 1 — immutable final asset
  exact bytes + SHA-256 digest

Layer 2 — immutable Fibre GenerationRecord + GenerationAttempt + StoredAssetReceipt
  exact generation lineage and provider witness
  authoritative generated-asset provenance

Layer 3 — InfraDriver indexes/catalog metadata
  discovery and lookup
  replaceable/rebuildable
```

The final asset is publishable only after Fibre can reload and verify the durable provenance chain and exact final bytes.

## Generation record

The immutable `GenerationRecord` records:

- normalized `AssetGenerationJob`;
- Fibre semantic brief;
- semantic-brief digest;
- secret-stripped provider request witness;
- provider-request digest;
- provider-output digest;
- output media shape;
- actual provider/model/request identifier;
- generation timestamp and relevant configuration.

Provider-hidden behavior that Fibre cannot observe is never represented as retained fact.

## Provider operation and attempt identity

`AssetGenerationJob`, `ProviderOperation`, and `GenerationAttempt` are distinct.

For asynchronous providers, accepted provider task identity is persisted before polling/resume. Once an operation is durable, retries resume the same external operation rather than submitting a second request.

Once provider output bytes are durably staged, subsequent retries reuse those exact bytes. Fibre does not regenerate merely because final storage or completion publication needs another attempt.

## Stored asset receipt

The immutable `StoredAssetReceipt` binds:

- generation job identity;
- final object reference;
- final SHA-256 digest;
- generation-record object reference and digest;
- provider-output digest;
- media type/dimensions;
- completion timestamp;
- caller input references and context.

For the current provenance-only path, final asset bytes are the exact durable provider output, so the final asset digest equals the provider-output digest.

## Publication gate

Thread Presentation may emit `media.ready` only after it:

1. resolves the immutable receipt;
2. verifies the receipt digest;
3. resolves and verifies the generation record;
4. resolves and verifies the generation attempt and staged provider output;
5. verifies the final stored asset bytes and digest;
6. binds the exact generation job back to the current durable presentation demand.

This proof is about generated-media lineage. It does not create identity, history, autobiographical memory, embodiment authority, or semantic truth.

## Future embedded signed proof

Fibre does not currently require embedded signatures for generic generated media.

If a generated PNG should carry portable signed provenance, Fibre will reuse the native proof mechanism already proven for FIN card images rather than introduce a second signing/trust stack.

The mechanism is:

```text
asset-specific canonical JSON assertion
  -> SHA-256 assertion digest
  -> Ed25519 signature
  -> Fibre proof envelope
  -> dedicated Fibre PNG chunk
  -> extraction + canonicality + signature verification
  -> raw-render digest linkage
  -> immutable storage
```

The reference implementation is:

- `services/fibre-identity-authority/src/fid-card-proof.mjs`
- `services/fibre-identity-authority/src/fid-card-proof-png.mjs`
- `services/fibre-identity-authority/src/fid-card-proof-verifier.mjs`
- `services/fibre-identity-authority/src/fid-card-proof-issuance.mjs`

Asset Generator must reuse or extract the **generic cryptographic and PNG-envelope primitive**, not reuse FIN-specific identity assertions. Generated media needs its own assertion schema and an explicitly chosen Fibre signing authority.

Before storage, any embedded proof must be self-verified against the exact raw bytes it claims.

## Prompt disclosure

The exact semantic brief and secret-stripped provider request remain in Fibre's immutable provenance.

Embedding prompt text is not required for authenticity and must not become an accidental public-disclosure mechanism. If an asset-specific embedded assertion later includes prompt-related information, public fields must be intentionally selected for that asset class.

## Recovery and portability

Losing a catalog does not lose the immutable generation record or receipt.

If embedded proof is later enabled, stripping the PNG proof chunk must not erase Fibre's durable internal provenance. Conversely, an embedded proof can provide portable authenticity outside Fibre without becoming the detailed internal provenance authority.

## Non-authority rule

Generated media remains a representation. Provenance proves **how that representation was produced and admitted**, not that the depicted event happened or that the representation is a Thread memory, historical record, or identity authority.
