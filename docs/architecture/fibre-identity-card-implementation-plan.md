---
id: architecture-fibre-identity-card-implementation-plan-v0-1
status: active
last-reviewed: 2026-09-09
canonical: false
---

# Fibre Identity Card implementation plan

## Development branch

This work is developed on:

```text
agent/fid-card-issuance
```

The branch was created directly from current `main` at:

```text
854d3868752897c105f23490e9a9b6fab7a149ba
```

No pull request is required. Each implementation slice is validated locally before the next slice begins. The architecture contract remains [`fibre-identity-card.md`](./fibre-identity-card.md).

## Non-negotiable boundaries

- FIN and civil registration remain Birth Center / Civil Registry authority.
- Birth never waits for FID issuance.
- A normal issuance request supplies `threadId`, reason and idempotency identity only; callers do not author FIN, identity fields or arbitrary photo bytes.
- Fibre Identity Authority owns FID issuance, lifecycle, photo admission and current status.
- Thread Presentation consumes the active admitted FID projection; it does not issue cards.
- Thread Editor is an operator/inspection client over modern Fibre service contracts only.
- Durable state and objects flow through `InfraDriver`; browser/app code never reaches SQLite, D1, R2, S3, signing keys or provider-specific APIs.
- The existing `ContentCredentialSigner` service is reused for C2PA embed/verify.
- Public card output is exactly `front.png` and `back.png`.
- Historical card bytes and issuance records are immutable.

## Important state-model distinction

Credential lifecycle and issuance workflow state are separate.

Credential lifecycle:

```text
active | superseded | revoked | expired
```

Issuance workflow may require internal states such as:

```text
requested
identity_resolved
photo_pending
photo_admitted
rendered
credentialed
verified
completed
failed
```

A new credential does **not** become `active`, and a prior active credential does **not** become `superseded`, until the new front/back PNGs have both been rendered, credentialed, C2PA-verified and durably stored. A failed reissue leaves the old credential active.

## Slice map

The architecture groups work into phases A-E. Development uses smaller independently provable slices beneath those phases.

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

---

## Slice A1 — FID registry and domain foundation

Goal: establish the provider-neutral FID authority state model without rendering or crypto.

Implement:

- Fibre Identity Authority service boundary and FID domain invariants;
- durable `FidCardRegistry` through `InfraDriver.state`;
- credential identity, revision, FIN/thread/registration linkage and immutable issuance history;
- read APIs by `threadId`, FIN and `credentialId`;
- lifecycle representation for `active`, `superseded`, `revoked`, optional `expired`;
- one-active-per-FIN invariant in the registry model;
- no direct SQLite/D1 knowledge in semantic service code.

Proof gate:

- registry survives reopen through Infra state;
- FIN/thread mismatch is rejected;
- historical credentials cannot be overwritten;
- two simultaneously active credentials for one FIN cannot be committed;
- no rendering, C2PA or Thread Editor dependency is introduced.

## Slice A2 — Issuing authority and issuance workflow

Goal: make issuance authority-owned and idempotent without prematurely activating a credential.

Implement:

- `issueFidCard({ threadId, reason, idempotencyKey })` service contract;
- authoritative civil-registration/FIN resolution through a modern Fibre service boundary;
- rejection when Thread/FIN/civil registration does not exist;
- detection of existing active credential;
- separate issuance-workflow record/state from credential lifecycle;
- idempotent retry of the same issuance request;
- reissue intent records the prior active credential but does not supersede it yet;
- `revokeFidCard({ credentialId, reason })` authority contract may be introduced here, while final status semantics are proven in E1.

Proof gate:

- caller cannot supply FIN/name/date/photo as authoritative issuance data;
- repeated idempotent request resolves to one issuance workflow;
- failed/incomplete reissue leaves the previous credential active;
- birth/FIN assignment path remains unchanged.

## Slice B1 — FID photo source and admission

Goal: prove that Fibre never credentials an arbitrary image.

Implement:

- resolve candidate photo only from admitted Thread visual-identity/official-photo sources;
- provider-neutral photo-admission contract;
- provenance continuity to the Thread canonical visual reference;
- exactly-one-face check;
- face visibility/occlusion policy;
- crop, dimensions, pose and framing policy;
- visual-identity continuity policy;
- age-consistency check against issuance snapshot;
- immutable `FidPhotoAdmission` receipt with explicit rejection reasons;
- block issuance progression when admission is rejected.

Proof gate:

- arbitrary caller image is impossible through normal issuance API;
- wrong-Thread provenance is rejected;
- zero/multiple/unusable faces are rejected;
- accepted photo produces deterministic admission receipt/provenance digest.

## Slice B2 — FID photo derivation fallback

Goal: produce a valid FID photo when no currently admitted official photo satisfies policy.

Implement:

- reuse an existing admitted official Thread photo when still valid;
- otherwise request a derived FID-photo asset from the canonical visual reference through modern Asset Generation service contracts;
- administrative head-and-shoulders pose/framing;
- relevant age adjustment;
- neutral background/lighting;
- muted color treatment, not black-and-white;
- no glamour/editorial/cinematic styling;
- generated/transformed asset must pass the same B1 admission gate before use.

Proof gate:

- source reference and generation/transformation provenance are retained;
- no generated photo bypasses admission;
- identical admitted source/policy is idempotent and does not create duplicate demand unnecessarily.

## Slice C — Deterministic FID renderer

Goal: produce the two visual credential surfaces from an issuer-authorized snapshot only.

Implement:

- versioned template inputs:
  - `back`
  - `front-base-layer`
  - `front-upper-layer` with transparency;
- populate the base only from the authority-resolved identity snapshot and admitted FID photo;
- derive upper-layer stamps/watermark from the admitted FID photo;
- deterministic composition into final `front.png`;
- deterministic `back.png`;
- do not publish intermediate layers;
- compute raw `frontRenderDigest` and `backRenderDigest` and bind both to one issuance identity.

