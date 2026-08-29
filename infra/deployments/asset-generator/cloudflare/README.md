# Cloudflare Asset Generator deployment

This directory is the Cloudflare host for the provider-neutral Asset Generator service. Provider-neutral deployment selection is one level above it in `infra/deployments/asset-generator/`.

It may bind Cloudflare Workers/Workflows, R2 and Queues. It does not own Thread identity, memory, presentation authority, image-provider policy, C2PA trust policy, or the decision that generated media is publishable.

## HTTP surface

The Worker exposes only the shared operational endpoint:

```text
GET /healthz
```

It is side-effect free and does not call an image provider, C2PA, R2, Queues or Workflows. Asset generation remains Workflow-only; there is no public `/generate` API.

## Configs

- `wrangler.local.jsonc` — local Cloudflare development with the local development signer.
- `wrangler.jsonc` — remote Cloudflare topology with production C2PA trust policy requirements.

## Local development

```bash
sh services/c2pa-local/generate-dev-cert.sh
npm install --prefix services/c2pa-local --no-package-lock
npm start --prefix services/c2pa-local
```

In another terminal:

```bash
npx wrangler@latest d1 execute fibre-presentation-local \
  --config infra/deployments/thread-presentation/cloudflare/wrangler.local.jsonc \
  --local \
  --file infra/providers/cloudflare/d1/0001_fibre_catalog.sql

npm run dev:asset-stack:cloudflare
```

Paid live image proofs remain explicit operator actions and are not part of ordinary validation or CI.

## Remote topology

The checked remote Asset Generator resources are:

```text
Worker:   fibre-asset-generator
R2:       fibre-presentation-assets
Workflow: fibre-asset-generation
Queue:    fibre-asset-completions
```

Remote configuration requires image-provider credentials plus `C2PA_SIGNER_URL` and `C2PA_SIGNER_TOKEN`. The signer URL must satisfy the production HTTPS/trust requirements; the local development signer cannot satisfy them.

Validate without publishing:

```bash
npm run deployment:validate:remote
npm run deploy:asset-generator:cloudflare:dry
npm run deploy:thread-presentation:cloudflare:dry
```

Do not treat a successful dry-run or `GET /healthz` as proof that production image generation/C2PA/storage/queue dependencies are ready. Asset Generator remains the completion producer; Thread Presentation remains the completion consumer and sole authority for `media.ready`.
