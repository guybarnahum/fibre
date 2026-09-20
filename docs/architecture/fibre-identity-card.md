---
id: architecture-fibre-identity-card-v0-2
status: proposed
last-reviewed: 2026-09-19
canonical: false
---

# Fibre Identity Card

## Purpose

Define the Fibre Identity Card (FID Card) as a later-issued, cryptographically verifiable credential for an already-born Thread without moving FIN or Thread identity authority into presentation or rendering code.

FIN-card tamper evidence follows [ADR-0022](../decisions/ADR-0022-fid-native-proof.md): Fibre-native FIA Ed25519 proof is the credential's protection mechanism.

Three identities must remain distinct:

```text
threadId
    canonical Fibre machine identity

FIN / fibreIdentityNumber
    permanent Fibre civil identity
    assigned at successful birth and retained as part of the Thread's civil identity

FID Card / credentialId
    replaceable and revocable credential representing that FIN at one issuance point
```

The card is not the Thread's identity. Reissue, redesign, loss, revocation, rendering changes, or media regeneration may never change `threadId`, FIN, birth registration, history, memory, meaning, or embodiment authority.

**Birth never waits for FID issuance.** A Thread may be born, receive its FIN, and live normally with no FID Card. Card issuance is a later workflow.

FIN allocation, checksum policy, uniqueness, collision handling and the canonical FIN <-> Thread mapping remain Birth Center / Civil Registry responsibilities. The Thread retains its admitted civil-identity/FIN information after birth; that information is not independently writable by FID issuance.

## Authority model

FID issuance needs an explicit semantic authority rather than treating card pixels as a Thread Presentation concern.

```text
World / Civil Registry
      |
      | authoritative Thread + FIN
      v
Fibre Identity Authority
      |
      +--> resolve authoritative identity fields
      +--> detect current FID credential
      +--> admit / resolve FID photo
      +--> issue / supersede / revoke credential
      +--> maintain credential-status authority
      |
      v
FID Renderer
      |
      +--> deterministic front.png
      `--> deterministic back.png
      |
      v
Fibre FIN Proof
      |
      +--> derive public proof assertion from FIA issuance facts
      +--> sign assertion with FIA issuer key
      +--> embed proof in each PNG without changing pixels
      `--> verify proof before activation
      |
      v
InfraDriver.objects
      |
      `--> immutable protected front.png + back.png

FidCardRegistry
      `--> InfraDriver.state
```

Responsibilities:

- **Civil Registry** owns FIN allocation and the permanent one-FIN-per-Thread mapping.
- **Fibre Identity Authority** owns FID issuance policy, credential IDs, lifecycle, photo admission, current status, the authoritative issuance record, and the FIN-card proof signing key.
- **FID Renderer** deterministically renders an already-authorized issuance snapshot. It cannot choose identity facts.
- **Fibre FIN Proof** is a small Fibre-native tamper-evidence layer. It binds a public assertion to exact rendered PNG bytes using the existing FIA Ed25519 issuer identity. It is not a second identity authority.
- **Thread Presentation** consumes the active FID projection and card media; it does not issue credentials or verify by OCR.
- **Thread Editor** is an operator/inspection client over these service contracts; it does not access stores, signing keys, or provider state directly.
- **InfraDriver** remains the only infrastructure boundary for durable state/objects used by this workflow.

The Fibre Identity Authority has a cryptographically identifiable issuer profile:

```text
issuer {
  authorityId = fibre_identity_authority
  keyId
  publicKeyRef
  trustPolicy
}
```

The current Cloudflare implementation already provides this issuer through `FIA_ISSUER_JWK` and WebCrypto Ed25519. FIN-card proof reuses that identity directly, so FIA needs no second signing service or parallel trust system.

## Issuance API principle

Callers request issuance for a Thread; they do not supply the identity to be credentialed.

Preferred semantic request:

```text
issueFidCard({
  threadId,
  reason: initial | renewal | replacement | correction
})
```