Proof gate:

- same issuance snapshot + template version produces identical raw PNG bytes/digests;
- changing any identity/photo/template input changes the expected digest;
- public output set is exactly front/back;
- renderer has no authority/store/provider access.

## Slice D1 — Machine credential signing and encryption

Goal: create the self-contained machine credential before C2PA embedding.

Implement:

- canonical `fibre.fid-card.v1` payload;
- include exact normalized FID photo bytes (or equivalent self-contained recoverable C2PA ingredient) plus photo/provenance/admission digests;
- include credential ID/revision, FIN, Thread/civil-registration linkage, identity snapshot, issuer identity and paired render digests;
- provider-neutral Fibre Identity Authority signing interface/profile;
- inner issuer signature;
- authenticated encryption envelope under deployment-selected policy;
- minimal public routing assertion policy distinct from encrypted private payload;
- key/algorithm details remain integration/deployment concerns, not Thread semantics.

Proof gate:

- canonicalization is deterministic;
- payload tampering breaks issuer verification;
- unauthorized reader cannot decrypt protected fields;
- authorized reader can recover the exact embedded photo and verify its digest;
- signer/key identity is explicit and policy-verifiable.

## Slice D2 — Existing C2PA service and immutable object admission

Goal: bind the credential cryptographically to both PNGs using Fibre's existing Content Credential service.

Implement:

- `com.insidefibre.fid-card.v1` C2PA custom assertion;
- reuse existing `ContentCredentialSigner.embed()` / `verify()` service boundary;
- embed the same issuance identity and paired raw render digests into both sides, with explicit `side`;
- C2PA-sign and verify `front.png` and `back.png`;
- compute final post-embedding digests;
- store final credentialed bytes immutably through `InfraDriver.objects`;
- persist immutable object/provenance receipt references;
- do not mark credential active yet unless both sides pass verification and storage.

Proof gate:

- tampered PNG fails C2PA verification;
- front from one issuance cannot pair with back from another;
- final stored digest is the post-C2PA digest;
- raw/unverified outputs cannot become public/active FID assets.

## Slice E1 — Verification, activation, reissue and revocation

Goal: close authority semantics only after the complete credential is verified and durable.

Implement:

- verifier contract for:
  - C2PA hard binding;
  - accepted Fibre Identity Authority signer/trust policy;
  - paired front/back identity;
  - encrypted-payload recovery/decryption when authorized;
  - inner issuer signature;
  - embedded photo/digest;
  - issuance/provenance linkage;
  - online credential status;
- atomic finalization of a successful issuance;
- first issuance becomes active only after both final objects are verified/durable;
- successful reissue atomically activates new credential and supersedes old active credential;
- explicit revocation path;
- authenticity and current validity remain separate results.

Proof gate:

- failed reissue never invalidates the prior active card;
- exactly one active FID remains per FIN;
- superseded/revoked historical cards remain cryptographically authentic but status-invalid;
- offline verification reports authenticity without pretending to know fresh revocation state.

## Slice E2 — Thread Editor, Thread Presentation and FID vertical closure

Goal: make FID operational and inspectable without breaking authority boundaries.

Implement:

- modern Fibre Identity Authority service API exposed to authorized operator clients;
- Thread Editor inspection views for:
  - current/historical credentials;
  - issuance workflow;
  - photo admission/provenance;
  - issuer/trust identity;
  - front/back asset refs/digests;
  - verification result/status;
- Thread Editor actions for authorized issue/reissue/revoke calls only through service contracts;
- Thread Presentation consumes only the active admitted FID projection;
- insidefibre.com consumes presentation/media refs, never provider URLs;
- close the FID vertical across its existing authority boundaries:

```text
already-born Thread + FIN
  -> request FID
  -> resolve identity
  -> derive/reuse + admit photo
  -> render front/back
  -> sign/encrypt credential
  -> C2PA embed/verify
  -> immutable store
  -> activate FID
  -> inspect in Thread Editor
  -> project through Thread Presentation
```

Then prove reissue and revocation on the same FIN.

This is **FID vertical closure**, not Fibre's true end-to-end experience. Fibre true E2E is a product-level path: birth a richly constituted Thread, meet that Thread through rich visual embodiment, interact with the Thread in context, and allow that interaction to become an experience with selective durable consequences. FID supports identity continuity inside that path; it does not define the path.

Proof gate:

- no manual DB/object manipulation is needed across normal FID authority operations;
- Thread birth succeeds independently with no FID;
- Thread Editor/browser never sees signing keys or provider-specific storage;
- public/consumer presentation contains only policy-admitted active credential data/media.

## Development discipline

For every slice:

1. implement only that slice's semantic capability;
2. add focused tests that prove its invariants;
3. run the focused tests locally;
4. run `npm run check`;
5. inspect `git diff --stat` and clean status;
6. stop and validate before beginning the next slice.

Do not weaken existing gates to make a slice pass. Do not migrate unrelated stores or infrastructure for symmetry. Infrastructure work is justified only when required by the FID vertical.

## Completion criteria

The FID vertical is complete when the acceptance criteria in [`fibre-identity-card.md`](./fibre-identity-card.md) pass across the FID authority path, including birth independence, authority-owned identity resolution, photo admission, one active credential per FIN, immutable history, two-side cryptographic binding, exact embedded photo, existing C2PA verification, cryptographically verifiable issuer identity, and modern `InfraDriver`/service boundaries throughout.

Fibre true E2E is deliberately broader and belongs to the main Thread/personhood roadmap: **rich-life birth -> rich visual meeting -> contextual interaction -> potential experience -> selective durable consequence**.
