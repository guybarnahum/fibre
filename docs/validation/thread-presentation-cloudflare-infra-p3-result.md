---
id: validation-thread-presentation-cloudflare-infra-p3-result
status: proposed
last-reviewed: 2026-08-21
canonical: false
---

# Thread presentation Cloudflare runtime profile — P3 validation handoff

## Status

**NEEDS MAINTAINER VALIDATION.**

This handoff supersedes the earlier narrower R2/Workflows-only state of this same document. The current branch now contains the full first Thread Presentation capability profile for the general `cloudflare-v1` `InfraDriver`, plus a read-only Worker boundary and a local Cần Thơ runtime fixture seam.

## Current implementation

```text
PresentationServer
      |
      v
InfraDriver cloudflare-v1
  streams    -> per-Thread SQLite-backed Durable Object RPC
  realtime   -> same Durable Object, Hibernation WebSockets
  objects    -> R2 binding
  catalog    -> D1 binding
  workflows  -> Cloudflare Workflows binding adapter
```

### `objects`

- conditional immutable R2 write;
- digest + compact Fibre metadata;
- exact duplicate accepted idempotently;
- conflicting bytes/digest/metadata rejected;
- provider R2 keys do not become Fibre object identity.

### `workflows`

Fibre persists two durable object witnesses:

```text
workflowinput:<workflowName>:<instanceId>
workflowstarted:<workflowName>:<instanceId>
```

The input witness binds exact job identity/input. The started witness distinguishes reservation from a confirmed provider execution. A transient `Workflow.create()` failure before the started witness remains retryable; a confirmed workflow whose Cloudflare operational status later expires is not silently restarted.

R2 and Cloudflare Workflow creation are not one atomic transaction. Generation effects therefore remain required to be deterministic/idempotent immutable writes keyed by Fibre job identity.

### `streams`

A channel namespace uses `getByName(channelId)`, giving one Durable Object per presentation channel. The DO stores:

```text
stream_meta
stream_events
```

with transactional SQLite sequence allocation, idempotency-key conflict detection, exact ordered replay, and snapshot-pointer updates bound to the current stream sequence.

### `realtime`

`PresentationServer` still performs:

```text
durable append
    -> materialize sequence
    -> realtime publish
```

The DO's realtime path only fans out an already sequenced value. It never allocates stream order.

The WebSocket path uses Cloudflare's Hibernation API and supports replay from `?after=<cursor>`. Replay frames use a provider transport envelope:

```text
{
  type: "stream.event",
  sequence,
  value
}
```

followed by `stream.ready`. The envelope is transport state, not a new Thread/presentation authority.

### `catalog`

D1 stores query/public-serving projections only. It does not allocate stream sequence and is not a hidden authority for Thread life, memory, meaning, relationships, or location.

Schema:

```text
packages/infra/cloudflare/d1/0001_fibre_catalog.sql
```

### public read API

The Worker currently exposes read-only presentation routes:

```text
GET /healthz
GET /api/threads/:threadId/snapshot
GET /api/threads/:threadId/events?after=N
WS  /api/threads/:threadId/stream?after=N
GET /api/threads/:threadId/media/:objectRef
```

A channel is invisible unless its catalog projection explicitly says `publiclyVisible: true`.

A Fibre object reference by itself never authorizes browser access to the underlying R2 object. Media serving additionally requires the `public_presentation_media` projection created after the credentialed publisher has verified and admitted `media.ready`.

The catalog projection is an availability/disclosure index, not evidence that the generated media depicts historical truth.

## P3 local fixture seam

`services/presentation-cloudflare/wrangler.local.jsonc` is deliberately local-only. Wrangler local mode simulates R2, D1 and the SQLite Durable Object without production Cloudflare credentials/resources.

When:

```text
P3_FIXTURE_MODE=1
```

the Worker exposes exactly one development write seam:

```text
POST /__p3/fixtures/can-tho
```

It accepts only:

```text
threadId        thr_pr39_g2_04
lifecycle       genesis_candidate
fixture         true
```

The seeder reads only the P2 presentation/media/provenance packets. It cannot birth/publish the candidate as a live Thread and does not read raw H-v2 Genesis output.

## Node-level validation

From `fibre`:

