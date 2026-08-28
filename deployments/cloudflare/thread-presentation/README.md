# Thread Presentation — Cloudflare deployment

This directory is the Cloudflare deployment adapter for the provider-neutral Thread Presentation capability in `services/thread-presentation/`.

It is deployment composition, not a Thread authority. It wires the Fibre presentation runtime to the `cloudflare-v1` `InfraDriver`, HTTP/WebSocket delivery, the generated-asset Workflow binding, and the asset-completion Queue.

## Local runtime

```text
Thread Presentation
      |
      v
InfraDriver cloudflare-v1
  streams    -> SQLite-backed Durable Object
  realtime   -> Durable Object WebSockets
  objects    -> R2
  catalog    -> D1
  workflows  -> Asset Generator Workflow binding
  queues     -> asset completion consumer
```

The public read API includes:

```text
GET /healthz
GET /api/threads/:threadId/snapshot
GET /api/threads/:threadId/events?after=N
WS  /api/threads/:threadId/stream?after=N
GET /api/assets/:objectRef
GET /api/threads/:threadId/media/:objectRef   # compatibility facade
```

The generic asset route is not an object-store browser. It uses Thread Presentation's provider-neutral `PublicPresentationAssetResolver`, so an object or generation receipt is not public until Presentation has admitted it.

## Local generated-media proof

Start the local C2PA service first:

```bash
sh services/c2pa-local/generate-dev-cert.sh   # once
npm install --prefix services/c2pa-local --no-package-lock
npm start --prefix services/c2pa-local
```

Initialize D1 and start both Cloudflare deployments:

```bash
npx wrangler@latest d1 execute fibre-presentation-local \
  --config deployments/cloudflare/thread-presentation/wrangler.local.jsonc \
  --local \
  --file packages/infra/cloudflare/d1/0001_fibre_catalog.sql

npx wrangler@latest dev \
  --config deployments/cloudflare/thread-presentation/wrangler.local.jsonc \
  --config deployments/cloudflare/asset-generator/wrangler.local.jsonc \
  --env-file .env \
  --port 8787
```

Then run:

```bash
node tools/presentation/seed-p3-can-tho-cloudflare-local.mjs
node tools/presentation/prove-p3-generated-media-local.mjs
```

The proof must pass through durable demand, the standalone Asset Generator, immutable credentialed output, completion Queue delivery, Presentation `media.ready`, and the generic `/api/assets/:objectRef` resolver.

## Boundaries

- Cloudflare bindings and Wrangler configuration are deployment details, not Fibre semantic identities.
- Generated media remains presentation reconstruction, never Thread identity/history/memory/meaning/embodiment evidence.
- Public serving requires Presentation admission; object possession is insufficient.
- Private/audience-scoped serving remains deferred until Fibre has an authenticated principal boundary.
- Terminal credentialed `media.unavailable`, independent concurrent demand writers, and production trust/resource configuration remain deferred.

Provider selection is recorded in `deployments/environments/`; see `docs/decisions/ADR-0019-deployment-provider-selection.md` and `docs/architecture/deployment-provider-selection.md`.