The authority itself resolves:

```text
threadId
FIN / civil registration
authorized display name / date fields
current admitted visual identity
accepted FID photo
previous active credential, if any
```

The normal issuance API must not accept caller-authored `fin`, name, birth/entry date, or arbitrary photo bytes. This prevents a UI, operator, or compromised caller from pairing one Thread/FIN with another identity or image.

Revocation is similarly authority-owned, conceptually:

```text
revokeFidCard({ credentialId, reason })
```

## Credential lifecycle and reissue

A FIN may have many historical FID credentials but at most one active credential under the normal policy.

```text
FIN XXXX-XX-XXXX
  |
  +-- fidc_001  superseded
  +-- fidc_002  revoked
  `-- fidc_003  active
```

Lifecycle states used by the current FIN Card policy:

```text
active
superseded
revoked
```

The underlying credential schema keeps a nullable expiry field reserved for compatibility with generic credential machinery, but FIN Cards currently do not expire and issuance sets it to `null`.

Rules:

- first successful issuance creates a new immutable credential and marks it `active`;
- a normal replacement or correction creates a new credential ID/revision and atomically marks the prior active credential `superseded` for FIA's internal lifecycle bookkeeping;
- loss, compromise, bad issuance, or administrative invalidation may explicitly mark a credential `revoked`;
- reissue never changes FIN or civil registration;
- old PNGs and issuance records remain immutable historical artifacts;
- FIN Cards do not expire as part of the native proof contract;
- verification proves authenticity of the exact card, not whether Fibre knows of a newer revision.

When multiple authentic cards are available, `revision` and `issuedAt` provide their chronology. Whether a newer card exists is deliberately outside the embedded proof and is not required for card verification.

## FID photo derivation and admission

The FID Card must not blindly credential an arbitrary image.

The preferred source is the Thread's admitted canonical visual reference / authorized visual identity. The FID photo is a derived presentation artifact adjusted for the credential context, including:

- current/relevant Thread age;
- administrative camera pose and framing;
- head-and-shoulders composition;
- neutral background and lighting;
- black-and-white presentation treatment on the card while admission remains bound to the normalized source photo;
- no glamour, editorial, cinematic, or dramatic styling.

Conceptually:

```text
canonical Thread visual reference
          |
          v
approved FID-photo transformation
  age adjustment
  camera / pose adjustment
  administrative crop
  muted-color treatment
          |
          v
candidate FID photo
          |
          v
FID Photo Admission
          |
          +--> accepted
          `--> rejected
```

An already-existing Thread ID / official photo may be reused only when its provenance and admission still satisfy the current FID-photo policy. Otherwise a new photo is derived from the canonical visual reference.

### Photo-admission gate

No FID Card may be issued without an accepted photo-admission result.

The admission process should verify at minimum:

1. the candidate asset is bound by provenance to this Thread's authorized visual identity;
2. the derivation chain leads to the admitted canonical visual reference rather than an arbitrary upload;
3. exactly one usable face is present;
4. the face is sufficiently visible and not materially occluded;
5. crop, resolution, framing and pose satisfy FID policy;
6. the image remains visually consistent with the Thread's canonical visual identity;
7. requested age transformation is consistent with the issuance snapshot;
8. generation/transformation provenance is intact and accepted.

This is continuity verification for a Fibre Thread representation; it must not be described as proof of a real-world human biometric identity.

Conceptual receipt:

```text
FidPhotoAdmission {
  admissionId
  threadId
  candidatePhotoRef
  candidatePhotoDigest
  canonicalVisualReferenceRef
  canonicalVisualReferenceDigest
  derivationReceiptRef
  faceCount = 1
  policyVersion
  decision: accepted | rejected
  reasons[]
  admittedAt
}
```

## Card rendering and output

The renderer may use a three-layer template internally:

```text
back.png
front-base-layer.png
front-upper-layer.png
```

