---
id: architecture-fibre-identity-card-v0-1
status: proposed
last-reviewed: 2026-08-25
canonical: false
---

# Fibre Identity Card

## Purpose

Define the presentation contract for Fibre civil identity credentials without moving civil-identity authority into Thread Presentation.

Three identities must remain distinct:

```text
threadId
    canonical Fibre machine identity

FIN / fibreIdentityNumber
    permanent Fibre civil identity
    issued by the Civil Registry at birth

Fibre Identity Card
    replaceable physical/digital presentation credential
```

The card is not the Thread's identity. Reissue, redesign, loss, expiry, replacement, rendering changes, or media regeneration may never change `threadId`, FIN, birth registration, history, memory, meaning, or embodiment authority.

FIN allocation, checksum policy, uniqueness, collision handling and civil-registration persistence remain Birth Center / Civil Registry responsibilities. Thread Presentation only consumes an admitted read projection.

## Presentation dependency

Thread Presentation needs a provider-neutral Civil Registry read contract equivalent to:

```text
getCivilRegistrationForThread(threadId)
  -> {
       threadId,
       fibreIdentityNumber,
       registrationId,
       registeredAt,
       birthEventRef,
       worldRef,
       issuer
     } | null
```

The exact store/API is owned by the Civil Registry workstream. Presentation may validate the public display syntax `XXXX-XX-XXXX`; it must not reproduce the FIN checksum or allocation algorithm.

## Thread Presentation packet v0.2

`thread-presentation-packet-v0.2` preserves the v0.1 life-presentation fields and adds three nullable identity-presentation blocks:

```text
civilIdentity
visualIdentity
identityCard
```

V0.1 remains a supported compatibility boundary for existing golden presentation fixtures.

### `civilIdentity`

Read-only projection of authoritative civil registration:

```text
civilIdentity {
  fibreIdentityNumber
  registrationId
  registeredAt
  birthEventRef
  worldRef
  issuer = fibre_civil_registry
  sourceReferences[]
  provenanceRef          # authoritative_fact
}
```

`civilIdentity` does not mint or mutate any field. A Genesis candidate cannot carry live civil identity through presentation.

### `visualIdentity`

Bounded authorized projection of an admitted portrait embodiment:

```text
visualIdentity {
  projectionVersion = thread-visual-identity-projection-v0.1
  authority = authorized_embodiment_projection
  embodimentId
  embodimentRevision
  specificationDigest
  subjectDescription
  renderDescription
  sourceReferences[]
  permissionReferences[]
  referenceObjectRefs[]
  provenanceRef          # fibre_projection
}
```

This is not a second embodiment authority. The upstream projector must already have applied embodiment rights/visibility rules. The Asset Generator receives only this bounded projection; it may not query hidden Thread state.

### `identityCard`

Replaceable credential presentation:

```text
identityCard {
  credentialVersion = fibre-identity-card-credential-v0.1
  credentialId
  cardSerial
  revision
  supersedesCredentialId?
  registrationId
  displayName?
  dateField? {
    kind: birth_date | entry_date
    value
  }
  issuedAt
  expiresAt?
  status: active | replaced | expired | revoked
  visibility: public | restricted | private
  officialPhotoMediaRef
  machineReadableCredentialRef?
  sourceReferences[]
  provenanceRef          # fibre_projection
}
```

If `visibility` is absent at a compatibility boundary, normalization defaults it to `private`.

The credential deliberately has **no independently writable FIN field**. Card rendering resolves FIN from `civilIdentity`. The card `registrationId` must match the civil record, and `credentialId` / `cardSerial` must be distinct from FIN. A `birth_date` card field must match the presented authoritative subject birth date. The card display name must match the current authorized presented name.

Reissue creates a new credential ID/serial/revision and points at the superseded credential. It preserves the same civil registration and FIN.

## `official_id_photo`

`official_id_photo` is a first-class semantic role inside the existing `ThreadMediaPacket`; it does not require another media protocol.

```text
ThreadMediaAsset {
  kind: image
  role: official_id_photo
  status: placeholder | pending | ready | unavailable
  ...
  provenanceRef -> generated_reconstruction
}
```

The card's `officialPhotoMediaRef` must resolve to that image slot.

The asset remains derived presentation media. A valid Fibre Content Credential proves how Fibre produced the representation; it does not make the image embodiment, identity, history, memory, meaning, or cognition evidence.

## Asset demand

Presentation owns demand reconciliation:

```text
official_id_photo placeholder
  + no admitted visualIdentity
      -> deferred_missing_embodiment

  + admitted visualIdentity
      -> one deterministic AssetGenerationJob

official_id_photo pending
      -> generation_pending, no duplicate job

official_id_photo ready/unavailable
      -> no generation demand
```

