---
id: fibre-cloud-runtime-infradriver-plan
status: accepted
last-reviewed: 2026-09-20
canonical: true
---

# Cloud runtime via InfraDriver — deployment closure plan

## Purpose

Run Fibre's complete birth-to-publication path in cloud infrastructure without introducing a cloud-specific application architecture.

The target is:

> Fibre services remain provider-neutral; `InfraDriver` and deployment composition supply persistence, scheduling, objects, queues, workflows and hosting.

The acceptance path is one real Thread born in cloud infrastructure and automatically reflected through Thread Presentation and the Viewer with its admitted identity and generated media.

This is runtime/deployment work. It does not create semantic authority.

## Standing constraints

### One application architecture

Local and Cloudflare execution share the same service contracts:

```text
Fibre service
    |
    v
InfraDriver / injected integration seam
    |
    +--> local provider
    |
    +--> Cloudflare provider
```

Services must not branch into “local semantics” and “cloud semantics.”

### Small provider-neutral capabilities

New runtime capabilities are added only when a concrete Fibre operation needs them:

1. identify the real operation;
2. define the smallest portable contract;
3. implement local and Cloudflare providers;
4. prove parity with semantic tests;
5. expand only when a second real use case requires it.

Do not create speculative lock, lease, scheduler, workflow or deployment frameworks.

### Durable reconciliation

Long-lived Fibre processes must survive process/Worker restart.

Semantic convergence therefore depends on durable state plus provider-neutral scheduling/reconciliation, not on process-local timers or request lifetime.

`InfraDriver.scheduler` is the portable scheduling seam. Local and Cloudflare providers may implement it differently, but World/Birth reconciliation semantics stay identical.

### Explicit secret input

Operator tools never silently read an arbitrary local secret file.

```text
npm run cloud:configure-secrets -- --file .env --env staging
```

The tool validates required values, sends each Worker only its required subset, and never writes secret values into generated config or repository files.

## Current cloud service topology

```text
Birth Center
    |
    v
World Kernel
    |
    +--> Fibre Identity Authority
    |
    +--> Thread Presentation
              |
              +--> Asset Generator workflow
              |       |
              |       +--> image integration
              |       +--> immutable objects
              |       +--> completion queue
              |
              +--> public discovery / media serving
```

Deployable Fibre services are:

```text
asset-generator
thread-presentation
world-kernel
fibre-identity-authority
birth-center
```

There is no separate generated-media or FIN signing service.

## Proof and provenance boundaries

### FIN

Fibre Identity Authority owns native FIN proof.

FIN PNGs carry a canonical Fibre assertion signed with the FIA Ed25519 issuer key and embedded in the `fiDP` PNG chunk. FIA self-verifies the proof before immutable storage.

FIN authenticity answers whether FIA issued the exact card bytes; current active/superseded/revoked state is a separate lifecycle query. FIN cards do not expire.

### Generated media

Asset Generator owns immutable generation provenance:

```text
AssetGenerationJob
  -> provider operation / GenerationAttempt
  -> immutable staged provider output
  -> GenerationRecord
  -> immutable final asset
  -> StoredAssetReceipt
  -> AssetGenerationCompletion
```

Thread Presentation independently verifies that provenance before authoring `media.ready`.

If generated PNGs later need portable embedded signatures, Fibre will reuse/extract the generic canonical-JSON + Ed25519 + PNG-envelope mechanism proven by FIN, with an asset-specific assertion schema. That does not add a second trust stack.

## Cloudflare resource ownership

The deployment layer owns concrete Cloudflare configuration:

- Workers;
- Workflows;
- Queues and DLQs;
- D1 databases;
- R2 buckets;
- Durable Objects;
- service bindings;
- custom domains;
- Worker secrets and non-secret vars.

Services own none of those provider identifiers.

Provider-native resource IDs never become Fibre semantic identities.

## Operator flow

### Prepare

```bash
npm run cloud:provision -- --env staging
npm run cloud:configure-secrets -- --file .env --env staging
```

`cloud:provision` is idempotent. It reconciles independently managed resources, applies schema where required, and writes resolved provider configuration under ignored `.fibre/cloudflare/<environment>/`.

### Validate

The standing repository gate remains:

```bash
npm run slice:validate
```

Deployment-specific dry-runs should prove that checked Wrangler configuration still composes:

```bash
npm run deploy:asset-generator:cloudflare:dry
npm run deploy:thread-presentation:cloudflare:dry
npm run deploy:world-kernel:cloudflare:dry
npm run deploy:fibre-identity-authority:cloudflare:dry
npm run deploy:birth-center:cloudflare:dry
```

A dry-run proves composition, not live provider availability or true end-to-end acceptance.

### Deploy

```bash
npm run cloud:deploy -- --env staging
```

Deployment proceeds in dependency order:

```text
Asset Generator
Thread Presentation
World Kernel
Fibre Identity Authority
Birth Center
```

Each service must answer `/healthz` with the expected service identity before dependent acceptance continues.

The Viewer remains independently deployed; Fibre verifies the required Viewer endpoint but does not mutate that repository.

## Required cloud acceptance

A cloud deployment is not closed by Worker deployment alone.

The acceptance proof must show:

1. a clean exact Git SHA was deployed;
2. one genuine cloud birth succeeds;
3. durable World state survives restart/re-entry;
4. canonical visual identity converges through Asset Generator;
5. generated bytes and provenance survive provider/workflow retries;
6. Thread Presentation admits exactly one current media projection;
7. FIA can issue and verify a native-proof FIN card when requested;
8. public discovery and asset serving expose only authorized presentation state;
9. the Viewer can consume the resulting Thread without reaching internal stores/services;
10. replay/reconciliation does not create duplicate semantic events or duplicate provider work.

## Failure semantics

Infrastructure failure must remain operational failure.

Examples:

- provider timeout does not become semantic media unavailability;
- queue redelivery does not create a second `media.ready`;
- Worker restart does not create a second birth or identity;
- failed FIN reissue does not supersede the prior active credential;
- ambiguous provider submission is not blindly replayed.

Semantic state advances only after the owning authority has verified durable prerequisites.

## Completion condition

This plan is satisfied when the same Fibre application architecture runs locally and on Cloudflare, the repository gate passes, deployment composition is reproducible from exact source, and a genuine cloud Thread can move birth -> durable life -> generated media -> presentation -> Viewer without any local runtime or hidden provider-specific semantic path.
