# Fibre Presentation — Cloudflare runtime

Cloudflare runtime adapter for Fibre Thread Presentation.

This service is a deployment boundary, not a new Thread authority. It composes the Fibre-owned `PresentationServer` with the general `cloudflare-v1` `InfraDriver`.

This directory predates ADR-0017's repository split. New provider-specific executable composition belongs under `deployments/`; moving this existing adapter there is deferred to a dedicated refactor rather than being mixed with current Presentation serving changes.

Current local runtime profile:

```text
PresentationServer
      |
      v
InfraDriver cloudflare-v1
  streams    -> per-Thread SQLite Durable Object
  realtime   -> Durable Object WebSocket Hibernation
  objects    -> R2
  catalog    -> D1
  workflows  -> cross-script Cloudflare Workflow binding
                    |
                    v
              Asset Generator deployment
                    |
                    v
              completion Queue
                    |
                    v
              Presentation queue consumer
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

The seed route accepts only `thr_pr39_g2_04` with `lifecycleStatus=genesis_candidate` and `fixture=true`. The generation route intentionally reconciles only the existing `media_place_market` slot so the local proof makes one real provider call rather than fanning out every eligible image. It persists that one presentation demand, dispatches the standalone Asset Generator Workflow, and returns its deterministic demand/job identities.

There is no manual publication route anymore. After generation stores the immutable receipt, the Asset Generator Workflow emits the minimal provider-neutral completion message to the local Queue. The Presentation queue consumer resolves the current durable demand, verifies receipt digest + GenerationRecord + final asset + Content Credential, and only then lets Thread Presentation admit `media.ready`.

## Generated-media boundary proof

The current proof still uses one real market reconstruction rather than fanning out all eligible still-image jobs, but the service boundary is now explicit:

```text
Cần Thơ presentation snapshot
        -> ThreadPresentationAssetPlanner
        -> PresentationAssetDemandService
        -> durable current demand
        -> AssetGenerationService
        -> InfraDriver.workflows
        -> cross-script Asset Generator Workflow
        -> witnessed OpenAI GPT Image 2 request
        -> raw image bytes
        -> immutable GenerationRecord in R2
        -> C2PA Content Credential embed/verify
        -> final credentialed image in R2
        -> immutable StoredAssetReceipt
        -> minimal AssetGenerationCompletion
        -> Cloudflare Queue (at-least-once)
        -> Presentation completion consumer
        -> exact demand/job binding + credential re-verification
        -> media.ready at presentation sequence 1
        -> D1 public-media projection
        -> HTTP/WebSocket viewer consumption
```

The provider adapter pins `gpt-image-2-2026-04-21` and records the exact provider-facing request after removing the API secret. The public C2PA assertion uses `digest_only` prompt disclosure.

### 1. Start the local C2PA service

The published C2PA Node package requires Node.js 22 or later:

```bash
node --version
sh services/c2pa-local/generate-dev-cert.sh   # once; skip if .fibre/p3-c2pa already exists
npm install --prefix services/c2pa-local --no-package-lock
npm start --prefix services/c2pa-local
```

Leave it running on `127.0.0.1:8790`.

### 2. Initialize and start both Cloudflare Workers

Fibre's normal root `.env` supplies `OPENAI_API_KEY`; no Cloudflare infrastructure keys are needed for local mode. The secret belongs to the Asset Generator deployment, not Presentation.

```bash
npx wrangler@latest d1 execute fibre-presentation-local \
  --config services/presentation-cloudflare/wrangler.local.jsonc \
  --local \
  --file packages/infra/cloudflare/d1/0001_fibre_catalog.sql

npx wrangler@latest dev \
  --config services/presentation-cloudflare/wrangler.local.jsonc \
  --config deployments/cloudflare/asset-generator/wrangler.local.jsonc \
  --env-file .env \
  --port 8787
```

The first config is the HTTP-facing Presentation Worker and the Queue consumer. The second is the standalone Asset Generator Cloudflare deployment that owns the Workflow class and Queue producer. Cloudflare's `script_name` Workflow binding connects the scheduling path without a public internal HTTP hop, while the local Queue carries completion after immutable generation output exists. Wrangler locally simulates D1, R2, Durable Objects, Workflows and Queues; no production Cloudflare resources are touched.

### 3. Seed and run the one-image proof

In another terminal:

```bash
node tools/presentation/seed-p3-can-tho-cloudflare-local.mjs
node tools/presentation/prove-p3-generated-media-local.mjs
```

The proof starts the one market demand, waits for the standalone Workflow and automatic completion path, requires the first semantic presentation event to be `media.ready` sequence `1`, downloads the image only through the guarded public-media endpoint, re-verifies its C2PA assertion, and saves a local copy under ignored `artifacts/generated/`.

The successful result must show:

```text
lifecycleStatus          genesis_candidate
fixture                  true
presentationPublication  queue_completion_handoff
eventSequence            1
c2pa.valid                true
provenanceClass          generated_reconstruction
provider                 openai
model                    gpt-image-2-2026-04-21
promptDisclosure         digest_only
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

A production/staging Presentation config will be created only after resources and production verification trust are provisioned. Expected bindings are:

```text
PRESENTATION_CHANNELS   Durable Object namespace
PRESENTATION_OBJECTS    private R2/object capability
PRESENTATION_CATALOG    D1 database
ASSET_GENERATION        cross-script Cloudflare Workflow binding
asset completion Queue  consumer binding/configuration
```

The corresponding Asset Generator deployment owns its provider secret, generation Workflow definition, completion Queue producer, credential-embedding configuration, and object capability. Production deployment credentials belong to provider authentication / CI secrets, not Fibre application `.env`.

Provider selection itself is recorded at Fibre level in `deployments/environments/`; see `docs/architecture/deployment-provider-selection.md`.

## Current limits

- generic `/api/assets/:objectRef` resolution and audience authorization are still deferred; the current Thread-specific route remains the public serving seam;
- the completion Queue currently publishes `media.ready` only for the credentialed successful receipt path; terminal credentialed `media.unavailable` semantics remain deferred;
- D1 catalog demand projection has no compare-and-set, so independent concurrent production presentation writers require a transactional/single-writer demand boundary before race-free current-demand publication is claimed;
- the `presentation-cloudflare` repository location predates ADR-0017 and is deferred for migration under `deployments/cloudflare/`;
- no browser write/message API yet;
- only one generated asset is required for the current vertical proof; bulk generation belongs to later media work;
- local C2PA sidecar certificate is not a production trust credential;
- Cloudflare-native byte-oriented C2PA verification remains deferred until an upstream-supported Worker API exists;
- no production/staging resource IDs yet;
- local fixture mode is validation scaffolding only;
- generated media remains presentation reconstruction and cannot become Thread history, memory, meaning, or embodiment evidence through this path.
