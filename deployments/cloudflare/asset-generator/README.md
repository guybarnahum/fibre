# Cloudflare Asset Generator deployment

This directory is the Cloudflare composition root for the provider-neutral Asset Generator service.

It may choose Cloudflare Workers/Workflows, R2, Queues, the OpenAI image provider, and a Content Credential signer. It does not own Thread identity, memory, presentation authority, or the decision that generated media is publishable.

## Configs

- `wrangler.local.jsonc` — local Wrangler development. It points at the local C2PA signer on `127.0.0.1:8790` and must not be used for a remote deployment.
- `wrangler.jsonc` — remote Cloudflare Asset Generator deployment. It requires configured `OPENAI_API_KEY` and `C2PA_SIGNER_URL` secrets and uses provider-native resource names only below the deployment boundary.

## Local development

Check Wrangler first:

```bash
npx wrangler@latest --version
npx wrangler@latest whoami
```

To boot only the Asset Generator Cloudflare process:

```bash
npm run dev:asset-generator:cloudflare
```

For the real Presentation → Workflow → Asset Generator → Queue → Presentation proof, start the local C2PA service and initialize the local Presentation D1 database once:

```bash
sh services/c2pa-local/generate-dev-cert.sh
npm install --prefix services/c2pa-local --no-package-lock
npm start --prefix services/c2pa-local
```

In another terminal:

```bash
npx wrangler@latest d1 execute fibre-presentation-local \
  --config deployments/cloudflare/thread-presentation/wrangler.local.jsonc \
  --local \
  --file packages/infra/cloudflare/d1/0001_fibre_catalog.sql

npm run dev:asset-stack:cloudflare
```

Then run a selectable live asset proof:

```bash
npm run test:asset-live:cloudflare -- \
  --fixture can-tho \
  --media-id media_memory_tomatoes
```

The fixture and media target are inputs to the dev-only test harness. The Cloudflare runtime is not hardcoded to the tomato memory. Existing Cần Thơ P3 URLs remain compatibility aliases only.

## Remote Asset Generator deployment

The checked remote config currently names these Cloudflare resources:

```text
Worker:   fibre-asset-generator
R2:       fibre-presentation-assets
Workflow: fibre-asset-generation
Queue:    fibre-asset-completions
```

Create the shared R2 bucket and completion queue if they do not already exist:

```bash
npx wrangler@latest r2 bucket create fibre-presentation-assets
npx wrangler@latest queues create fibre-asset-completions
```

Configure the required secrets against the remote Worker config:

```bash
npx wrangler@latest secret put OPENAI_API_KEY \
  --config deployments/cloudflare/asset-generator/wrangler.jsonc

npx wrangler@latest secret put C2PA_SIGNER_URL \
  --config deployments/cloudflare/asset-generator/wrangler.jsonc
```

`C2PA_SIGNER_URL` must be reachable from Cloudflare. `http://127.0.0.1:8790` is valid only for local development.

Validate the deploy bundle without publishing it:

```bash
npm run deploy:asset-generator:cloudflare:dry
```

Deploy:

```bash
npm run deploy:asset-generator:cloudflare
```

## What this does and does not deploy

This command deploys the Asset Generator process only. A complete remote Fibre media path also needs a Thread Presentation deployment wired to:

- the same generated-object R2 storage;
- the Asset Generator Workflow service binding;
- the same completion Queue as a consumer;
- its own Presentation state/catalog/realtime resources.

That remote Thread Presentation composition is not yet checked in, so this is not yet a one-command production stack deployment.

Likewise, Fibre currently has a local C2PA signer integration proof, not an accepted production trust service. The Asset Generator can be deployed remotely now, but successful credentialed remote generation requires a separately reachable signer with production-appropriate trust/configuration.

Provider selection remains governed by `deployments/environments/` and `docs/decisions/ADR-0019-deployment-provider-selection.md`. The provider-native names in this file are deployment detail, not Fibre identities.
