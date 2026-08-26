---
id: architecture-deployment-provider-selection
status: accepted
last-reviewed: 2026-08-25
canonical: false
---

# Deployment provider selection

## Purpose

Make the location and infrastructure provider of each Fibre service an explicit deployment decision rather than an implementation detail hidden inside the service.

This document applies ADR-0017 and complements [`infrastructure-driver.md`](infrastructure-driver.md).

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
  asset-generator/
    src/                         provider-neutral application/runtime

packages/infra/
  src/infra-driver.mjs           provider-neutral capability contract
  src/cloudflare-*               Cloudflare capability implementations
  ...future AWS/GCP/Azure ports

deployments/
  environments/
    local.json                   Fibre provider-selection manifest
  cloudflare/
    asset-generator/
      worker.mjs                 Cloudflare executable composition
      wrangler.local.jsonc       Cloudflare-local binding/resource output
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
      "capabilities": ["objects", "queues", "workflows"]
    }
  },
  "services": {
    "asset-generator": {
      "runtime": "cloudflare-local",
      "infra": "cloudflare-local",
      "requires": ["objects", "queues", "workflows"]
    }
  }
}
```

`runtime` and `infra` are separate references on purpose. Today they commonly identify the same provider alias. A future deployment can select different aliases without changing Asset Generator, Presentation or other service application code.

The manifest validator fails closed when:

- a runtime/infra alias is unknown;
- a service requests an unsupported InfraDriver capability;
- a provider advertises an unknown InfraDriver capability;
- duplicate capability declarations appear;
- the manifest version or exact schema is unsupported.

## What the manifest does not own

The manifest does not contain:

- cloud access keys;
- OpenAI/model credentials;
- C2PA signing keys;
- Thread IDs, World IDs or semantic authority;
- provider-native resource identities used as Fibre object/stream identities;
- Fibre authorization or publication decisions.

Those boundaries remain with secrets/configuration, provider adapters and owning Fibre domains respectively.

## Current implementation phase

`deployments/environments/local.json` records and validates the current local provider selection. Cloudflare-specific Asset Generator execution composition now lives under `deployments/cloudflare/asset-generator/`.

Wrangler JSONC is still hand-authored provider output in this phase. It must agree with the deployment manifest and is checked by boundary tests, but a general deployment compiler is **deferred**. Later tooling may generate/verify Wrangler, AWS IaC, GCP or Azure configuration from the same Fibre-level provider selection.

The existing `services/presentation-cloudflare/` adapter is a pre-ADR repository shape. Moving it under `deployments/cloudflare/` is **deferred** to a dedicated refactor so the accepted provider-selection boundary is not mixed with Presentation serving changes.

## Asset Generator runtime

Portable construction:

```text
createAssetGenerationRuntime({ infra, provider, credentialSigner })
```

Required execution infrastructure:

```text
objects     immutable GenerationRecord / asset / receipt storage
queues      durable completion notification
```

Scheduling is a separate application seam using:

```text
workflows   deterministic semantic job dispatch/status
```

The media provider and credential signer are injected dependencies outside InfraDriver because they are external behavior/provider integrations rather than generic infrastructure guarantees.

## Provider-neutral retry rule

Until generation has explicit attempt/staging identities, executing a semantic generation job is intentionally non-retryable after failure: a nondeterministic provider retry could produce different bytes for the same final immutable object identity.

The generic runtime reports `AssetGenerationAttemptFailed` with `retryable=false`. A Cloudflare deployment maps it to `NonRetryableError`; another platform must map the same Fibre rule to its own execution semantics. Cloud choice may not silently weaken this invariant.

Completion delivery is different: it is a deterministic pointer to already-immutable output and can be delivered at least once. Calling domains remain responsible for idempotent verification/admission.

## Future extension paths

Without changing service contracts, Fibre can later add:

- `aws-v1`, GCP or Azure InfraDriver implementations;
- provider-specific deployment adapters under `deployments/<platform>/`;
- manifest-driven config/IaC generation;
- composite InfraDrivers where capabilities come from more than one provider;
- environment overlays for staging/production;
- deployment conformance checks that prove an adapter's concrete resources satisfy each advertised InfraDriver guarantee.

Do not add empty provider/service directories merely to signal those intentions. Add them when an implementation exists.