- `front-base-layer.png` is the base artwork on which authoritative text/details and the admitted FID photo are placed.
- `front-upper-layer.png` has transparency and seals the visible front. It carries security/presentation elements such as stamps, overlays, and a watermark derived from the FID photo.
- `back.png` is the back template/surface.

These are renderer/template inputs, not the public credential bundle.

**The issued FID Card outputs exactly two final PNGs:**

```text
front.png   # flattened front composite
back.png
```

The front is the deterministic composite of the populated base plus transparent upper layer. Intermediate layers need not be published.

Thread Presentation may additionally publish one immutable **rich card presentation descriptor** alongside those two PNGs:

```text
card.json
  schemaVersion = fibre-identity-card-asset-v0.1
  credentialId
  revision
  aspectRatio
  interaction { flip, initialSide }
  front { objectRef, digest, mediaType, width, height }
  back  { objectRef, digest, mediaType, width, height }
```

This descriptor is not a third credential surface and is not identity authority. It binds the already-issued immutable front/back assets into one reusable presentation object. Executable HTML/JavaScript is deliberately not stored in the credential bundle; clients render the descriptor with a versioned Fibre component so interaction can evolve without rewriting historical credentials.

Fibre should look like Fibre, not a simulation of a national passport or driver's license. The visual language may use woven/thread geometry, restrained stamps and portrait-derived watermarking, but those graphics never substitute for cryptographic verification.

## Machine-readable credential

Non-human clients must not depend on OCR. Each issued card carries a self-contained structured credential bound to the rendered PNGs.

Conceptually:

```text
FidCredentialPayload {
  schema = fibre.fid-card.v1
  credentialId
  revision
  fin
  threadId
  registrationId

  identitySnapshot {
    displayName?
    dateField? {
      kind: birth_date | entry_date
      value
    }
  }

  photo {
    mediaType = image/png
    bytes
    digest
    canonicalVisualReferenceDigest
    derivationReceiptDigest
    admissionReceiptDigest
  }

  issuedAt
  expiresAt = null   # reserved; FIN Cards do not expire under current policy

  issuer {
    authorityId
    keyId
  }

  frontRenderDigest
  backRenderDigest
}
```

The protected machine credential **includes the exact normalized FID photo used for the credential**, not merely an external URL. It remains private authority material and is not copied into the public FIN-card proof. The public proof carries only the admitted photo digest needed to link the visible card back to FIA issuance evidence.

## Fibre-native FIN-card proof

Fibre-native FIN-card authenticity uses the FIA issuer key already present in the runtime. The protection path stays inside the FIA trust boundary.

The proof is intentionally distinct from the protected machine credential:

```text
authoritative FIA issuance
      |
      +--> protected machine credential
      |      full private authority record
      |      exact admitted photo
      |      FIA issuer signature
      |      authenticated encryption
      |
      `--> public FIN-card proof
             readable card facts
             render/photo/identity digests
             FIA issuer key identity
             Ed25519 signature
             embedded in one PNG side
