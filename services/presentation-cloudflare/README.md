# Fibre Presentation — Cloudflare runtime

Cloudflare runtime adapter for Fibre Thread Presentation.

This service is a deployment boundary, not a new Thread authority. It composes the Fibre-owned `PresentationServer` with the general `cloudflare-v1` `InfraDriver`.

Current P3 runtime profile:

```text
PresentationServer
      |
      v
InfraDriver cloudflare-v1
  streams   -> per-Thread SQLite Durable Object
  realtime  -> Durable Object WebSocket Hibernation
  objects   -> R2
  catalog   -> D1
```

The public API is currently read-only:

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

`wrangler.local.jsonc` sets:

```text
P3_FIXTURE_MODE=1
VIEWER_ORIGIN=http://localhost:5173
```

This enables exactly one development-only write seam:

```text
POST /__p3/fixtures/can-tho
```

It accepts only the frozen P2 `thr_pr39_g2_04` `genesis_candidate` fixture bundle. It does not accept arbitrary Threads and is absent when fixture mode is disabled.

### Start a local runtime

From the repository root, install/use current Wrangler without adding Cloudflare credentials to Fibre `.env`:

```bash
npx wrangler@latest --version

npx wrangler@latest d1 execute fibre-presentation-local \
  --config services/presentation-cloudflare/wrangler.local.jsonc \
  --local \
  --file packages/infra/cloudflare/d1/0001_fibre_catalog.sql

npx wrangler@latest dev \
  --config services/presentation-cloudflare/wrangler.local.jsonc \
  --port 8787
```

Wrangler local mode simulates the configured D1, R2, and Durable Object resources on the developer machine. No production R2 bucket or D1 database is touched.

In another terminal:

```bash
node tools/presentation/seed-p3-can-tho-cloudflare-local.mjs

curl -s http://127.0.0.1:8787/healthz
curl -s http://127.0.0.1:8787/api/threads/thr_pr39_g2_04/snapshot
curl -s 'http://127.0.0.1:8787/api/threads/thr_pr39_g2_04/events?after=0'
```

The seed CLI reads only:

```text
artifacts/validation/thread-presentation/p2/can-tho/presentation.json
artifacts/validation/thread-presentation/p2/can-tho/media.json
artifacts/validation/thread-presentation/p2/can-tho/provenance.json
```

It does not read raw H-v2 Genesis output and cannot publish/birth the candidate as a live Thread.

## Production resource configuration

`wrangler.local.jsonc` is intentionally local-only. Its all-zero D1 identifier must never be deployed as production configuration.

A production/staging config will be created only after the Cloudflare resources are provisioned. Expected bindings are:

```text
PRESENTATION_CHANNELS   Durable Object namespace
PRESENTATION_OBJECTS    private R2 bucket
PRESENTATION_CATALOG    D1 database
ASSET_GENERATION        Cloudflare Workflow binding (when the real asset workflow lands)
```

Production deployment credentials belong to Wrangler authentication / CI secrets, not Fibre application `.env`.

## Current limits

- no browser write/message API yet;
- no real image provider yet;
- no real C2PA-compatible signer adapter yet;
- no Cloudflare Workflow class wired into this Worker yet;
- no production/staging resource IDs yet;
- local fixture mode is validation scaffolding only.
