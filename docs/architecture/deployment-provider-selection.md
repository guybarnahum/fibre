---
id: architecture-deployment-provider-selection
status: accepted
last-reviewed: 2026-08-26
canonical: false
---

# Deployment provider selection

## Purpose

Make the location and infrastructure provider of each Fibre service an explicit deployment decision rather than an implementation detail hidden inside the service.

This document applies [`ADR-0019`](../decisions/ADR-0019-deployment-provider-selection.md), complements [`infrastructure-driver.md`](infrastructure-driver.md), and operates within the provider-neutral production-persistence rule in [`ADR-0017`](../decisions/ADR-0017-provider-neutral-production-persistence.md).

## Dependency direction

```text
deployment manifest
        |
        v
deployment adapter / bootstrap
        |
        +------> provider InfraDriver implementation
        |              |
        |              v
        |        InfraDriver capability bundle
        |              |
        v              v
provider runtime --> Fibre service runtime
                         |
                         +--> other provider abstractions
                              (media/model, credential signer, etc.)
```

The portable service never imports a cloud runtime SDK or chooses an InfraDriver implementation.

## Repository boundaries

```text
services/
  asset-generator/               provider-neutral application/runtime
  thread-presentation/           provider-neutral presentation capability

packages/infra/
  src/infra-driver.mjs           provider-neutral capability contract
  src/cloudflare-*               Cloudflare capability implementations
  ...future AWS/GCP/Azure ports

deployments/
  environments/
    local.json                   Fibre provider-selection manifest
  cloudflare/
    asset-generator/
      image-provider-selection.mjs
      worker.mjs
      wrangler.local.jsonc
    thread-presentation/
      worker.mjs
      presentation-read-api.mjs
      wrangler.local.jsonc
```

A provider implementation in `packages/infra` must not import a Fibre service. A deployment adapter may import both because composition is its job.

## Manifest contract

The first manifest shape is deliberately small:

```json
{
  "deploymentVersion": "fibre-deployment-v0.1",
  "environment": "local",
  "providers": {
    "cloudflare-local": {
      "platform": "cloudflare",
      "infraDriver": "cloudflare-v1",
      "capabilities": ["streams", "objects", "catalog", "realtime", "queues", "workflows"]
    }
  },
  "services": {
    "thread-presentation": {
      "runtime": "cloudflare-local",
      "infra": "cloudflare-local",
      "requires": ["streams", "objects", "catalog", "realtime", "queues", "workflows"]
    },
    "asset-generator": {
      "runtime": "cloudflare-local",
      "infra": "cloudflare-local",
      "requires": ["objects", "queues", "workflows"]
    }
  }
}
```

`runtime` and `infra` are separate references on purpose. Today they commonly identify the same provider alias. A future deployment can select different aliases without changing Asset Generator, Presentation or other service application code.

The manifest validator fails closed when a provider alias is unknown, a requested capability is unsupported, a provider advertises an unknown capability, a capability is duplicated, or the manifest contract is unsupported.

## What the manifest does not own

The manifest does not contain cloud access keys, model credentials, C2PA signing keys, Thread/World semantics, provider-native resource identities, or Fibre publication decisions. Those remain with provider secret/configuration mechanisms and the owning Fibre domains.

Media-provider profile selection is also distinct from `InfraDriver` selection. An `AssetGenerationJob.providerProfile` names a logical media-provider profile; the deployment adapter maps that profile to a concrete OpenAI, BFL, or future provider adapter. The provider API key remains a deployment secret and never becomes job or Fibre-domain data.

## Current implementation phase

`deployments/environments/local.json` records and validates the current local infrastructure-provider selection. Both current Cloudflare executable adapters live under `deployments/cloudflare/`:

```text
asset-generator/
thread-presentation/
```

Wrangler JSONC is still hand-authored provider output in this phase. It must agree with the deployment manifest and is checked by boundary tests, but a general deployment compiler is **deferred**. Later tooling may generate or verify Wrangler, AWS IaC, GCP or Azure configuration from the same Fibre-level provider selection.

## Asset Generator runtime

Portable construction:

```text
createAssetGenerationRuntime({ infra, provider, credentialSigner })
```

Execution/persistence uses `objects` and `queues`; scheduling uses `workflows`. The media provider and credential signer remain separate injected dependencies.

Retry safety is provider-neutral even when provider APIs differ. Fibre now distinguishes three durable execution boundaries:

```text
AssetGenerationJob
  -> optional ProviderOperation checkpoint for an accepted asynchronous provider task
  -> GenerationAttempt + staged raw provider output
  -> credentialed final asset + StoredAssetReceipt
```

A resumable provider may expose `startOperation(...)` and `resumeOperation(...)`. The portable Asset Generator runtime persists the accepted `ProviderOperation` through `InfraDriver.objects` before allowing polling/resume work. A later Workflow retry loads that checkpoint and resumes the same provider task rather than asking the deployment adapter to resubmit it. If an accepted task cannot be durably checkpointed, the portable retry policy blocks replay.

This does not make provider task IDs part of `InfraDriver`, Thread Presentation, or Fibre semantic authority. They remain operational continuation evidence owned by Asset Generator.

For BFL FLUX, the Cloudflare deployment selects the `bfl-flux-2-pro-v1` logical profile and injects the BFL adapter. For OpenAI, it selects `openai-gpt-image-2-medium-v1`. The service runtime does not branch on those names.

## Thread Presentation runtime

Thread Presentation remains provider-neutral under `services/thread-presentation/` and the World Kernel presentation authorities it currently delegates to. The Cloudflare deployment composes that application with `cloudflare-v1`, HTTP/WebSocket transport, the Asset Generator Workflow binding, and completion Queue consumption.

Moving the Cloudflare adapter under `deployments/` changes repository ownership only; it does not change presentation authority, public-asset admission, or Thread semantics.

## Future extension paths

Without changing service contracts, Fibre can later add:

- `aws-v1`, GCP or Azure InfraDriver implementations;
- provider-specific deployment adapters under `deployments/<platform>/`;
- additional media-provider profiles without changing Asset Generator domain contracts;
- manifest-driven config/IaC generation;
- composite InfraDrivers where capabilities come from more than one provider;
- environment overlays for staging/production;
- deployment conformance checks that prove concrete resources satisfy each advertised InfraDriver guarantee.

Do not add empty provider/service directories merely to signal those intentions. Add them when an implementation exists.