For `official_id_photo`, generation identity binds to the normalized visual-identity projection digest rather than card revision or presentation snapshot revision. Reissuing the card therefore does not regenerate the face when the admitted embodiment is unchanged. A changed embodiment projection produces a different generation demand.

The official-photo job contains no FIN, card serial, presentation name, history, autobiographical memory, remembered meaning, relationship state, or hidden Thread state. Its generation inputs are the bounded visual projection, declared media slot/source references and generation policy.

## Official-photo visual policy

The semantic brief asks for administrative photography:

- front-facing or almost front-facing;
- head-and-shoulders standardized framing;
- plain neutral background;
- even, boring administrative lighting;
- ordinary focus and minimal styling;
- no cinematic depth of field;
- no glamour or beauty treatment;
- no dramatic or fashion-editorial pose;
- no text, numbers, cards, QR codes, watermarks or document graphics in the image.

A deterministic presentation-policy variation may add subtle real-ID-photo awkwardness, for example:

- carefully neutral and trying not to smile;
- a little too serious;
- mildly surprised by the shutter;
- faintly stiff or caught at an unflattering instant.

The effect must remain affectionate, natural and dignity-preserving. It must never request caricature, humiliation, grotesque appearance, distress, incompetence or degradation. The policy is optional variation, not a personality claim.

## Card visual design

Fibre should look like Fibre, not a simulated national passport or US driver's license.

### Front

Recommended presentation profile:

```text
FIBRE mark
IDENTITY CARD

[official ID photo]     current authorized display name / honest unnamed treatment
                        FIN
                        authorized birth/entry date when present

small card serial       issue / validity information
```

Visual language:

- warm neutral substrate rather than government-blue plastic imitation;
- dark woven/thread-line geometry as a restrained security/presentation motif;
- clear typographic hierarchy;
- photo framing that feels administrative rather than promotional;
- FIN visibly civil, while card serial is visibly credential-specific.

### Back

Recommended presentation profile:

```text
credential ID / revision
issuer
civil-registration linkage
issue / expiry information
verification area
```

Do not draw a fake QR code merely for realism. A QR/NFC/machine-readable surface becomes active only when Fibre has a real signed verification payload. `machineReadableCredentialRef` is nullable until then.

## Physical / print-ready profile

"Physical" means a credential rendering profile, not evidence that Fibre manufactures plastic cards.

A renderer may define:

- standard card aspect ratio;
- front/back surfaces;
- print-safe margins and bleed;
- photograph and verification areas;
- responsive digital sizing;
- print/PDF export rules.

Those exact CSS, pixels and provider choices are renderer concerns, not identity semantics. The durable credential record is structured data plus media references.

## Public delivery and privacy

Inside Fibre and other clients consume:

```text
ThreadPresentationPacket
      +
ThreadMediaPacket
      |
      +--> identityCard.officialPhotoMediaRef
      |
      +--> stable Fibre media endpoint
```

Clients never construct R2/S3/provider URLs.

The public Cloudflare read path treats identity-card visibility as an immutable snapshot rule. A card that is `private` or `restricted` cannot be returned by the public snapshot endpoint. Its official-photo media cannot be publicly served even if a mutable catalog row is accidentally marked `publiclyVisible: true` or mislabeled with another role. The immutable card `officialPhotoMediaRef` remains the defense-in-depth link.

Generated official-photo publication still requires the normal credentialed-asset verification gate before `media.ready`.

## Asynchronous rendering

Civil identity and the card data do not wait for media generation:

```text
FIN                    ready
civil registration     ready
identity card data     ready
official ID photo      placeholder / pending
```

When the credentialed asset finishes:

```text
media.ready
  -> presentation reducer overlay
  -> official ID photo appears
  -> card renderer uses the same structured credential with final photo
```

Birth never waits for card rendering or image generation.

## Authority summary

| Thing | Owner | Presentation status |
| --- | --- | --- |
| `threadId` | Fibre runtime | consumed |
| FIN | Civil Registry | consumed read-only |
| civil birth registration | Birth Center / Civil Registry | consumed read-only |
| portrait embodiment | embodiment authority | bounded authorized projection only |
| Fibre Identity Card | Thread Presentation credential projection | owned here as replaceable presentation |
| official ID photo | Thread Presentation + Asset Generator | derived reconstruction |
| rendered web/print card pixels | frontend/renderer | derived presentation |
| QR/NFC cryptographic verification | future credential-verification authority | deferred |

Nothing in this contract changes #39 birth/history/memory/meaning semantics or counts as #39 scientific evidence.
