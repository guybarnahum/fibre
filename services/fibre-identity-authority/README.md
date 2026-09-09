# Fibre Identity Authority

The Fibre Identity Authority owns replaceable FID Card credentials for already-born Threads, including whether a Thread image is admissible for FID use.

It does **not** mint FINs, change civil registration, create visual identity, render cards, generate fallback photos, or perform C2PA signing. Those responsibilities remain with their owning Fibre boundaries.

Current A1/A2/B1 surface:

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

The caller still cannot supply image bytes or an image reference. The authority resolves an `official_id_photo` candidate through its trusted Thread visual-source boundary, checks canonical visual-reference continuity plus the small FID face/framing/continuity/age policy, and records an immutable admission receipt. Only an accepted receipt opens the photo gate for later issuance slices; rejection leaves the workflow unadvanced so B2 may derive a better candidate.
