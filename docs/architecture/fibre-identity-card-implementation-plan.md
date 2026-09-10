---
id: architecture-fibre-identity-card-implementation-plan-v0-1
status: accepted
last-reviewed: 2026-09-10
canonical: false
---

# Fibre Identity Card implementation record

## Closure

The Fibre Identity Card vertical is implemented and merged to `main`. The former feature branch is no longer an active development authority.

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
