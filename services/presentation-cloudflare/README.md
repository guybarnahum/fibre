# Fibre Presentation — Cloudflare runtime

Cloudflare runtime adapter for Fibre Thread Presentation.

This service is a deployment boundary, not a new Thread authority. It composes the Fibre-owned `PresentationServer` with the general `cloudflare-v1` `InfraDriver`.

Current P3 runtime profile:

```text
PresentationServer
      |
      v
InfraDriver cloudflare-v1
  streams    -> per-Thread SQLite Durable Object
  realtime   -> Durable Object WebSocket Hibernation
  objects    -> R2
  catalog    -> D1
  workflows  -> Cloudflare Workflows
```

The public API is read-only:

```text
GET /healthz
GET /api/threads/:threadId/snapshot
GET /api/threads/:threadId/events?after=N
WS  /api/threads/:threadId/stream?after=N
GET /api/threads/:threadId/media/:objectRef
```

A channel must carry an explicit `publiclyVisible: true` catalog projection before the read API exposes it. Media bytes are additionally gated by a `public_presentation_media` catalog projection created only after the credentialed asset publisher verifies and admits `media.ready`.

There is no generic R2/object browser endpoint.

## Local P3 fixture mode

`wrangler.local.jsonc` enables only the frozen P2 Cần Thơ candidate and configures:

```text
P3_FIXTURE_MODE=1
VIEWER_ORIGIN=http://localhost:5173
C2PA_SIGNER_URL=http://127.0.0.1:8790
```

Development-only fixture seams:

```text
POST /__p3/fixtures/can-tho
POST /__p3/fixtures/can-tho/generate-market
GET  /__p3/workflows/:jobId
```

The seed route accepts only `thr_pr39_g2_04` with `lifecycleStatus=genesis_candidate` and `fixture=true`. The media route plans exactly the existing `media_place_market` placeholder from the current presentation snapshot. These routes are absent when fixture mode is disabled.

## Final P3 generated-media proof

The final proof uses one real market reconstruction rather than fanning out all eleven eligible still-image jobs:

```text
Cần Thơ presentation snapshot
        -> ThreadPresentationAssetPlanner
        -> AssetGenerationService
        -> InfraDriver.workflows
        -> Cloudflare Workflow
        -> witnessed OpenAI GPT Image 2 request
        -> raw image bytes
        -> immutable GenerationRecord in R2
        -> C2PA Content Credential embed/verify
        -> final credentialed image in R2
        -> immutable StoredAssetReceipt
        -> credential re-verification
        -> media.ready at presentation sequence 1
        -> D1 public-media projection
        -> HTTP/WebSocket viewer consumption
```

The provider adapter pins `gpt-image-2-2026-04-21` and records the exact provider-facing request after removing the API secret. The public C2PA assertion uses `digest_only` prompt disclosure.

Because the official browser/WASM C2PA package does not yet expose the byte-oriented verification API needed by Cloudflare Workers, this local P3 proof uses `services/c2pa-local` as an isolated Node sidecar running the official `@contentauth/c2pa-node` SDK. It is an adapter implementation, not Fibre authority and not a production trust service.

### 1. Start the local C2PA service

The C2PA Node package requires Node.js 22.22 or later:

```bash
node --version
sh services/c2pa-local/generate-dev-cert.sh   # once; skip if .fibre/p3-c2pa already exists
npm install --prefix services/c2pa-local --no-package-lock
npm start --prefix services/c2pa-local
```

Leave it running on `127.0.0.1:8790`.

### 2. Initialize and start the Cloudflare runtime

Fibre's normal root `.env` supplies `OPENAI_API_KEY`; no Cloudflare infrastructure keys are needed for local mode.

```bash
npx wrangler@latest d1 execute fibre-presentation-local \
  --config services/presentation-cloudflare/wrangler.local.jsonc \
  --local \
  --file packages/infra/cloudflare/d1/0001_fibre_catalog.sql

npx wrangler@latest dev \
  --config services/presentation-cloudflare/wrangler.local.jsonc \
  --env-file .env \
  --port 8787
```

Wrangler locally simulates D1, R2, Durable Objects, and Workflows. No production Cloudflare resources are touched.

### 3. Seed and run the one-image proof

In another terminal:

```bash
node tools/presentation/seed-p3-can-tho-cloudflare-local.mjs
node tools/presentation/prove-p3-generated-media-local.mjs
```

The proof waits for the asynchronous Workflow, requires the first semantic presentation event to be `media.ready` sequence `1`, downloads the image only through the guarded public-media endpoint, re-verifies its C2PA assertion, and saves a local copy under ignored `artifacts/generated/`.

The successful result must show:

```text
lifecycleStatus  genesis_candidate
fixture          true
eventSequence    1
c2pa.valid        true
provenanceClass  generated_reconstruction
provider         openai
model            gpt-image-2-2026-04-21
promptDisclosure digest_only
```

Exact prompt text must not appear in the public C2PA assertion.

### 4. Run the actual insidefibre viewer

From the `insidefibre.com` P3 branch:

```bash
VITE_FIBRE_PRESENTATION_URL=http://127.0.0.1:8787 npm run dev
```

Open `/meet/fixture/can-tho`. The market slot should render the generated image from the `media.ready` overlay while the underlying snapshot media packet remains unchanged and the page remains explicitly labeled as an unpublished candidate fixture.

## Production resource configuration

`wrangler.local.jsonc` is intentionally local-only. Its all-zero D1 identifier must never be deployed as production configuration.

A production/staging config will be created only after resources and production signing trust are provisioned. Expected bindings are:

```text
PRESENTATION_CHANNELS   Durable Object namespace
PRESENTATION_OBJECTS    private R2 bucket
PRESENTATION_CATALOG    D1 database
ASSET_GENERATION        Cloudflare Workflow binding
```

Production deployment credentials belong to Wrangler authentication / CI secrets, not Fibre application `.env`.

## Current limits after P3

- no browser write/message API yet;
- only one generated asset is required for the P3 proof; bulk generation belongs to later media work;
- local C2PA sidecar certificate is not a production trust credential;
- Cloudflare-native byte-oriented C2PA verification remains deferred until an upstream-supported Worker API exists;
- no production/staging resource IDs yet;
- local fixture mode is validation scaffolding only;
- generated media remains presentation reconstruction and cannot become Thread history, memory, meaning, or embodiment evidence through this path.