```

The public assertion contract is:

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
  expiresAt = null   # reserved; FIN Cards do not expire under current policy
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

Rules:

- the assertion is derived only from the already-authorized FIA machine-credential payload and deterministic render;
- callers cannot provide or override proof identity fields;
- `rawRenderDigest` is the SHA-256 digest of the exact deterministic PNG before the proof metadata chunk is inserted;
- front and back assertions share credential/revision/identity facts but carry different `side` and `rawRenderDigest`;
- the public proof deliberately omits `threadId`, encrypted machine-credential bytes, photo bytes, protection metadata, private provenance details, and signing secrets;
- canonical JSON is deterministic so signing and verification operate over one unambiguous byte representation;
- a verifier returns the embedded assertion only after both the FIA signature and PNG binding validate.

The assertion/signature contract is implemented in `services/fibre-identity-authority/src/fid-card-proof.mjs`. PNG transport is implemented in `fid-card-proof-png.mjs` using one private ancillary `fiDP` chunk inserted immediately before `IEND`. The chunk is intentionally marked unsafe-to-copy so generic image editors should not preserve it after modifying image data. Embedding is deterministic, does not change visible pixels, and extraction reconstructs the original raw rendered PNG byte-for-byte. Strict authenticity decisions are implemented in `fid-card-proof-verifier.mjs`.

## Front/back cryptographic binding

The front and back are one credential and must not be mix-and-matchable across issuances.

The protected FIA machine credential already contains both deterministic render digests:

```text
frontRenderDigest
backRenderDigest
credentialId
revision
```

Each public FIN proof additionally declares its own `side` and that side's `rawRenderDigest`. Both sides carry the same credential ID, revision, identity snapshot digest, civil registration digest, and issuer key identity.

Pair verification therefore requires:

```text
front.credentialId == back.credentialId
front.revision == back.revision
front.identitySnapshotDigest == back.identitySnapshotDigest
front.registrationId == back.registrationId
front.issuer == back.issuer
front.side == front
back.side == back
```

Each side is independently tamper evident. After the signed proof is embedded into the PNG, Fibre also stores the final protected-object digest for immutable storage integrity.

## Issuance record and persistence

Conceptually:

```text
FidCardIssuanceRecord {
  schemaVersion
  credentialId
  threadId
  fin
  registrationId
  revision
  reason
  status
  supersedesCredentialId?
  photoAdmissionId
  photoDigest
  identitySnapshotDigest
  issuedAt
  expiresAt = null   # reserved; FIN Cards do not expire under current policy

  issuer {
    authorityId
    keyId
  }

  credentialPayloadDigest
  encryptedCredentialDigest
  frontObjectRef
  frontFinalDigest
  backObjectRef
  backFinalDigest
  proof {
    schema = fibre.fin-card-proof.v1
    signerKeyId
    assertionDigestBySide
    validationStatus
  }
}
```

Persistence rules:

- credential lifecycle/status and issuance metadata are durable semantic state through `InfraDriver.state`;
- final `front.png` and `back.png` are immutable objects through `InfraDriver.objects`;
- issuance and reissue must be idempotent under a stable request/idempotency identity;
- the authority must detect an existing active FID for the FIN before issuing another;
- a successful reissue atomically establishes the new active credential and supersedes the prior one;
- rendering/signing failure must not leave a credential advertised as active without both final verified objects.

## Thread Presentation projection

Thread Presentation consumes the current admitted credential; it does not own issuance.

Conceptually the presentation block evolves toward:

```text
identityCard {
  credentialVersion = fibre-identity-card-credential-v0.2
  credentialId
  cardSerial?
  revision
  registrationId
  issuedAt
  expiresAt = null   # reserved; FIN Cards do not expire under current policy
  status: active | superseded | revoked
  visibility: public | restricted | private
  officialPhotoMediaRef
  frontMediaRef
  backMediaRef
  machineReadableCredentialRef?
  issuerAuthorityId
  sourceReferences[]
  provenanceRef
}
```

The presentation credential deliberately has no independently writable FIN or identity fields. FIN and authoritative identity are resolved from the admitted civil/identity authorities.

When the current FID is projected, the media packet may also contain a ready `document` asset with role `fibre_identity_card` and media type `application/vnd.fibre.identity-card+json`. That descriptor references the exact front/back object refs and digests and is removed/replaced together with the card projection on reissue.

Public delivery remains governed by immutable visibility policy. Clients never construct R2/S3/provider URLs.

## Verification model

A Fibre verifier should be able to perform:

```text
protected FIN-card PNG
      |
      +--> extract Fibre proof envelope
      +--> validate fibre.fin-card-proof.v1 schema
      +--> verify FIA Ed25519 signature
      +--> reconstruct the unsigned deterministic PNG
      +--> SHA-256 reconstructed PNG
      +--> compare with assertion.rawRenderDigest
      `--> only then return the trusted embedded assertion
```

