# Presentation tools

## Provider-neutral live generated-asset smoke

`npm run test:asset-live` is an explicit networked smoke for real image generation. It is intentionally outside normal `npm test` and CI because it requires provider credentials and can spend provider quota.

Use `--dry-run` to exercise planning without invoking the provider:

```bash
npm run test:asset-live -- --dry-run
```

A real run remains an explicit operator action.

## Cloudflare live generated-asset smoke

`npm run test:asset-live:cloudflare` exercises the local end-to-end path:

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
  -> C2PA verification
```

Start the local signer and local Cloudflare stack first; see `infra/deployments/asset-generator/cloudflare/README.md` and `infra/deployments/thread-presentation/cloudflare/README.md`.

The fixture endpoints are local/e2e-only under `P3_FIXTURE_MODE=1`. Paid generation is never part of ordinary repository validation or CI.
