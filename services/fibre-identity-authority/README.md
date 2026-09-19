# Fibre Identity Authority

The Fibre Identity Authority owns replaceable FID Card credentials for already-born Threads, including whether a Thread image is admissible for FID use.

It does **not** mint FINs, change civil registration, create visual identity, execute image generation, render cards, or perform C2PA signing. Those responsibilities remain with their owning Fibre boundaries.

Current A1/A2/B1/B2 surface:

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

## Runtime composition

FIA remains provider-neutral. Executable provider composition belongs under `infra/deployments/fibre-identity-authority/`; the Cloudflare host injects an `InfraDriver` for FIA state/objects/workflows plus World, Thread Presentation, Asset Generation, content-credential, issuer-signing, and credential-protection boundaries. A different provider can compose the same FIA service contracts without changing FIA domain code.


## Cloudflare operator secrets

The Cloudflare runtime uses the same operator path as the other Fibre Workers; FIA has no separate secret-provisioning mechanism.

```sh
npm run cloud:configure-secrets -- --file .env --env staging
```

The FIA Wrangler contract declares `FIBRE_PRIVATE_TOKEN`, `C2PA_SIGNER_TOKEN`, `FIA_ISSUER_JWK`, and `FIA_CREDENTIAL_KEY_BASE64` as Worker secrets. `C2PA_SIGNER_URL` is resolved as ordinary runtime configuration. The shared operator reads those names from the Wrangler file and uploads only the values declared for FIA.
