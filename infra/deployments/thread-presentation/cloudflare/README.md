# Thread Presentation — Cloudflare deployment

This directory hosts the provider-neutral Thread Presentation capability from `services/thread-presentation/`. It is composition, not Thread authority.

Provider-neutral HTTP/read behavior lives at `services/thread-presentation/src/http/read-api.mjs`. This host injects the Cloudflare InfraDriver, HTTP/WebSocket delivery, Asset Generator Workflow binding, completion Queue, and private Fibre service bindings.

## Configs

- `wrangler.local.jsonc` — local/e2e composition with the dev-only P3 fixture seam.
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

Public read routes include snapshots, events, streams and admitted presentation assets. Object possession or an Asset Generator receipt is insufficient for public serving; Presentation admission remains required.

## Private World handoff

World remains authoritative for canonical Embodiment. Once World has admitted the canonical visual root, it sends that admitted Embodiment over:

```text
POST /internal/visual-publication/reconcile
x-fibre-private-token: <shared private token>
```

Presentation does not read World storage or redefine canonical identity. It validates the admitted Embodiment, projects visual identity into its snapshot, ensures identity media, and schedules derived media through Asset Generator.

Repeated handoffs are idempotent.

`FIBRE_PRIVATE_TOKEN` is the required remote private-service secret. Validation/auth failures return 4xx. Transient reconciliation failures return 5xx so World can retry on a later reconciliation sweep.

## Private FIN lifecycle handoff

Thread Presentation owns lifecycle orchestration for already-born Threads:

```text
POST /internal/fid/reconcile
x-fibre-private-token: <shared private token>

{
  "threadId": "...",
  "idempotencyKey": "...",
  "mode": "ensure" | "reissue"
}
```

The Cloudflare host uses the `FIBRE_IDENTITY_AUTHORITY` service binding, queries FIA for the current active credential, cuts only when the selected mode requires it, and projects the resulting active card.

The caller cannot supply FIN, civil identity fields, photo bytes or card rendering facts.

```text
Admin / lifecycle caller
  -> Thread Presentation reconciliation
  -> Fibre Identity Authority
  -> Thread Presentation projection
```

FIN proof remains entirely behind FIA. Thread Presentation handles only the resulting verified credential projection.

World does not synchronously call FIA.

## Local generated-media proof

Initialize the local D1 catalog, then start the local Asset Generator + Thread Presentation stack:

```bash
npx wrangler@latest d1 execute fibre-presentation-local \
  --config infra/deployments/thread-presentation/cloudflare/wrangler.local.jsonc \
  --local \
  --file infra/providers/cloudflare/d1/0001_fibre_catalog.sql

npm run dev:asset-stack:cloudflare
```

The fixture-only mutation endpoints are enabled only when `P3_FIXTURE_MODE=1`; the remote config does not enable them.

Generated-media admission uses Fibre's immutable generation provenance. Asset Generator emits completion facts; Thread Presentation independently verifies the durable receipt/generation record and alone authors `media.ready`.

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

This proves topology/composition only; live provider generation and true end-to-end acceptance require the explicit staging E2E.
