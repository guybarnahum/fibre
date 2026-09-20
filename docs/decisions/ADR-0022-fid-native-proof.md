---
id: ADR-0022
status: accepted
last-reviewed: 2026-09-19
---

# ADR-0022: Fibre-native FIN Card proof

## Status

Accepted.

## Context

Fibre Identity Cards need a tamper-evident, machine-readable statement of the identity facts FIA actually credentialed on each rendered card side.

The earlier plan reused Fibre's C2PA / Content Credential signer. That is useful for third-party interoperability, but it introduces machinery that is not required for Fibre's immediate trust model: X.509 credential management, a separate signer service, C2PA runtime dependencies, and Cloudflare deployment complexity.

For FIN Cards, Fibre itself is both issuer and verifier. FIA already has an Ed25519 issuer identity used to sign the protected machine credential, and the deterministic renderer already produces exact SHA-256 digests for `front.png` and `back.png`.

Fibre therefore does not need C2PA merely to answer:

> Did Fibre issue this exact FIN Card image, and what public identity facts did FIA attest for it?

## Decision

Fibre Identity Cards use a small Fibre-native proof as their primary tamper-evidence mechanism.

The public assertion schema is:

```text
fibre.fin-card-proof.v1 {
  schema
  credentialId
  revision
  side: front | back

  identity {
    fin
    displayName?
    dateField? {
      kind: birth_date | entry_date
      value
    }
  }

  issuedAt
  expiresAt?
  templateVersion

  registrationId
  civilRegistrationDigest
  identitySnapshotDigest
  photoDigest
  rawRenderDigest

  issuer {
    authorityId = fibre_identity_authority
    keyId
  }
}
```

The assertion is derived only from FIA's already-authorized machine-credential payload and deterministic render facts. Callers never supply proof identity fields.

The proof pipeline is:

```text
deterministic raw PNG
      |
      +--> SHA-256 rawRenderDigest
      |
      v
public FIA assertion
      |
      v
canonical JSON
      |
      v
FIA Ed25519 signature envelope
      |
      v
Fibre-owned PNG ancillary chunk
      |
      v
protected FIN Card PNG
```

A verifier must:

1. extract exactly one valid Fibre FIN proof envelope;
2. validate the assertion schema;
3. verify the Ed25519 signature under an accepted FIA issuer public key;
4. remove the Fibre proof chunk and reconstruct the original raw PNG byte-for-byte;
5. hash the reconstructed PNG and compare it with `rawRenderDigest`;
6. return the embedded assertion only if all checks succeed.

Malformed, duplicated, conflicting, wrong-key, wrong-side, signature-invalid or render-digest-invalid proofs fail closed and do not expose a trusted assertion.

The signed envelope is:

```text
fibre.fin-card-proof-envelope.v1 {
  envelopeVersion
  assertion
  assertionDigest

  signature {
    algorithm = Ed25519
    authorityId = fibre_identity_authority
    keyId
    bytesBase64
  }
}
```

The signature covers the canonical bytes of `assertion`. `assertionDigest` is recomputed during normalization and exists as stable evidence/indexing metadata; it is not a substitute for signature verification. The assertion issuer, signature identity and configured FIA signer profile must all identify the same FIA key.

The runtime signer profile must explicitly declare `algorithm = Ed25519`. Cloudflare's existing `FIA_ISSUER_JWK` WebCrypto composition satisfies that contract.

The PNG transport uses one Fibre-private ancillary chunk:

```text
fiDP
```

Its PNG property bits intentionally mean ancillary + private + reserved-bit compliant + unsafe-to-copy. The canonical signed envelope JSON is stored as the chunk payload immediately before `IEND`. Embedding is deterministic, changes no image pixels, and extraction removes only that chunk to recover the original deterministic PNG byte-for-byte. The transport rejects malformed CRCs, duplicate Fibre proof chunks and implicit re-embedding.

The strict verifier is the semantic trust boundary. Extraction alone never makes assertion data trusted. A successful verification requires all of:

```text
valid PNG/proof transport
AND accepted FIA key identity
AND valid Ed25519 signature
AND expected side, when supplied
AND SHA-256(reconstructed raw PNG) == assertion.rawRenderDigest
```

Only then may the verifier return the embedded assertion. Every failure returns a bounded reason with no assertion payload. Front/back pair verification first authenticates each side independently, then requires matching credential, revision, identity, registration, issuance, template, photo and issuer facts.

## Protected machine credential remains separate

The existing protected `fibre.fid-card.v1` machine credential remains FIA authority material.

It may contain private information needed for authority verification and recovery, including the exact admitted photo bytes and detailed provenance/admission linkage. That material is signed and encrypted under FIA policy.

The public FIN proof is intentionally smaller. It contains only the public card facts and evidence digests needed for portable Fibre verification.

```text
protected machine credential
  private/full FIA authority material

public FIN proof
  readable card facts + digests + FIA signature
```

Neither representation is allowed to redefine FIN, Thread identity, civil registration or visual-identity authority.

## Authenticity and chronology

The native proof establishes authenticity of one immutable credential artifact.

It deliberately does not claim that the card is the latest revision. FIN Cards do not expire as part of this proof contract, and historical cards are never re-signed merely because a newer card is issued.

```text
authenticity
  exact PNG + trusted FIA proof

chronology, when multiple cards are known
  revision + issuedAt
```

A future product may ask FIA whether a newer revision is known, but that lookup is outside the proof and is intentionally deferred until it provides concrete Fibre value.

Normal FIA issuance uses the native proof path exclusively. Both sides are signed, embedded and verified before either object is stored; finalization then re-verifies the immutable stored bytes and requires the trusted embedded assertions to match the protected FIA machine credential before activation.

The immutable issuance record persists native proof evidence directly: proof format, schema, envelope version, FIA signer key ID, verification status, and the trusted assertion digest for each side.

## Consequences

Positive:

- FIN Card protection runs entirely inside the existing FIA Worker trust boundary;
- the existing FIA Ed25519 issuer identity is reused;
- no Docker, Container, Wasm, X.509 chain, commercial CA or separate signer service is required for FIN Cards;
- the embedded assertion is small, inspectable and directly corresponds to rendered card facts;
- Fibre can verify copied card images without depending on Fibre object storage;

Costs:

- the proof is Fibre-specific and is verified by Fibre;
- Fibre owns the PNG proof-chunk format and verifier implementation;
- key rotation/public-key distribution remain FIA deployment responsibilities;
- metadata-stripping tools can remove the proof, in which case the copied image becomes unverifiable rather than falsely valid.

## Implementation order

```text
A. proof assertion contract — implemented
B. FIA Ed25519 signature envelope — implemented
C. deterministic PNG embedding/extraction — implemented
D. strict verifier — implemented
E. issuance integration — implemented
F. registry/storage proof evidence — implemented
G. verification API — implemented
I. rich-card verification UI — implemented
```

Every implementation slice must pass `npm run slice:validate`.
