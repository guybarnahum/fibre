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
FIA Ed25519 signature
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

## Authenticity versus current validity

The native proof establishes authenticity of one immutable credential artifact.

It does not by itself prove that the credential is currently active.

```text
authenticity
  exact PNG + trusted FIA proof

current validity
  FidCardRegistry says active / superseded / revoked / expired
```

Online verification may add a registry lookup only after proof authenticity succeeds.

## C2PA relationship

C2PA is no longer required for FIN Card issuance, activation or Fibre-native verification.

Fibre may later wrap the same public assertion in C2PA to support third-party Content Credentials tooling. Such a wrapper is interoperability metadata, not FID identity authority.

This decision does not repeal ADR-0014. Generated-media provenance may continue to use C2PA independently.

## Consequences

Positive:

- FIN Card protection runs entirely inside the existing FIA Worker trust boundary;
- the existing FIA Ed25519 issuer identity is reused;
- no Docker, Container, Wasm, X.509 chain, commercial CA or separate signer service is required for FIN Cards;
- the embedded assertion is small, inspectable and directly corresponds to rendered card facts;
- Fibre can verify copied card images without depending on Fibre object storage;
- C2PA interoperability remains possible later without coupling FIA semantics to it.

Costs:

- the proof is Fibre-specific and generic C2PA validators will not understand it;
- Fibre owns the PNG proof-chunk format and verifier implementation;
- key rotation/public-key distribution remain FIA deployment responsibilities;
- metadata-stripping tools can remove the proof, in which case the copied image becomes unverifiable rather than falsely valid.

## Implementation order

```text
A. proof assertion contract
B. FIA Ed25519 signature envelope
C. deterministic PNG embedding/extraction
D. strict verifier
E. issuance integration
F. registry/storage proof evidence
G. verification API
H. current-status verification
I. rich-card verification UI
J. retire FIN-specific C2PA deployment machinery
```

Every implementation slice must pass `npm run slice:validate`.
