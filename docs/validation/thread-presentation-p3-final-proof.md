---
id: validation-thread-presentation-p3-final-proof
status: proposed
last-reviewed: 2026-08-21
canonical: false
---

# Thread Presentation P3 — final end-to-end proof

## Status

**NEEDS MAINTAINER VALIDATION.**

P0, P1, P2 and the earlier P3 viewer/Cloudflare transport slices have already been maintainer-tested. This document defines the remaining blocking proof before P4 viewer-contract validation begins.

The proof is deliberately one generated asset, not a media-production pass.

## What P3 must prove

The final vertical is:

```text
frozen Cần Thơ P2 presentation fixture
        |
        v
ThreadPresentationAssetPlanner
        |
        v
one eligible media_place_market job
        |
        v
AssetGenerationService
        |
        v
InfraDriver.workflows
        |
        v
Cloudflare Workflow
        |
        v
witnessed OpenAI GPT Image 2 generation
        |
        v
immutable GenerationRecord
        |
        v
signed C2PA Content Credential
        |
        v
final immutable asset in R2
        |
        v
immutable StoredAssetReceipt
        |
        v
credential re-verification
        |
        v
PresentationServer media.ready sequence 1
        |
        v
D1 public-media serving projection
        |
        v
HTTP/WebSocket presentation protocol
        |
        v
insidefibre.com generic viewer
```

The Thread remains:

```text
threadId         thr_pr39_g2_04
lifecycleStatus  genesis_candidate
fixture          true
```

Nothing in this proof births or publishes the candidate as a live Thread.

## Why the market slot

The first real asset is `media_place_market` rather than a portrait or memory reconstruction.

- the slot already has presentation-authorized place text;
- it does not require missing embodiment authority;
- it avoids making the first generative proof depend on autobiographical-memory reconstruction choices;
- its output remains clearly `generated_reconstruction`.

Portrait remains `deferred_missing_embodiment_brief`.

## Real provider

The first provider adapter is:

```text
providerId  openai-image-v1
model       gpt-image-2-2026-04-21
endpoint    /v1/images/generations
size        1024x1024
quality     medium
format      png
```

The provider request witness preserves the exact request body sent to OpenAI after the authorization secret is removed. `OPENAI_API_KEY` must never appear in `GenerationRecord`, Content Credentials, object metadata, presentation events, or viewer data.

The exact model snapshot is intentional so the provenance record identifies the execution model rather than a moving alias.

## C2PA runtime boundary for P3

Fibre's accepted contract remains `ContentCredentialSigner`; C2PA is an adapter implementation.

The official Node C2PA SDK can sign and validate buffer assets. The official browser/WASM package does not yet provide the supported byte-oriented non-browser verification entry point required for Cloudflare Workers. P3 therefore uses an isolated local-only Node sidecar:

```text
Cloudflare Workflow
       |
       | HTTP on developer machine
       v
services/c2pa-local
  @contentauth/c2pa-node
```

This is a runtime accommodation, not a domain dependency.

The local sidecar:

- binds only to `127.0.0.1`;
- uses the official `@contentauth/c2pa-node` package;
- embeds `trainedAlgorithmicMedia` creation intent;
- embeds Fibre custom assertion `com.insidefibre.asset-generation.v1`;
- signs with a short-lived local development ES256 certificate under ignored `.fibre/`;
- validates the signed C2PA structure/signature with production trust-chain validation disabled for the self-signed development certificate.

This proves real embedded C2PA mechanics, not production public trust. Production signing credential/KMS/HSM or service binding remains separate work.

## Prompt/provenance requirement

The generated asset must preserve:

```text
private immutable GenerationRecord
  semantic brief text
  exact provider request witness
  semanticBriefDigest
  providerRequestDigest
  providerOutputDigest
  provider/model/configuration

public embedded C2PA
  provenanceClass = generated_reconstruction
  generationRecordDigest
  semanticBriefDigest
  providerRequestDigest
  providerOutputDigest
  provider/model
  promptDisclosure.mode = digest_only
```

Exact semantic/provider prompt text must be absent from the public credential in this proof.

## Fibre contract validation

From the Fibre repository:

```bash
git fetch origin
git switch agent/thread-presentation-milestones-v1
git pull --ff-only

git status --short

node --test services/asset-generator/test/provider-adapters.test.mjs
node --test services/asset-generator/test/credentialed-asset-generation.test.mjs
node --test services/world-kernel/test/thread-presentation-asset-publisher.test.mjs
node --test packages/infra/test/cloudflare-v1.test.mjs
node --test packages/infra/test/cloudflare-presentation-ports.test.mjs
node --test services/presentation-cloudflare/test/presentation-read-api.test.mjs
node --test tools/test-infra/test-suite-lifecycle.test.mjs

npm run includes:check
npm run validate
npm test

git diff --check agent/pr39-genesis-childhood-birth-v1...HEAD
```

All must pass.

## Local real-provider proof

### Terminal A — actual C2PA signer/verifier

The current C2PA Node package requires a sufficiently recent Node 22 runtime. Check first:

