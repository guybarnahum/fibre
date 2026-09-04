---
id: architecture-fibre-identity-card-v0-2
status: proposed
last-reviewed: 2026-09-03
canonical: false
---

# Fibre Identity Card

## Purpose

Define the Fibre Identity Card (FID Card) as a later-issued, cryptographically verifiable credential for an already-born Thread without moving FIN or Thread identity authority into presentation or rendering code.

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

The card is not the Thread's identity. Reissue, redesign, loss, expiry, revocation, rendering changes, or media regeneration may never change `threadId`, FIN, birth registration, history, memory, meaning, or embodiment authority.

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
      +--> front composite PNG
      `--> back PNG
      |
      v
ContentCredentialSigner
      |
      | C2PA + Fibre FID assertion
      v
InfraDriver.objects
      |
      `--> immutable front.png + back.png

FidCardRegistry
      `--> InfraDriver.state
```

Responsibilities:

- **Civil Registry** owns FIN allocation and the permanent one-FIN-per-Thread mapping.
- **Fibre Identity Authority** owns FID issuance policy, credential IDs, lifecycle, photo admission, current status, and the authoritative issuance record.
- **FID Renderer** deterministically renders an already-authorized issuance snapshot. It cannot choose identity facts.
- **ContentCredentialSigner** supplies the existing provider-neutral C2PA `embed()` / `verify()` mechanism. It does not decide whether a Thread qualifies for a card.
- **Thread Presentation** consumes the active FID projection and card media; it does not issue credentials.
- **Thread Editor** is an operator/inspection client over these service contracts; it does not access stores, signing keys, or provider state directly.
- **InfraDriver** remains the only infrastructure boundary for durable state/objects used by this workflow.

The Fibre Identity Authority should have a cryptographically identifiable issuer profile, conceptually:

```text
issuer {
  authorityId = fibre_identity_authority
  keyId
  certificate / publicKeyRef
  validFrom
  validUntil?
  trustPolicy
}
```

Production verifier policy must be able to establish that a valid FID credential chains to an accepted Fibre Identity Authority key/certificate. Signing-key implementation remains outside the semantic contract.

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

Lifecycle states:

```text
active
superseded
revoked
expired       # optional policy when an expiry date exists
```

Rules:

- first successful issuance creates a new immutable credential and marks it `active`;
- a normal replacement, renewal, or correction creates a new credential ID/revision and atomically marks the prior active credential `superseded`;
- loss, compromise, bad issuance, or administrative invalidation may explicitly mark a credential `revoked`;
- reissue never changes FIN or civil registration;
- old PNGs and issuance records remain immutable historical artifacts;
- an old card may remain cryptographically authentic while no longer being currently valid.

Verification must therefore distinguish:

```text
authenticity
  "Was this exact credential issued by Fibre?"

current validity
  "Is this credential still active now?"
```

Online verification should consult the FID status authority. Offline verification can prove embedded authenticity/issuance but cannot prove current non-revocation unless a sufficiently fresh signed status artifact is also available.

## FID photo derivation and admission

The FID Card must not blindly credential an arbitrary image.

The preferred source is the Thread's admitted canonical visual reference / authorized visual identity. The FID photo is a derived presentation artifact adjusted for the credential context, including:

- current/relevant Thread age;
- administrative camera pose and framing;
- head-and-shoulders composition;
- neutral background and lighting;
- muted color treatment rather than black-and-white;
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
  expiresAt?

  issuer {
    authorityId
    keyId
  }

  frontRenderDigest
  backRenderDigest
}
```

The embedded payload **includes the exact normalized FID photo used for the credential**, not merely an external URL. It also carries a digest so a verifier can compare the embedded photo with the visible rendered portrait and the Fibre provenance chain.

If encoding the photo as a C2PA ingredient or other embedded binary form is more appropriate than literal inline bytes, that representation is acceptable only if the credential remains self-contained and the verifier can recover and verify the exact credential photo.

## Signing, encryption and C2PA

Encryption and signatures serve different purposes:

- a **signature** proves issuer/authenticity and detects modification;
- **encryption** hides protected machine-readable values from clients that do not have decryption authority.

The planned credential structure is therefore layered:

```text
canonical FID payload
      |
      v
Fibre Identity Authority signature
      |
      v
signed FID payload
      |
      v
authenticated encrypted envelope
      |
      v
Fibre FID C2PA assertion
      |
      v
C2PA sign + embed into front/back PNGs
```

The exact encryption algorithm, recipient/key-distribution model and key rotation belong to the crypto integration/deployment policy. They must not leak into Thread or presentation semantics.

A bounded public outer assertion can remain readable for routing and issuer verification while the complete identity payload is encrypted. Conceptually:

```text
com.insidefibre.fid-card.v1 {
  schema
  credentialId
  revision
  fin
  side: front | back
  issuerAuthorityId
  issuerKeyId
  issuedAt
  encryptedCredentialDigest
  issuanceRecordDigest
  frontRenderDigest
  backRenderDigest
  encryptedCredential
}
```

If policy later determines that FIN itself should also be hidden from generic file readers, the public assertion can carry only a credential locator/digest while FIN remains inside the encrypted envelope. That disclosure choice is policy; authenticity requirements are unchanged.

### Reuse existing Content Credential service

FID issuance should reuse Fibre's existing provider-neutral `ContentCredentialSigner` / C2PA service rather than introduce a parallel signer. The existing service's `embed()` / `verify()`, `signerId` and `trustPolicy` boundary is the right mechanism.

FID should use a dedicated issuer/signing profile or accepted trust identity for Fibre Identity Authority credentials, separate in policy from ordinary generated-media provenance even if the same signing service implementation is used.

This complements the existing generated-asset provenance architecture:

```text
canonical visual reference
      |
      v
