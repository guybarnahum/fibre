# Fibre Identity Authority

The Fibre Identity Authority owns replaceable FID Card credentials for already-born Threads, including whether a Thread image is admissible for FID use.

It does **not** mint FINs, change civil registration, create visual identity, or execute image generation. Those responsibilities remain with their owning Fibre boundaries.

FIN-card authenticity is moving to a Fibre-native proof owned by FIA: a small public assertion derived from already-authorized issuance facts, signed with the existing FIA Ed25519 issuer key, and embedded directly in each PNG. The assertion/signature contract and deterministic PNG transport are implemented; strict authenticity verification and issuance integration remain the next steps. C2PA is no longer part of the target FIN-card protection architecture; it remains optional future interoperability and may continue independently for generated-media provenance.

Core authority surface:

```text
services/fibre-identity-authority/src/index.mjs
  createFibreIdentityAuthority()
  FidCardRegistry
  FidCardIssuanceStore
  FidPhotoAdmissionStore
```

`FidCardRegistry` persists credential identity and lifecycle through a named `InfraDriver.state` scope. Credential records and lifecycle history are immutable, and the registry maintains the invariant that a FIN has at most one active FID credential.

`FidCardIssuanceStore` uses that same transactional state scope but owns a separate immutable issuance-workflow ledger. This makes issuance progress structurally distinct from credential lifecycle while allowing active-card detection and revision reservation to occur against the same consistency boundary.

Registration of a credential requires an authority-resolved civil-identity witness (`threadId`, FIN, registrationId). Neither FID store is the Civil Registry.

A2 adds the authority-owned issuance request:

```text
issueFidCard({ threadId, reason, idempotencyKey })
```

The normal request shape is exact. Callers cannot supply FIN, registration, name/date identity fields, photo bytes, credential ID, revision, or lifecycle status. The authority resolves the Thread's immutable civil registration through the provider-neutral Civil Registry read service in `services/world-kernel/public/civil-registry-service.mjs`.

A2 records an immutable `identity_resolved` workflow with an authority-derived future credential ID/revision and the current active credential as reissue intent when one exists. It does **not** create or activate the proposed credential, and it does not supersede the prior active credential.

B1 adds:

```text
admitFidPhoto({ workflowId })
```

The caller still cannot supply image bytes or an image reference. The authority resolves an `official_id_photo` candidate through its trusted Thread visual-source boundary, checks canonical visual-reference continuity plus the small FID face/framing/continuity/age policy, and records an immutable admission receipt. Only an accepted receipt opens the photo gate.

B2 adds:

```text
ensureFidPhoto({ workflowId })
```

A currently valid admitted official photo is reused. Otherwise the authority creates one deterministic `official_id_photo` Asset Generation demand from the Thread's admitted canonical visual reference, target age, and FID photo policy. Asset Generator remains the executor. The generated result must return through the same trusted photo-source boundary and pass B1 admission before issuance can progress.

The derivation identity is deliberately independent of FID credential/workflow identity. Equivalent source + policy + target age therefore reuses the same generation demand instead of manufacturing redundant portraits of the same persistent Thread.

## Current cut and presentation boundary

The provider-neutral public service completes the credential path with:

```text
cutFidCard({ threadId, idempotencyKey })
getActivePresentation(threadId)
```

`cutFidCard` drives the existing issuance executor through identity resolution, photo reuse/derivation and admission, deterministic front/back rendering, machine-credential protection, immutable object storage and atomic activation. The target protection path adds FIA-native proof signing/embedding/verification before storage. Callers still do not author identity facts or card bytes.

The previous C2PA embed/verify implementation remains temporarily in the repository during migration but is no longer the target FIN-card architecture.

`getActivePresentation` exposes only the verified active credential material needed by Thread Presentation. Cryptographic keys, protected credential bodies and provider storage details stay behind FIA.

Lifecycle orchestration itself is not owned by FIA. Thread Presentation owns the private `ensure|reissue` reconciliation seam and calls FIA through its neutral boundary; Admin Dashboard therefore never calls FIA directly.


## Runtime composition

FIA remains provider-neutral. Executable provider composition belongs under `infra/deployments/fibre-identity-authority/`; the Cloudflare host injects an `InfraDriver` for FIA state/objects/workflows plus World, Thread Presentation, Asset Generation, issuer-signing, and credential-protection boundaries. A different provider can compose the same FIA service contracts without changing FIA domain code.

The native FIN proof contract lives in `src/fid-card-proof.mjs` and is intentionally provider-independent. It reuses the already-composed FIA issuer signer rather than introducing a separate content-credential provider. `src/fid-card-proof-png.mjs` carries the canonical signed envelope in one private ancillary `fiDP` PNG chunk and can reconstruct the original unsigned render byte-for-byte.


## Cloudflare operator secrets

The Cloudflare runtime uses the same operator path as the other Fibre Workers; FIA has no separate secret-provisioning mechanism.

```sh
npm run cloud:configure-secrets -- --file .env --env staging
```

The target FIA Wrangler contract requires `FIBRE_PRIVATE_TOKEN`, `FIA_ISSUER_JWK`, and `FIA_CREDENTIAL_KEY_BASE64`. `FIA_ISSUER_JWK` already supplies the Ed25519 key used by the protected machine credential and will also sign the public FIN proof.

During migration, checked Cloudflare configuration may still contain legacy C2PA signer bindings/secrets for the old card path. Those are transitional and are scheduled for removal after native proof issuance/verification is integrated and accepted.
