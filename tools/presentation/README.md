# Presentation tools

## Provider-neutral live generated-asset smoke

`npm run test:asset-live` is an explicit networked smoke test for real image generation. It is intentionally outside normal `npm test` and CI because it requires `OPENAI_API_KEY`, spends provider quota, and can fail for provider/network reasons.

The test does not use a hand-written image prompt. It loads a Thread Presentation fixture and asks the normal Thread Presentation asset planner for the selected media target.

The default remains the Cần Thơ autobiographical memory used for the first proof:

```bash
npm run test:asset-live -- --dry-run
npm run test:asset-live
```

The fixture and target are selectable instead of hardcoded:

```bash
npm run test:asset-live -- \
  --fixture can-tho \
  --media-id media_memory_sandals \
  --dry-run
```

A `.env` file is loaded when present. Optional provider overrides are `OPENAI_IMAGE_MODEL`, `OPENAI_IMAGE_SIZE`, `OPENAI_IMAGE_QUALITY`, and `OPENAI_IMAGE_ENDPOINT`.

A successful run verifies the provider-neutral path through the real Asset Generator service and `InfraDriver.objects`. Image and evidence files are written under `artifacts/generated/asset-live/`. Credential embed/verify deliberately uses a process-local test signer, so this command does not claim production C2PA signing.

## Cloudflare live generated-asset smoke

`npm run test:asset-live:cloudflare` proves a different boundary. It talks to the running local Cloudflare stack and exercises:

```text
Thread Presentation fixture
  -> durable presentation snapshot
  -> asset demand
  -> InfraDriver.workflows
  -> Cloudflare Workflow
  -> Asset Generator
  -> real image provider
  -> R2-compatible object port
  -> completion Queue
  -> Presentation media.ready
  -> provider-neutral /api/assets/:objectRef
  -> C2PA verification
```

Start the local signer and `npm run dev:asset-stack:cloudflare` first; see `deployments/cloudflare/asset-generator/README.md` for exact commands.

Then run:

```bash
npm run test:asset-live:cloudflare -- \
  --fixture can-tho \
  --media-id media_memory_tomatoes
```

The Cloudflare fixture endpoints are enabled only when `P3_FIXTURE_MODE=1`. The generic test endpoints accept the seeded fixture Thread ID and selected `mediaId`; the earlier Cần Thơ market endpoints remain compatibility aliases.

Cloudflare proof artifacts are written under `artifacts/generated/asset-live-cloudflare/`.