```bash
git fetch origin
git switch agent/thread-presentation-milestones-v1
git pull --ff-only

git status --short

node --test packages/infra/test/cloudflare-v1.test.mjs
node --test packages/infra/test/cloudflare-presentation-ports.test.mjs
node --test services/presentation-cloudflare/test/presentation-read-api.test.mjs
node --test services/asset-generator/test/credentialed-asset-generation.test.mjs
node --test services/world-kernel/test/thread-presentation-asset-publisher.test.mjs
node --test tools/test-infra/test-suite-lifecycle.test.mjs

npm run includes:check
npm run validate
npm test

git diff --check agent/pr39-genesis-childhood-birth-v1...HEAD
```

Expected focused results:

```text
cloudflare-v1.test.mjs                         4 pass / 0 fail
cloudflare-presentation-ports.test.mjs         4 pass / 0 fail
presentation-read-api.test.mjs                 4 pass / 0 fail
credentialed-asset-generation.test.mjs         5 pass / 0 fail
thread-presentation-asset-publisher.test.mjs   2 pass / 0 fail
```

The lifecycle test must show all of the new package/service tests are part of the normal active suite.

## Wrangler local-runtime validation

This second level is required because ordinary Node tests do not execute the actual `cloudflare:workers` Durable Object runtime.

Use current Wrangler through `npx`; this does not add Cloudflare credentials to Fibre `.env`.

### 1. Bundle/config check

```bash
npx wrangler@latest deploy --dry-run \
  --config services/presentation-cloudflare/wrangler.local.jsonc
```

The local config uses an all-zero placeholder D1 UUID intentionally and must never be used for production deployment.

### 2. Initialize local D1

```bash
npx wrangler@latest d1 execute fibre-presentation-local \
  --config services/presentation-cloudflare/wrangler.local.jsonc \
  --local \
  --file packages/infra/cloudflare/d1/0001_fibre_catalog.sql
```

### 3. Run the Worker

```bash
npx wrangler@latest dev \
  --config services/presentation-cloudflare/wrangler.local.jsonc \
  --port 8787
```

Keep that terminal running.

### 4. In another terminal, seed the frozen P2 packet

```bash
node tools/presentation/seed-p3-can-tho-cloudflare-local.mjs
```

Expected response includes:

```text
"ok": true
"fixture": true
"threadId": "thr_pr39_g2_04"
"channelId": "presentation:thr_pr39_g2_04"
```

### 5. Probe HTTP + WebSocket

```bash
node tools/presentation/probe-p3-cloudflare-local.mjs
```

Expected result has:

```text
"ok": true
"threadId": "thr_pr39_g2_04"
"lifecycleStatus": "genesis_candidate"
"fixture": true
```

and the WebSocket `stream.ready` cursor must equal the HTTP replay head.

## Negative properties pinned

This slice must demonstrate:

- exact duplicate immutable R2 writes are idempotent, conflicting writes fail;
- same Workflow ID + different input fails closed;
- transient pre-start Workflow failure remains retryable;
- confirmed Workflow execution is not silently recreated after provider status retention expires;
- ordered stream replay is exact;
- idempotent stream retry wins before stale expected-sequence conflict;
- realtime fanout does not allocate sequence;
- D1 is a mirror rather than stream authority;
- hidden/non-public channels return 404;
- knowing an objectRef does not make media public;
- an invalid Content Credential blocks both `media.ready` and the public-media catalog projection;
- the local fixture remains an unpublished Genesis candidate.

## C2PA runtime boundary

The credentialed publication gate is implemented and validated with a synthetic signer format. This slice still does **not** claim real C2PA interoperability.

As of 2026-08-21, Fibre keeps `ContentCredentialSigner` behind a portable adapter because the official Node C2PA SDK is native Node code while official non-browser Wasm/byte support for Cloudflare Workers is still evolving upstream.

No private C2PA fork is accepted merely to close P3.

## P3 status after this validation

If both Node and Wrangler-local validation pass, the Cloudflare snapshot/replay/WebSocket infrastructure path is established.

P3 nevertheless remains open for one final vertical-media proof:

```text
real image provider
      +
real C2PA-compatible ContentCredentialSigner
      +
Cloudflare asset workflow execution
      ->
one eligible Cần Thơ place reconstruction
      -> GenerationRecord
      -> embedded credential
      -> final R2 object
      -> StoredAssetReceipt
      -> media.ready
      -> insidefibre renders the generated asset
```

Portrait generation remains deferred until an accepted embodiment reconstruction brief exists.
