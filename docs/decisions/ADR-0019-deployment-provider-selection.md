---
id: adr-0019
status: accepted
date: 2026-08-25
---

# ADR-0019: Deployment selects infrastructure providers; services do not

## Context

Fibre is Cloudflare-first today, but Cloudflare is not part of Fibre's domain model. `InfraDriver` defines provider-neutral capabilities such as objects, queues, workflows, streams, catalog and realtime delivery. Provider-specific Worker/Lambda entrypoints do not belong inside portable Fibre services, while reusable infrastructure providers must not learn Fibre service topology.

## Decision

Fibre separates three layers:

```text
services/           provider-neutral Fibre capability/application logic
infra/providers/    reusable infrastructure/runtime provider implementations
infra/deployments/  environment/provider selection and executable composition
```

The rules are:

1. **Services do not choose their cloud.** Portable service/application code receives infrastructure and non-infrastructure providers through explicit boundaries.
2. **`infra/providers/` does not know Fibre service topology.** Provider adapters implement reusable Fibre infrastructure guarantees.
3. **`infra/deployments/` is composition.** It may import services, `infra/providers/`, and integrations because joining those layers is its job.
4. **Deployment organization is service-first.** Executable provider hosts live under `infra/deployments/<service>/<provider>/`.
5. **Runtime and infrastructure selection are distinct.** A versioned manifest under `infra/deployments/environments/` names both aliases and each service's required capabilities.
6. **Provider-native IDs and secrets do not enter Fibre service contracts.** They remain deployment/provider configuration.
7. **Media/model providers are integrations, not InfraDriver providers.** OpenAI/BFL/model selection can change independently of runtime/storage/queue provider selection.
8. **No speculative provider scaffolding.** Do not create an AWS/GCP/Azure provider or deployment directory until real implementation exists.
9. **A generalized deployment compiler remains deferred.** Hand-authored provider output is acceptable while the Fibre manifest remains the provider-selection authority.

## Asset Generator application

The portable runtime is constructed as:

```text
createAssetGenerationRuntime({
  infra,
  provider,
  credentialSigner,
})
```

Scheduling uses `infra.workflows`; execution/persistence uses `infra.objects`; completion signalling uses `infra.queues`. Provider retry semantics remain portable, while a thin deployment host translates them into its runtime's retry mechanism.

Asset Generator emits completion facts only. Thread Presentation retains admission/publication authority and is the only layer that may author authoritative `media.ready`.

## Consequences

- Cloudflare capability machinery lives under `infra/providers/cloudflare/` and remains service-unaware.
- Cloudflare Asset Generator composition lives under `infra/deployments/asset-generator/cloudflare/`.
- Cloudflare Thread Presentation composition lives under `infra/deployments/thread-presentation/cloudflare/`.
- Environment manifests live under `infra/deployments/environments/`.
- Provider-neutral Thread Presentation HTTP behavior lives with `services/thread-presentation/`, not inside the Cloudflare deployment host.
- Adding AWS later means implementing a real `infra/providers/aws/` adapter and service deployment host when needed, not editing Fibre application logic or adding empty placeholders now.
