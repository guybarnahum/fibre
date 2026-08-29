# Fibre deployments

`infra/deployments/` is the repository composition layer. It binds provider-neutral Fibre services and integrations to concrete infrastructure/runtime providers.

The dependency direction is intentional:

- `services/` owns Fibre capability and application behavior and does not choose a cloud.
- `infra/providers/` owns reusable provider adapters and must not know service topology.
- `infra/deployments/` may compose services, `infra/providers/`, and `integrations/` for an executable environment.
- media/model vendors remain integrations, not InfraDriver providers.

Executable service deployments are organized service-first, then provider:

```text
infra/deployments/
  environments/
  asset-generator/
    cloudflare/
  thread-presentation/
    cloudflare/
```

Do not add empty provider directories or a generic deployment framework. Add only composition required by a real Fibre service or environment.
