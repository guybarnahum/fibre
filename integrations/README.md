# Third-party integrations

Concrete adapters for external services live here. They are **not** `InfraDriver` implementations and must not select storage, queues, workflows, cloud infrastructure, or deployment topology.

Current layout:

```text
integrations/
  models/
    openai.mjs
    google.mjs
    retry-policy.mjs
  media/
    openai-image-provider.mjs
    bfl-flux-image-provider.mjs
```

`services/` owns Fibre semantics and the inward-facing contracts these adapters implement. `deployments/` owns provider/profile selection, credentials and executable composition. `infra/` remains physical infrastructure only.

The small contract bridge modules at this directory root intentionally point inward to service-owned contracts so the concrete adapters can implement those contracts without copying domain semantics. Integrations may depend on those narrow contracts; services, integrations and deployments must not make third-party AI/media providers into `InfraDriver` capabilities.
