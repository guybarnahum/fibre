# Presentation tools

## Provider-neutral live generated-asset smoke

`npm run test:asset-live` is an explicit networked smoke for real image generation. It is outside normal `npm test` and CI because it requires provider credentials and can spend provider quota.

Use `--dry-run` to exercise planning without invoking the provider:

```bash
npm run test:asset-live -- --dry-run
```

A real run verifies the provider output, immutable Fibre generation provenance, receipt, final-byte digest, and generated PNG.

## Cloudflare live generated-asset smoke

`npm run test:asset-live:cloudflare` exercises:

```text
Thread Presentation fixture
  -> asset demand
  -> Cloudflare Workflow
  -> Asset Generator
  -> image provider
  -> immutable object storage
  -> completion Queue
  -> Presentation admission / media.ready
  -> public asset resolver
  -> Fibre provenance classification
```

Start the local Cloudflare stack first; see `infra/deployments/asset-generator/cloudflare/README.md` and `infra/deployments/thread-presentation/cloudflare/README.md`.

The fixture endpoints are local/e2e-only under `P3_FIXTURE_MODE=1`. Paid generation is never part of ordinary repository validation or CI.
