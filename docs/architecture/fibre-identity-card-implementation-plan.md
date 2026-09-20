---
id: architecture-fibre-identity-card-implementation-plan-v0-1
status: accepted
last-reviewed: 2026-09-20
canonical: false
---

# Fibre Identity Card implementation record

## Closure

The Fibre Identity Card vertical is implemented. The authority contract remains [`fibre-identity-card.md`](./fibre-identity-card.md).

FIN cards use FIA-native cryptographic proof. They do not depend on an external media-signing service.

The card answers two separate questions:

1. **Authenticity:** did FIA issue these exact card bytes for this exact credential?
2. **Lifecycle status:** is that credential currently active, superseded, or revoked?

Authenticity is historical and byte-specific. It does not mean “latest,” and FIN cards do not expire.

## Non-negotiable boundaries

- FIN and civil registration remain Birth Center / Civil Registry authority.
- Birth never waits for card issuance.
- Normal issuance supplies `threadId`, reason and idempotency identity only; callers do not author FIN, identity fields or arbitrary photo bytes.
- Fibre Identity Authority owns issuance, lifecycle, photo admission and current status.
- Thread Presentation may project an active admitted card; it does not issue cards.
- Admin Dashboard and Thread Editor are operator/inspection clients over Fibre service contracts.
- Durable state/objects flow through `InfraDriver`; browser/app code never reaches provider storage or signing keys.
- Public card output is exactly `front.png` and `back.png`.
- Historical card bytes and issuance records are immutable.
- A later reissue supersedes the prior active credential; it does not invalidate the historical authenticity of prior card bytes.

## Native FIN proof

Each rendered PNG carries a Fibre proof envelope in a private ancillary `fiDP` chunk.

The proof path is:

```text
deterministic unsigned card render
  -> SHA-256 raw-render digest
  -> canonical fibre.fin-card-proof.v1 assertion
  -> SHA-256 assertion digest
  -> Ed25519 FIA signature
  -> Fibre proof envelope
  -> fiDP PNG chunk
  -> extraction + canonicality + signature + raw-render verification
  -> immutable storage
```

The proof assertion binds the credential/card identity, FIN, side, revision, issuance time, issuer key identity, and unsigned render digest.

The verifier returns assertion data only after the accepted FIA key identity, Ed25519 signature, expected side, canonical assertion encoding, and raw-render digest all validate.

Front and back are therefore independently verifiable exact FIA-issued artifacts while remaining paired by the same credential identity/revision.

Reference implementation:

- `services/fibre-identity-authority/src/fid-card-proof.mjs`
- `services/fibre-identity-authority/src/fid-card-proof-png.mjs`
- `services/fibre-identity-authority/src/fid-card-proof-verifier.mjs`
- `services/fibre-identity-authority/src/fid-card-proof-issuance.mjs`

## Lifecycle model

Credential lifecycle and issuance workflow state remain separate.

```text
credential lifecycle:
active | superseded | revoked

issuance workflow:
request
  -> resolve authoritative identity
  -> resolve/admit official photo
  -> deterministic front/back render
  -> machine credential protection
  -> native FIN proof embed + self-verification
  -> immutable front/back storage
  -> atomic activation
```

A replacement does not become active, and the prior credential does not become superseded, until both final PNGs have passed native proof verification and immutable storage succeeds.

A failed reissue leaves the prior active credential unchanged.

## Lifecycle orchestration

Thread Presentation owns the private lifecycle reconciliation seam:

```text
reconcileFid(threadId, mode, idempotencyKey)

mode = ensure | reissue
```

- `ensure` reuses an active FIA credential when one exists and cuts a card only when needed.
- `reissue` deliberately creates a replacement through FIA.
- callers provide no FIN, civil identity fields, photo bytes, credential ID or render facts.
- Thread Presentation projects the resulting active credential after FIA succeeds.
- Admin Dashboard routes card operations through Thread Presentation rather than calling FIA directly.

Card replacement owns only `fibre_identity_card_front` and `fibre_identity_card_back`. The admitted `official_id_photo` belongs to Thread visual identity and survives card replacement.

## Verification semantics

Native card verification is intentionally exact:

```text
displayed PNG bytes
  -> extract Fibre proof
  -> verify canonical assertion + FIA signature
  -> reconstruct unsigned PNG
  -> verify raw-render digest
  -> confirm side/card identity
```

This proves that FIA issued the exact displayed card. It does **not** ask whether the credential is the newest credential for the FIN.

Current lifecycle status is a separate FIA lookup/projection concern.

## Cloudflare composition

FIA remains provider-neutral. Executable composition lives under `infra/deployments/fibre-identity-authority/`.

The Cloudflare deployment requires the FIA private service token plus FIA issuer/protection secrets. The already-composed FIA Ed25519 issuer key signs both the protected machine credential and the public native FIN proof; there is no separate card-signing service.

## Closure invariants

The completed vertical preserves:

- birth independence from card issuance;
- authority-owned identity resolution;
- admitted photo provenance tied to Thread visual identity;
- exactly one active credential per FIN;
- immutable historical credentials and card bytes;
- no expiry semantics;
- front/back cryptographic pairing;
- exact-card authenticity distinct from current lifecycle status;
- provider-neutral service/InfraDriver boundaries;
- public projection without exposing signing keys or provider internals.

Future work should reopen this vertical only for a concrete Fibre capability or demonstrated regression, not to add a parallel proof framework.
