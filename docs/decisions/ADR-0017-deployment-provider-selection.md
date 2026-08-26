---
id: adr-0017
status: accepted
date: 2026-08-25
---

# ADR-0017: Deployment selects infrastructure providers; services do not

## Context

Fibre is Cloudflare-first today, but Cloudflare is not part of Fibre's domain model. AWS is an expected next infrastructure target, and GCP, Azure, local and hybrid deployments must remain credible without rewriting Fibre services.

`InfraDriver` already defines provider-neutral infrastructure capabilities such as objects, queues, workflows, streams, catalog and realtime delivery. The Asset Generator proved those ports, but its Cloudflare Workflow entrypoint, binding composition and Wrangler configuration still lived under `services/asset-generator/`. That made the service tree look more Cloudflare-shaped than the application contract actually is and left provider selection implicit in deployment files.

A second failure mode would be to move service-specific Worker/Lambda entrypoints into `packages/infra`. That would make the infrastructure package know Fibre service topology and reverse the intended dependency direction.

## Decision

Fibre separates three layers:

```text
services/       provider-neutral Fibre capability/application logic
packages/infra/ InfraDriver contracts plus provider implementations
deployments/    environment/provider selection and executable composition
```

The rules are:

1. **Services do not choose their cloud.** A portable service receives an `InfraDriver` and any non-infrastructure provider dependencies through dependency injection.
2. **`packages/infra` does not know Fibre service topology.** It implements reusable provider mappings for Fibre infrastructure guarantees, not `asset-generator`, `presentation`, or other service entrypoints.
3. **Deployment configuration selects providers.** A versioned manifest under `deployments/environments/` names the runtime provider alias and InfraDriver provider alias for each deployed service and declares the service's required InfraDriver capabilities.
4. **Runtime and infrastructure selection are distinct.** They may initially point to the same provider, but Fibre preserves the ability to execute a service on one platform while satisfying its InfraDriver capabilities from another or from a composite driver.
5. **Provider-specific executable entrypoints and deployment configuration live under `deployments/<platform>/<service>/`.** Examples include Cloudflare `worker.mjs`/Wrangler configuration and future AWS runtime/IaC adapters.
6. **Provider-native IDs and secrets do not enter Fibre service contracts.** Deployment manifests contain logical provider selection and capability declarations, not credentials. Secrets remain in the selected platform's secret mechanism.
7. **Media/model providers remain separate from InfraDriver.** OpenAI or another generation/model provider can change independently of where Asset Generator executes or stores/queues work.
8. **Provider configuration may be generated later, but the Fibre manifest is the provider-selection authority.** The first implementation validates the manifest and keeps hand-authored provider output explicit; a later deployment compiler may generate or verify Wrangler/AWS/GCP/Azure configuration without changing service APIs.

## Asset Generator application

The portable Asset Generator runtime is created as:

```text
createAssetGenerationRuntime({
  infra,
  provider,
  credentialSigner,
})
```

Its infrastructure profile is expressed in Fibre guarantees. Scheduling additionally uses `infra.workflows`; execution/persistence uses `infra.objects`; completion signalling uses `infra.queues`.

The rule that a generation execution attempt is not implicitly retried before explicit attempt/staging identities exist is also provider-neutral. A deployment adapter translates that Fibre operational result into its provider's terminal/non-retryable mechanism.

## Consequences

- Adding AWS should mean implementing/selecting an AWS InfraDriver and AWS deployment adapter, not editing Asset Generator application logic.
- Cloudflare Worker classes, bindings and Wrangler configuration no longer belong under `services/asset-generator/src/`.
- `packages/infra/cloudflare*` remains reusable Cloudflare capability machinery; it must not import Asset Generator or Presentation.
- `deployments/environments/local.json` is the first checked provider-selection manifest and is validated against advertised InfraDriver capabilities.
- Runtime-provider and InfraDriver-provider aliases can diverge later without changing service contracts.
- Composite/hybrid capability selection remains an extension path, not a requirement of the first manifest schema.
- The existing `services/presentation-cloudflare/` predates this boundary. It remains a current adapter until a dedicated migration moves its executable/provider composition under `deployments/`; it is not precedent for new service-local cloud entrypoints.
