# Thread Presentation — Cloudflare deployment

This directory is the Cloudflare host for the provider-neutral Thread Presentation capability in `services/thread-presentation/`. It is composition, not Thread authority.

Provider-neutral HTTP/read behavior lives at `services/thread-presentation/src/http/read-api.mjs`. This host injects the Cloudflare InfraDriver, HTTP/WebSocket delivery, Asset Generator Workflow binding and completion Queue.

## Configs

- `wrangler.local.jsonc` — local/e2e composition with the dev-only P3 fixture seam and local C2PA signer.
- `wrangler.jsonc` — remote Cloudflare topology.

Remote provider selection is declared in `infra/deployments/environments/cloudflare.yaml`.

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

## Private World handoff

World remains authoritative for the canonical Embodiment. Once World has admitted the canonical visual root, it sends the admitted Embodiment over the authenticated internal endpoint:

```text
POST /internal/visual-publication/reconcile
x-fibre-private-token: <shared private token>

{
  "threadId": "...",
  "embodiment": { "...": "admitted World-owned Embodiment" },
  "observedAt": "..."
}
```

Presentation does not read World storage and does not redefine canonical identity. It validates the supplied admitted Embodiment, projects visual identity into its own snapshot, ensures identity media, and durably schedules derived media through Asset Generator. Repeated handoffs are idempotent and return the current reconciliation stage.

`FIBRE_PRIVATE_TOKEN` is the required remote Thread Presentation secret. Thread Presentation does not hold C2PA signer credentials; FID signing remains behind Fibre Identity Authority and the Content Credential Signer deployment. Validation/auth failures return 4xx. Transient reconciliation failures return 5xx so World can retry on a later reconciliation sweep.

## Private FID lifecycle handoff

Thread Presentation owns the lifecycle orchestration seam for already-born Threads:

```text
POST /internal/fid/reconcile
x-fibre-private-token: <shared private token>

{
  "threadId": "...",
  "idempotencyKey": "...",
  "mode": "ensure" | "reissue"
}
```

The Cloudflare host requires the `FIBRE_IDENTITY_AUTHORITY` service binding, queries FIA for the current active credential, cuts only when the selected mode requires it, and projects the resulting active card. The caller cannot supply FIN, civil identity fields, photo bytes or card rendering facts.

This keeps the authority direction explicit:

```text
Admin / lifecycle caller
  -> Thread Presentation reconciliation
  -> Fibre Identity Authority
  -> Thread Presentation projection
```

World does not synchronously call FIA.

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
Worker:           fibre-thread-presentation
Service bindings: WORLD_KERNEL, FIBRE_IDENTITY_AUTHORITY
R2:               fibre-presentation-assets
D1:               fibre-presentation-catalog + shared fibre-activity-log
Durable Obj:      FibrePresentationChannelDurableObject
Workflow:         fibre-asset-generation hosted by fibre-asset-generator
Queue:            fibre-asset-completions
DLQ:              fibre-asset-completions-dlq
```

Validate without publishing:

```bash
npm run deployment:validate:remote
npm run deploy:asset-generator:cloudflare:dry
npm run deploy:thread-presentation:cloudflare:dry
```

This is topology validation, not production C2PA acceptance. Asset Generator emits completion facts; Thread Presentation alone admits them and publishes `media.ready`.