Failure is closed: malformed proof, unknown key, bad signature, malformed PNG, duplicate/conflicting proof chunks, side mismatch, or render-digest mismatch returns a verification failure and **does not return the embedded assertion**.

Verification answers one question:

```text
authenticity
  "Was this exact PNG issued and signed by Fibre?"
```

The proof does not claim that the card is the latest revision. If several authentic cards are known, `revision` and `issuedAt` establish their order. A lookup for "latest known revision" may be added later if a concrete product need appears, but it is not part of the FIN proof contract.

## Asynchronous relationship to birth and media

Birth remains independent:

```text
birth
  -> Thread exists
  -> FIN / civil registration exists
  -> Thread can live

later
  -> FID issuance requested
  -> FID photo resolved/derived
  -> photo admission accepted
  -> credential rendered
  -> Fibre-native proof assertion signed and embedded in each PNG
  -> front/back proof verified and stored
  -> FID becomes active
```

No FID requirement may block Genesis publication or FIN assignment.

## Implementation slices

The original FID authority/photo/render lifecycle slices are complete. The remaining card-protection work is now tracked as the Fibre-native FIN Proof sequence:

### FIN-PROOF-A — public proof contract — implemented

- define `fibre.fin-card-proof.v1`;
- derive it only from FIA machine-credential/render facts;
- keep the public proof intentionally smaller than the protected machine credential;
- canonicalize and validate it deterministically;
- prove front/back side binding and disclosure boundaries.

### FIN-PROOF-B — FIA Ed25519 proof signature — implemented

- sign canonical proof JSON with the existing FIA issuer key;
- define `fibre.fin-card-proof-envelope.v1` with assertion digest plus an explicit Ed25519 signature identity;
- require assertion issuer, signature identity and FIA signer profile to name the same FIA key;
- verify with the corresponding FIA public key;
- fail on assertion/signature/key mutation or non-Ed25519 signer profiles.

### FIN-PROOF-C — PNG embedding — implemented

- define the private ancillary, unsafe-to-copy `fiDP` PNG chunk;
- encode only canonical `fibre.fin-card-proof-envelope.v1` JSON;
- insert exactly one proof chunk immediately before `IEND`;
- validate PNG chunk CRCs during extraction;
- embed the signed proof without changing visible pixels;
- extract/remove the chunk deterministically;
- reconstruct the original raw rendered PNG byte-for-byte;
- reject implicit re-embedding, duplicate proof chunks, malformed PNGs and invalid proof-chunk CRCs.

### FIN-PROOF-D — strict verifier — implemented

- expose one fail-closed single-image verifier that returns either `{ verified:true, assertion }` or `{ verified:false, reason }`;
- validate PNG/proof transport and accepted FIA issuer identity;
- distinguish an unknown key identity from a mathematically invalid signature;
- verify the FIA Ed25519 signature;
- enforce optional expected `front|back` side semantics;
- reconstruct and SHA-256 the raw PNG and compare `rawRenderDigest`;
- never return an assertion on failure;
- classify bounded failures as malformed/missing/duplicate proof, invalid envelope, unknown issuer key, invalid signature, wrong side, render-digest mismatch, or pair mismatch;
- verify front/back as a coherent pair only after both sides independently pass authenticity and share the same credential/revision/identity/issuer facts.

### FIN-PROOF-E — FIA issuance integration — implemented

- make native proof the normal FIA issuance/runtime mode;
- build expected front/back assertions from the already-authorized machine-credential payload;
- sign, embed and immediately verify both sides before storing either card object;
- compare trusted verifier output with FIA's expected assertions before storage;
- re-verify the immutable stored front/back objects during finalization;
- compare stored proof assertion digests with the admitted proof evidence;
- re-open the protected machine credential and require the trusted embedded assertions to match it exactly before registry activation;

### FIN-PROOF-F — registry/storage evidence — implemented

