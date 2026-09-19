---
id: architecture-fibre-identity-card-implementation-plan-v0-1
status: accepted
last-reviewed: 2026-09-19
canonical: false
---

# Fibre Identity Card implementation record

## Closure

The original Fibre Identity Card vertical is implemented and merged to `main`. Current follow-on work on `agent/fin-presentation-work` does not reopen FID identity authority; it adds lifecycle orchestration and closes the staging deployment path around the existing credential.

The architecture contract remains [`fibre-identity-card.md`](./fibre-identity-card.md). Current lived-person execution continues in [`../validation/m2-pr-plan.md`](../validation/m2-pr-plan.md).

FID supports identity continuity inside Fibre true E2E; it does not define the lived-person path.

## Non-negotiable boundaries

- FIN and civil registration remain Birth Center / Civil Registry authority.
- Birth never waits for FID issuance.
- Normal issuance supplies `threadId`, reason and idempotency identity only; callers do not author FIN, identity fields or arbitrary photo bytes.
- Fibre Identity Authority owns issuance, lifecycle, photo admission and current status.
- Thread Presentation may project an active admitted FID; it does not issue cards.
- Thread Editor is an operator/inspection client over Fibre service contracts.
- Durable state/objects flow through `InfraDriver`; browser/app code never reaches provider storage, signing keys or provider-specific APIs.
- Existing Content Credential signing/verification is reused for C2PA.
- Public card output is exactly `front.png` and `back.png`.
- Historical card bytes and issuance records are immutable.

## State-model distinction

Credential lifecycle and issuance workflow state are separate.

```text
credential lifecycle:
active | superseded | revoked | expired

issuance workflow:
requested -> identity_resolved -> photo_pending -> photo_admitted
          -> rendered -> credentialed -> verified -> completed | failed
```

A new credential does not become active, and a prior active credential does not become superseded, until both final PNGs are rendered, credentialed, verified and durably stored. Failed reissue leaves the prior credential active.

## Implemented slice map

```text
A1 registry/domain foundation
A2 issuing authority + lifecycle workflow
B1 photo source/admission
B2 photo derivation fallback
C  deterministic renderer
D1 machine credential signing/encryption
D2 C2PA + immutable object admission
E1 verifier + atomic activation/reissue/revocation
E2 Thread Editor + Thread Presentation + FID vertical closure
```

The resulting authority path is:

```text
already-born Thread + FIN
  -> request FID
  -> resolve civil identity
  -> derive/reuse + admit photo
  -> render front/back
  -> sign/encrypt credential
  -> C2PA embed/verify
  -> immutable store
  -> activate FID
  -> inspect through authorized tooling
  -> project through Thread Presentation
```

## Lifecycle follow-on state — 2026-09-19

The lifecycle seam now lives in Thread Presentation rather than in callers or Admin Dashboard. The private operation is:

```text
reconcileFid(threadId, mode, idempotencyKey)

mode = ensure | reissue
```

Callers provide no FIN, civil identity fields, photo bytes, credential ID or render facts. Thread Presentation queries the current FIA credential, cuts through FIA only when required by the mode, and projects the resulting active credential.

Current state:

- **Lifecycle D1 — complete.** `ensure` reuses an active FIA credential when one exists; `reissue` deliberately cuts through FIA; both project the active credential into Thread Presentation.
- Admin Dashboard `Re-issue FIN Card` now routes through Thread Presentation `POST /internal/fid/reconcile`; Admin no longer calls FIA directly.
- Card replacement owns only `fibre_identity_card_front` and `fibre_identity_card_back`. `official_id_photo` remains Thread visual identity and survives FID replacement.
- The public asset resolver keeps the official ID photo visible when an active FIA card exists.
- **Lifecycle D2 — deferred.** Automatic newborn issuance should trigger only after a ready `official_id_photo` is successfully published; World must not synchronously call FIA.
- **Lifecycle D3 — deferred.** Repair/Observatory reconciliation must remain outside a World -> FIA synchronous authority cycle.
- **Lifecycle D4 — deferred.** Activity may observe FID stages but must not become FID authority.

The earlier staging failure (`POST /api/threads/:threadId/fid/reissue -> 405`) was traced to deployment skew: Admin had the D1 route while staging Thread Presentation had not yet been redeployed with the lifecycle binding. The repository now contains the required Cloudflare deployment composition, including the Fibre C2PA signer described below, but a successful live staging acceptance of the complete path is still required.

### Staging C2PA posture

For current staging, Fibre uses its own C2PA signer and its own verification policy. Public C2PA Trust List acceptance is deliberately deferred.

The Cloudflare composition is:

```text
FIA Worker
  -> CONTENT_CREDENTIAL_SIGNER service binding
  -> Fibre Content Credential Signer Worker
  -> Cloudflare Container running @contentauth/c2pa-node
```

The Container is required because `@contentauth/c2pa-node` depends on native Linux binaries. This is deployment composition, not a new `InfraDriver` capability. The signer is configured as `fibre-c2pa-self-v1` with `fibre_signature_only`; signing succeeds only under Fibre's configured certificate chain. Public Trust List/conformance work remains deferred.

The operator path now bootstraps missing Workers while configuring secrets and deploys the signer before dependent services. Cloud deployment does not require an operator-supplied public `C2PA_SIGNER_URL`; FIA reaches the signer through the Cloudflare service binding.

## Closure invariants

The completed vertical preserves:

- birth independence from FID issuance;
- authority-owned identity resolution;
- admitted photo provenance tied to Thread visual identity;
- exactly one active credential per FIN;
- immutable historical credentials;
- front/back cryptographic pairing;
- authenticity distinct from current validity/revocation state;
- provider-neutral service/InfraDriver boundaries;
- public projection without leaking signing keys or storage/provider internals.

Fibre true E2E is broader:

> **rich-life birth -> lived current situation -> visual meeting -> contextual interaction -> experience -> selective durable consequence -> continued life**

The FID vertical is therefore closed unless a concrete M2 capability exposes an identity-card regression or missing boundary.
