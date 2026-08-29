# Thread Presentation — Cloudflare deployment

This directory is the Cloudflare host for the provider-neutral Thread Presentation capability in `services/thread-presentation/`. It is composition, not Thread authority.

Provider-neutral HTTP/read behavior lives at `services/thread-presentation/src/http/read-api.mjs`. This host injects the Cloudflare InfraDriver, HTTP/WebSocket delivery, Asset Generator Workflow binding and completion Queue.

## Configs

- `wrangler.local.jsonc` — local/e2e composition with the dev-only P3 fixture seam and local C2PA signer.
- `wrangler.jsonc` — remote Cloudflare topology.

Remote provider selection is declared in `infra/deployments/environments/cloudflare-remote.json`.

## Runtime shape

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

Public read routes include snapshot/events/stream and admitted presentation assets. Object possession or an Asset Generator receipt is insufficient for public serving; Presentation admission remains required.

## Local generated-media proof

```bash
sh services/c2pa-local/generate-dev-cert.sh
npm install --prefix services/c2pa-local --no-package-lock
npm start --prefix services/c2pa-local
```

Then:

```bash
npx wrangler@latest d1 execute fibre-presentation-local \
  --config infra/deployments/thread-presentation/cloudflare/wrangler.local.jsonc \
  --local \
  --file infra/providers/cloudflare/d1/0001_fibre_catalog.sql

npm run dev:asset-stack:cloudflare
```

The fixture-only mutation endpoints are enabled only when `P3_FIXTURE_MODE=1`; the remote config does not enable them.

## Remote topology

```text
Worker:      fibre-thread-presentation
R2:          fibre-presentation-assets
D1:          Presentation catalog
Durable Obj: FibrePresentationChannelDurableObject
Workflow:    fibre-asset-generation hosted by fibre-asset-generator
Queue:       fibre-asset-completions
DLQ:         fibre-asset-completions-dlq
```

Validate without publishing:

```bash
npm run deployment:validate:remote
npm run deploy:asset-generator:cloudflare:dry
npm run deploy:thread-presentation:cloudflare:dry
```

This is topology validation, not production C2PA acceptance. Asset Generator emits completion facts; Thread Presentation alone admits them and publishes `media.ready`.