```bash
node --version
```

Then:

```bash
sh services/c2pa-local/generate-dev-cert.sh
npm install --prefix services/c2pa-local --no-package-lock
npm start --prefix services/c2pa-local
```

The certificate helper is one-shot. If `.fibre/p3-c2pa/` already exists from a previous setup attempt, do not regenerate it unless intentionally deleting that local-only state first.

Expected health endpoint:

```text
http://127.0.0.1:8790/healthz
```

### Terminal B — actual local Cloudflare runtime

The root `.env` must contain `OPENAI_API_KEY`. No Cloudflare infrastructure credential is needed for local simulation.

Initialize local D1 if necessary:

```bash
npx wrangler@latest d1 execute fibre-presentation-local \
  --config services/presentation-cloudflare/wrangler.local.jsonc \
  --local \
  --file packages/infra/cloudflare/d1/0001_fibre_catalog.sql
```

Start the Worker and local Workflow:

```bash
npx wrangler@latest dev \
  --config services/presentation-cloudflare/wrangler.local.jsonc \
  --env-file .env \
  --port 8787
```

The runtime must report bindings for R2, D1, Durable Objects and `ASSET_GENERATION` Workflow.

### Terminal C — seed and generate

For a fresh local P3 runtime whose presentation cursor is still zero:

```bash
node tools/presentation/seed-p3-can-tho-cloudflare-local.mjs
node tools/presentation/prove-p3-generated-media-local.mjs
```

The proof tool:

1. checks the actual C2PA sidecar;
2. schedules `media_place_market` through `AssetGenerationService -> InfraDriver.workflows`;
3. waits for Cloudflare Workflow completion;
4. requires an admitted `media.ready` event;
5. requires that event to be presentation sequence `1`;
6. fetches the final image only through the guarded presentation-media HTTP endpoint;
7. requires `X-Fibre-Provenance: generated_reconstruction`;
8. verifies the downloaded asset again through the real C2PA SDK;
9. requires `promptDisclosure=digest_only` with no embedded prompt text;
10. writes a convenience copy under ignored `artifacts/generated/`.

A successful result should contain the following semantic facts, with implementation-specific IDs/digests omitted here:

```json
{
  "ok": true,
  "threadId": "thr_pr39_g2_04",
  "lifecycleStatus": "genesis_candidate",
  "fixture": true,
  "mediaId": "media_place_market",
  "eventSequence": 1,
  "c2pa": {
    "valid": true,
    "provenanceClass": "generated_reconstruction",
    "provider": "openai",
    "model": "gpt-image-2-2026-04-21",
    "promptDisclosure": "digest_only"
  }
}
```

## insidefibre.com proof

Use branch:

```text
agent/p3-thread-viewer-foundation-v1
```

Validate:

```bash
git fetch origin
git switch agent/p3-thread-viewer-foundation-v1
git pull --ff-only

npm test
npm run build
npm run cf:check
git diff --check main...HEAD
```

Expected viewer tests now include the prior five plus a test that `media.ready` creates a viewer overlay without mutating the immutable media packet.

With Fibre Worker still running:

```bash
VITE_FIBRE_PRESENTATION_URL=http://127.0.0.1:8787 npm run dev
```

Open:

```text
http://localhost:5173/meet/fixture/can-tho
```

Required visible result:

- fixture disclosure still says unpublished Genesis candidate / not a live Thread;
- market place slot shows the real generated image;
- caption identifies it as `generated reconstruction · credentialed presentation media`;
- stream display is the live Fibre presentation stream with cursor `1`;
- no portrait is invented;
- `/meet` remains unaffected.

## Failure conditions

P3 remains HOLD if any of the following occurs:

- image generation occurs on the HTTP request path rather than the Workflow;
- exact provider request cannot be recovered from the immutable GenerationRecord;
- API secret enters any persisted or public provenance;
- C2PA cannot be embedded or independently re-verified;
- prompt text appears in public C2PA under the default policy;
- raw provider bytes are served instead of the final credentialed asset;
- `media.ready` is emitted before credential re-verification;
- the event is not sequence 1 in a fresh proof runtime;
- R2 object knowledge alone allows public retrieval;
- viewer rewrites the immutable media packet rather than applying an event overlay;
- candidate/live boundary changes;
- generated reconstruction is treated as Thread-life evidence.

Operational provider/model refusal or transient network failure is not permission to weaken any of these conditions.

## P3 exit / P4 entry

After the maintainer reports:

1. Fibre active gates green;
2. real local Cloudflare/Workflow proof green;
3. actual C2PA verification green;
4. insidefibre tests/build/Cloudflare dry-run green;
5. visual viewer proof shows the market image via the real event stream;

P3 may be recorded **CLEAR**.

P4 then begins with the original contract-genericity purpose:

```text
Łódź  -> intentionally sparse/optional presentation fixture
Cusco -> alternate language/place/content-shape fixture
```

P4 must not depend on generating the remaining Cần Thơ media. Bulk image generation and embodiment work remain later media milestones.