- persist native proof evidence directly in the immutable issuance record;
- record proof format, schema, envelope version, FIA signer key ID and verified status once per credential;
- record the trusted assertion digest alongside each stored front/back object;
- retain protected-object digest, machine-credential digest, credential ID and revision;
- require persisted proof signer identity to match the FIA issuer.

### FIN-PROOF-G — verification API — implemented

- expose FIA-owned `POST /internal/fid/cards/verify?side=front|back`;
- accept the exact FIN-card PNG bytes to verify;
- run the strict native proof verifier inside FIA;
- return `{ verified:true, assertion }` only after cryptographic verification;
- return `{ verified:false, reason }` with no assertion on trust failure;
- let authenticated Admin proxy displayed PNG bytes to FIA without moving cryptographic trust into the browser.

### FIN-PROOF-I — rich-card verification UI — implemented

- Thread Presentation carries FIA-issued cards whose proof state is verified;
- Admin's reusable FIN-card component fetches the exact front/back PNGs it displays and asks FIA to verify each;
- the component shows `✓ Verified by Fibre` only when both sides verify and describe the same credential;
- an expandable view renders key/value data derived only from the trusted embedded assertions;
- the UI does not infer "latest" or "obsolete" from authenticity alone.

Latest-revision awareness is intentionally deferred. If Fibre later needs it, it can compare trusted `revision` / `issuedAt` against FIA's known issuance history without changing or re-signing historical cards.

## Acceptance criteria

The FID vertical is not complete until all of these hold:

1. Thread birth and FIN assignment succeed with no FID Card.
2. A caller cannot author FIN, identity fields, or arbitrary photo bytes into a normal issuance request.
3. Issuance fails when no canonical FIN/civil registration exists.
4. Issuance fails when FID photo admission fails.
5. The admitted FID photo is provenance-bound to the Thread's visual identity.
6. Exactly one active FID credential exists per FIN under normal policy.
7. Reissue creates a new credential and supersedes, rather than overwrites, the prior credential.
8. Historical PNGs remain cryptographically authentic; when multiple authentic cards are known, revision and issue date establish chronology without changing older cards.
9. Public output consists of exactly `front.png` and `back.png`.
10. The two sides are cryptographically bound to the same credential and cannot be mixed across issuances.
11. The protected machine credential includes the exact normalized FID photo and its provenance/admission digests.
12. Each final PNG carries a valid `fibre.fin-card-proof.v1` assertion signed by the accepted FIA issuer key and bound to the exact raw deterministic render.
13. Verification returns the embedded public assertion only after signature and render-digest checks pass.
14. The issuer identity/key is cryptographically verifiable under the accepted Fibre Identity Authority trust policy.
15. Durable semantic state and objects flow only through modern Fibre service contracts / `InfraDriver`; no app or browser reaches provider-specific storage.
16. Thread Editor inspects and operates the workflow only through modern Fibre interfaces.

## Authority summary

| Thing | Owner | FID relationship |
| --- | --- | --- |
| `threadId` | Fibre runtime | consumed |
| FIN | Birth Center / Civil Registry | permanent identity; consumed read-only |
| civil birth registration | Birth Center / Civil Registry | consumed read-only |
| portrait embodiment / canonical visual identity | embodiment authority | source authority only |
| FID photo | FID photo derivation + admission policy | derived, admitted credential input |
| FID credential lifecycle | Fibre Identity Authority | authoritative |
| front/back rendering | FID Renderer | deterministic derived artifact |
| FIN-card proof signing / embedding / verification | Fibre Identity Authority + native proof module | Fibre-only tamper-evidence mechanism |
| final front/back bytes | InfraDriver objects | immutable credentialed artifacts |
| FID lifecycle bookkeeping | Fibre Identity Authority / FidCardRegistry | issuance history and latest known revision; not part of embedded proof verification |
| Thread Presentation | Thread Presentation | consumes active admitted projection only |

Nothing in this contract makes card pixels, a generated portrait, or a valid FIN proof into Thread history, memory, meaning, cognition, or embodiment authority.
