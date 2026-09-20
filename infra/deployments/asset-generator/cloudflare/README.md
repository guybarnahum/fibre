# Cloudflare Asset Generator deployment

Cloudflare host for the provider-neutral Asset Generator.

It binds Workers/Workflows, R2 and Queues. It does not own Thread identity, memory, presentation authority, image-provider policy, or publication decisions.

## HTTP surface

```text
GET /healthz
POST /internal/generation/reconcile
```

The internal endpoint requires `x-fibre-private-token: <FIBRE_PRIVATE_TOKEN>`. It schedules or observes a deterministic generation job; provider execution remains Workflow-only. There is no public `/generate` API.

`GET /healthz` is side-effect free and does not call image providers, R2, Queues or Workflows.

## Configs

- `wrangler.local.jsonc` — local Cloudflare development.
- `wrangler.jsonc` — remote Cloudflare topology.

Both use image-provider credentials plus `FIBRE_PRIVATE_TOKEN`. There is no separate media-signing service.

## Local development

```bash
npx wrangler@latest d1 execute fibre-presentation-local \
  --config infra/deployments/thread-presentation/cloudflare/wrangler.local.jsonc \
  --local \
  --file infra/providers/cloudflare/d1/0001_fibre_catalog.sql

npm run dev:asset-stack:cloudflare
```

Paid live image proofs remain explicit operator actions and are not part of ordinary validation or CI.

## Remote topology

```text
Worker:   fibre-asset-generator
R2:       fibre-presentation-assets
Workflow: fibre-asset-generation
Queue:    fibre-asset-completions
```

World uses the authenticated control endpoint for canonical visual-root jobs. Thread Presentation consumes completion pointers and remains the sole authority for `media.ready`.

Validate without publishing:

```bash
npm run deployment:validate:remote
npm run deploy:asset-generator:cloudflare:dry
npm run deploy:thread-presentation:cloudflare:dry
```

A successful dry-run or `GET /healthz` proves deployment shape only; it does not prove live provider generation or end-to-end storage/queue behavior.
