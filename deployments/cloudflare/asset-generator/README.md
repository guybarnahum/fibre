# Cloudflare Asset Generator deployment

This directory is the Cloudflare composition root for the provider-neutral Asset Generator service.

It may choose Cloudflare Workers/Workflows, R2, Queues, image providers, and a Content Credential signer. It does not own Thread identity, memory, presentation authority, or the decision that generated media is publishable.

## HTTP surface

The Worker exposes one side-effect-free operational endpoint:

```text
GET /healthz
```

It returns service health only. It does not call OpenAI, BFL, C2PA, R2, Queues, or Workflows and therefore does not intentionally trigger paid generation.

All other direct HTTP requests return `404`. Asset generation remains Workflow-only; this Worker does not expose a public `/generate` API.

## Configs

- `wrangler.local.jsonc` — local Wrangler development. It points at the local C2PA signer on `127.0.0.1:8790` and must not be used for a remote deployment.
- `wrangler.jsonc` — remote Cloudflare Asset Generator deployment. It uses production C2PA trust policy and provider-native resource names only below the deployment boundary.

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

The remote Worker requires these secrets:

```text
OPENAI_API_KEY
BFL_API_KEY
C2PA_SIGNER_URL
C2PA_SIGNER_TOKEN
```

The image-provider keys stay inside Asset Generator. `C2PA_SIGNER_URL` must be an HTTPS endpoint reachable from Cloudflare when production trust policy is enabled. `C2PA_SIGNER_TOKEN` authenticates Asset Generator to that service. The local `127.0.0.1` signer and its development certificate cannot satisfy the production trust policy.

Configure each secret against the remote Worker config with Wrangler before deployment.

Validate the deploy bundle without publishing it:

```bash
npm run deploy:asset-generator:cloudflare:dry
```

Deploy:

```bash
npm run deploy:asset-generator:cloudflare
```

After deployment, `GET /healthz` is the first smoke test. A successful health response proves only that the Worker HTTP runtime is alive; it does not prove image-provider, C2PA, storage, queue, or Workflow readiness.

## Remote stack boundary

A checked remote Thread Presentation composition lives at `deployments/cloudflare/thread-presentation/wrangler.jsonc`, with provider selection declared in `deployments/environments/cloudflare-remote.json`.

The two remote compositions intentionally agree on:

- generated-object R2 storage: `fibre-presentation-assets`;
- Asset Generator Workflow identity: `fibre-asset-generation` hosted by `fibre-asset-generator`;
- completion Queue: `fibre-asset-completions`.

Asset Generator remains the completion producer. Thread Presentation is the completion consumer and retains sole authority to admit the result and publish `media.ready`.

Validate the remote declaration and both bundles without publishing:

```bash
npm run deployment:validate:remote
npm run deploy:asset-generator:cloudflare:dry
npm run deploy:thread-presentation:cloudflare:dry
```

The checked composition is not yet a live production media path. Fibre still needs a deployed production C2PA signer/verifier backed by an accepted trust credential and protected signing key, plus the real Worker secrets and provisioned remote data resources.

Provider selection remains governed by `deployments/environments/` and `docs/decisions/ADR-0019-deployment-provider-selection.md`. The provider-native names in these files are deployment detail, not Fibre identities.