FID photo transformation
      |
      v
C2PA / immutable derivation provenance
      |
      v
admitted FID photo
      |
      v
FID issuance + render
      |
      v
Fibre Identity Authority C2PA credential
      |
      +--> front.png
      `--> back.png
```

The FID assertion is a sibling to `com.insidefibre.generated-asset.v1`; FID identity semantics must not be encoded by pretending the card is merely another generated-media asset.

## Front/back cryptographic binding

The front and back are one credential and must not be mix-and-matchable across issuances.

Before final C2PA embedding, Fibre computes deterministic render digests for both sides. The same issuance payload contains both:

```text
frontRenderDigest
backRenderDigest
credentialId
issuanceRecordDigest
```

Each side's credential declares its own `side` while carrying the same paired digests. A verifier can therefore reject the authentic front of one card paired with the authentic back of another.

After C2PA embedding changes the PNG bytes, Fibre computes and stores final credentialed-object digests according to the existing generated-asset provenance rule.

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
  expiresAt?

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
  c2pa {
    signerId
    manifestDigestBySide
    validationStatus
    trustPolicy
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
  expiresAt?
  status: active | superseded | expired | revoked
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

Public delivery remains governed by immutable visibility policy. Clients never construct R2/S3/provider URLs.

## Verification model

A capable verifier should be able to perform:

```text
front/back PNGs
      |
      +--> verify C2PA hard binding
      +--> verify accepted Fibre Identity Authority signer/trust policy
      +--> verify both sides share credentialId + paired render digests
      +--> recover encrypted FID credential
      +--> decrypt when authorized
      +--> verify inner issuer signature
      +--> verify embedded FID photo + digest
      +--> verify issuance/provenance digests
      `--> when online, query credential status: active/superseded/revoked/expired
```

A card is not considered successfully issued until the configured C2PA verification gate accepts both final PNGs and the immutable issuance record links to those final bytes.

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
  -> signed/encrypted payload embedded with C2PA
  -> front/back verified and stored
  -> FID becomes active
```

No FID requirement may block Genesis publication or FIN assignment.

## Implementation slices

### Slice A — FID authority and lifecycle

- introduce provider-neutral Fibre Identity Authority / FID issuer contract;
- introduce durable FID registry through `InfraDriver.state`;
- detect existing active credential by FIN/Thread;
- enforce immutable credential IDs/revisions;
- implement `active`, `superseded`, `revoked` and optional `expired` lifecycle;
- prove reissue preserves FIN and atomically supersedes prior active credential.

### Slice B — FID photo admission

- resolve photo source from admitted Thread visual identity, never arbitrary identity fields from caller;
- support reuse of an already-valid official Thread photo;
- otherwise derive administrative/muted-color FID photo from canonical visual reference;
- implement deterministic photo-admission receipt and rejection reasons;
- block issuance when admission fails.

### Slice C — deterministic FID renderer

- admit versioned `back`, `front-base-layer`, `front-upper-layer` templates;
- populate photo/details only from issuer-authorized snapshot;
- derive front-upper stamps/watermark from admitted FID photo;
- output only final `front.png` and `back.png`;
- compute and cross-bind front/back render digests.

### Slice D — encrypted signed credential + existing C2PA service

- define canonical `fibre.fid-card.v1` machine payload including exact FID photo;
- sign payload as Fibre Identity Authority;
- encrypt complete machine credential under deployment policy;
- embed Fibre FID custom assertion using existing `ContentCredentialSigner`;
- C2PA-sign and verify both PNGs;
- persist final post-embedding object digests and issuance receipt.

### Slice E — verification and operator inspection

- provide verifier contract for authenticity, decryption when authorized, front/back pairing and current status;
- expose FID issuance/status/photo admission/provenance through modern Thread Editor service APIs;
- allow authorized operator issuance/reissue/revocation without exposing raw stores, keys or provider details;
- expose active FID projection to Thread Presentation / insidefibre.com under visibility policy.

## Acceptance criteria

The FID vertical is not complete until all of these hold:

1. Thread birth and FIN assignment succeed with no FID Card.
2. A caller cannot author FIN, identity fields, or arbitrary photo bytes into a normal issuance request.
3. Issuance fails when no canonical FIN/civil registration exists.
4. Issuance fails when FID photo admission fails.
5. The admitted FID photo is provenance-bound to the Thread's visual identity.
6. Exactly one active FID credential exists per FIN under normal policy.
7. Reissue creates a new credential and supersedes, rather than overwrites, the prior credential.
8. Revoked/superseded historical PNGs remain cryptographically authentic but verify as not currently active.
9. Public output consists of exactly `front.png` and `back.png`.
10. The two sides are cryptographically bound to the same credential and cannot be mixed across issuances.
11. The machine-readable signed/encrypted payload includes the exact normalized FID photo and its provenance/admission digests.
12. Both final PNGs pass the configured existing C2PA Content Credential verification gate.
13. The issuer identity/key is cryptographically verifiable under an accepted Fibre Identity Authority trust policy.
14. Durable semantic state and objects flow only through modern Fibre service contracts / `InfraDriver`; no app or browser reaches provider-specific storage.
15. Thread Editor inspects and operates the workflow only through modern Fibre interfaces.

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
| signing / C2PA embedding / verification | existing ContentCredentialSigner integration | cryptographic mechanism |
| final front/back bytes | InfraDriver objects | immutable credentialed artifacts |
| FID status | Fibre Identity Authority / FidCardRegistry | active/superseded/revoked/expired authority |
| Thread Presentation | Thread Presentation | consumes active admitted projection only |

Nothing in this contract makes card pixels, a generated portrait, or a valid C2PA credential into Thread history, memory, meaning, cognition, or embodiment authority.
